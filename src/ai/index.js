import { streamChatCompletion as streamGemini } from './models/gemini.js';
import { streamChatCompletion as streamOpenAICompatible } from './models/openai-compatible.js';
import { streamChatCompletion as streamWebLlm, initializeEngine as initializeWebLlm } from './models/web-llm.js';
import { TaskRunner } from '../agent/runner.js';
import { countTokens } from 'gpt-tokenizer';

class AiService {
  constructor() {
    this.config = {
      activeProvider: 'gemini',
      geminiApiKey: '',
      geminiModelName: 'gemini-2.5-flash',
      webllmModelId: 'Llama-3-8B-Instruct-q4f16_1-MLC',
      providers: [],
    };
    this.activeAgentControllers = new Map();
    this.loadConfig();
  }

  loadConfig() {
    this.config.activeProvider = localStorage.getItem('thoughtform_ai_provider') || 'gemini';
    this.config.webllmModelId = localStorage.getItem('thoughtform_webllm_model_id') || 'Llama-3-8B-Instruct-q4f16_1-MLC';
    this.config.geminiApiKey = localStorage.getItem('thoughtform_gemini_api_key') || '';
    this.config.geminiModelName = localStorage.getItem('thoughtform_gemini_model_name') || 'gemini-2.5-flash';
    this.config.providers = JSON.parse(localStorage.getItem('thoughtform_ai_providers_list') || '[]');
  }
  
  async initializeWebLlmEngine(modelId, progressCallback) {
    try {
      await initializeWebLlm(modelId, progressCallback);
    } catch (err) {
      console.error("[AI Service] Failed to initialize WebLLM engine:", err);
      progressCallback({ progress: -1, text: `Error: ${err.message}. Check console for details.` });
    }
  }

  async getCompletion(prompt, onTokenCount, signal) {
    let streamPromise;
    let providerId = this.config.activeProvider;

    if (this.config.override_activeProvider) {
        providerId = this.config.override_activeProvider;
    }

    if (providerId === 'webllm') {
      const statusEl = document.getElementById('webllm-status');
      const progressCallback = (report) => {
        if (statusEl) {
          const percentage = (report.progress * 100).toFixed(1);
          statusEl.textContent = `${report.text} (${percentage}%)`;
        }
      };
      streamPromise = streamWebLlm(this.config.webllmModelId, prompt, signal, progressCallback);
    } else if (providerId === 'gemini') {
      if (!this.config.geminiApiKey) {
        throw new Error('Active provider is Gemini, but the API key is not set. Add it in DevTools > AI.');
      }
      streamPromise = streamGemini(this.config.geminiApiKey, this.config.geminiModelName, prompt, signal);
    } else {
      const providerConfig = this.config.providers.find(p => p.id === providerId);
      if (!providerConfig) {
        throw new Error(`AI provider "${providerId}" not found. Please configure it in DevTools > AI.`);
      }

      const modelToUse = this.config.override_customModelName || providerConfig.model;
      const endpointToUse = this.config.override_customEndpointUrl || providerConfig.endpoint || 'http://localhost:11434/v1';
      const apiKeyToUse = this.config.override_customApiKey || providerConfig.apiKey;

      if (!modelToUse) {
         throw new Error(`Provider "${providerId}" has no Model Name configured. This is a required field.`);
      }
      
      streamPromise = streamOpenAICompatible(endpointToUse, apiKeyToUse, modelToUse, prompt, signal);
    }

    const originalStream = await streamPromise;

    if (!onTokenCount) return originalStream;

    const inputTokens = countTokens(prompt);
    let fullResponse = '';
    const countingStream = new TransformStream({
      transform(chunk, controller) {
        fullResponse += chunk;
        controller.enqueue(chunk);
      },
      flush(controller) {
        const outputTokens = countTokens(fullResponse);
        onTokenCount({ input: inputTokens, output: outputTokens });
      }
    });
    return originalStream.pipeThrough(countingStream);
  }

  async getCompletionAsString(prompt, onTokenCount, signal) {
      const stream = await this.getCompletion(prompt, onTokenCount, signal);
      const reader = stream.getReader();
      let fullResponse = '';
      while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullResponse += value;
      }
      return fullResponse;
  }

  async handleAiChatRequest(view) {
    let thinkingMessagePosition = -1;
    const thinkingText = '🤖 Thinking...';
    let editorPaneId = null;
    let contentStartPos = -1;
    let contentEndPos = -1;

    try {
      const editor = window.thoughtform.workspace.getActiveEditor();
      if (!editor || !editor.gitClient || !editor.paneId) {
        throw new Error("Cannot find active editor, gitClient, or paneId for agent.");
      }
      editorPaneId = editor.paneId;

      if (this.activeAgentControllers.has(editorPaneId)) return;
      
      const controller = new AbortController();
      this.activeAgentControllers.set(editorPaneId, controller);

      const pos = view.state.selection.main.head;
      const currentLine = view.state.doc.lineAt(pos);
      
      let startLineNum = currentLine.number;
      while (startLineNum > 1 && view.state.doc.line(startLineNum - 1).text.trim().startsWith('>$')) {
        startLineNum--;
      }
      let endLineNum = currentLine.number;
      while (endLineNum < view.state.doc.lines && view.state.doc.line(endLineNum + 1).text.trim().startsWith('>$')) {
        endLineNum++;
      }
      const startPos = view.state.doc.line(startLineNum).from;
      const endPos = view.state.doc.line(endLineNum).to;
      let userPrompt = view.state.sliceDoc(startPos, endPos);
      userPrompt = userPrompt.split('\n').map(line => line.trim().replace(/^>\$\s*/, '')).join('\n');
      
      const insertPos = endPos;
      const placeholderTransaction = { changes: { from: insertPos, insert: `\n${thinkingText}` } };
      view.dispatch(placeholderTransaction);
      thinkingMessagePosition = insertPos + '\n'.length;

      const rawContext = view.state.doc.toString().replace(/<!-- Total Tokens:.*?-->/gs, '').trim();

      let serviceForRunner = this;
      if (editor.aiOverrides && Object.keys(editor.aiOverrides).length > 0) {
        console.log('[AI Service] Applying session-specific AI overrides:', editor.aiOverrides);
        
        const overrideConfig = {
            ...this.config,
            override_activeProvider: editor.aiOverrides.activeProvider,
            override_customModelName: editor.aiOverrides.customModelName,
            override_customEndpointUrl: editor.aiOverrides.customEndpointUrl,
            override_customApiKey: editor.aiOverrides.customApiKey,
        };
        
        serviceForRunner = { ...this, config: overrideConfig };
      }

      const runner = new TaskRunner({
          gitClient: editor.gitClient,
          aiService: serviceForRunner,
          initialContext: rawContext
      });
      const stream = runner.run(userPrompt, controller.signal);
      
      const reader = stream.getReader();
      const startTag = '\n<response>\n';
      view.dispatch({ changes: { from: thinkingMessagePosition, to: thinkingMessagePosition + thinkingText.length, insert: startTag } });
      
      let finalAnswerStarted = false;
      contentStartPos = thinkingMessagePosition + startTag.length;
      contentEndPos = contentStartPos;

      const streamEventRegex = /^\[(STATUS|THOUGHT|ACTION|OBSERVATION)\]\s(.*)/s;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkText = value;
        const match = chunkText.match(streamEventRegex);
        if (match) {
            if (finalAnswerStarted) continue; 
            const type = match[1];
            const content = match[2].trim();
            const titles = { STATUS: '> Status:', THOUGHT: '## Thought', ACTION: '## Action', OBSERVATION: '## Observation' };
            const newLogChunk = `${titles[type]}\n${content}\n\n`;
            view.dispatch({ changes: { from: contentEndPos, insert: newLogChunk } });
            contentEndPos += newLogChunk.length;
        } else {
            if (!finalAnswerStarted) {
                finalAnswerStarted = true;
                view.dispatch({ changes: { from: contentStartPos, to: contentEndPos, insert: chunkText } });
                contentEndPos = contentStartPos + chunkText.length;
            } else {
                view.dispatch({ changes: { from: contentEndPos, insert: chunkText } });
                contentEndPos += chunkText.length;
            }
        }
      }
      const finalInsert = `\n</response>\n\n>$ `;
      view.dispatch({ changes: { from: contentEndPos, insert: finalInsert }, selection: { anchor: contentEndPos + finalInsert.length } });
    } catch (error) {
      if (error.name === 'AbortError') {
        if (contentStartPos !== -1) {
          const startReplacePos = contentStartPos - '\n<response>\n'.length;
          const cancelledText = '🛑 Agent cancelled by user.';
          view.dispatch({ changes: { from: startReplacePos, to: contentEndPos, insert: `\n<response>\n${cancelledText}\n</response>`} });
        }
      } else {
        console.error("AI Chat Error:", error);
        if (thinkingMessagePosition !== -1) {
          view.dispatch({ changes: { from: thinkingMessagePosition, to: thinkingMessagePosition + thinkingText.length, insert: `🚨 Error: ${error.message}` } });
        }
      }
    } finally {
      if (editorPaneId) this.activeAgentControllers.delete(editorPaneId);
    }
  }
}

export function initializeAiService() {
  return new AiService();
}