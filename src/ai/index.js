import { streamChatCompletion as streamGemini } from './models/gemini.js';
import { streamChatCompletion as streamOpenAICompatible } from './models/openai-compatible.js';
import { TaskRunner } from '../agent/runner.js';
import { countTokens } from 'gpt-tokenizer';

class AiService {
  constructor() {
    this.config = {
      // Default structure
      activeProvider: 'gemini',
      geminiApiKey: '',
      geminiModelName: 'gemini-2.5-flash',
      customEndpointUrl: '',
      customModelName: '',
      customApiKey: '',
    };
    this.activeAgentControllers = new Map(); // Track running agents per pane
    this.loadConfig();
  }

  loadConfig() {
    this.config.activeProvider = localStorage.getItem('thoughtform_ai_provider') || 'gemini';
    this.config.geminiApiKey = localStorage.getItem('thoughtform_gemini_api_key') || '';
    this.config.geminiModelName = localStorage.getItem('thoughtform_gemini_model_name') || 'gemini-2.5-flash';
    this.config.customEndpointUrl = localStorage.getItem('thoughtform_custom_endpoint_url') || '';
    this.config.customModelName = localStorage.getItem('thoughtform_custom_model_name') || '';
    this.config.customApiKey = localStorage.getItem('thoughtform_custom_api_key') || '';
  }

  // This method is no longer needed as the devtools panel handles saving directly.
  saveConfig(newConfig) {
    this.loadConfig();
  }
  
  async getCompletion(prompt, onTokenCount, signal) {
    this.loadConfig(); // Ensure config is fresh for every call

    let streamPromise;
    const provider = this.config.activeProvider;

    if (provider === 'gemini') {
      if (!this.config.geminiApiKey) {
        throw new Error('Active provider is Gemini, but the API key is not set. Get a key from https://aistudio.google.com/ and add it in the DevTools > AI panel.');
      }
      streamPromise = streamGemini(this.config.geminiApiKey, this.config.geminiModelName, prompt, signal);
    } else if (provider === 'custom') {
      // --- THIS IS THE FIX (Part 1) ---
      // Use the configured endpoint or fall back to the Ollama default.
      const endpointToUse = this.config.customEndpointUrl || 'http://localhost:11434/v1';

      // The model name is required and cannot be defaulted. Throw a specific error.
      if (!this.config.customModelName) {
         throw new Error('Active provider is Custom, but Model Name is not set. You must specify a model (e.g., "llama3") in the DevTools > AI panel.');
      }
      
      streamPromise = streamOpenAICompatible(
        endpointToUse,
        this.config.customApiKey,
        this.config.customModelName,
        prompt,
        signal
      );
      // --- END OF FIX (Part 1) ---
    } else {
        throw new Error(`Unknown AI provider selected: "${provider}"`);
    }

    const originalStream = await streamPromise;

    if (!onTokenCount) {
        return originalStream;
    }

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

      if (this.activeAgentControllers.has(editorPaneId)) {
        console.warn(`Agent already running in pane ${editorPaneId}. Ignoring request.`);
        return;
      }
      
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

      const rawContext = view.state.doc.toString();
      const initialContext = rawContext.replace(/<!-- Total Tokens:.*?-->/gs, '').trim();

      const runner = new TaskRunner({
          gitClient: editor.gitClient,
          aiService: this,
          initialContext: initialContext
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

            const titles = {
                STATUS: '> Status:',
                THOUGHT: '## Thought',
                ACTION: '## Action',
                OBSERVATION: '## Observation'
            };
            
            const newLogChunk = `${titles[type]}\n${content}\n\n`;

            view.dispatch({
                changes: { from: contentEndPos, insert: newLogChunk }
            });
            contentEndPos += newLogChunk.length;
        } else {
            if (!finalAnswerStarted) {
                finalAnswerStarted = true;
                view.dispatch({
                    changes: { 
                        from: contentStartPos, 
                        to: contentEndPos, 
                        insert: chunkText 
                    }
                });
                contentEndPos = contentStartPos + chunkText.length;
            } else {
                view.dispatch({
                    changes: { from: contentEndPos, insert: chunkText }
                });
                contentEndPos += chunkText.length;
            }
        }
      }

      const finalInsert = `\n</response>\n\n>$ `;
      view.dispatch({
        changes: { from: contentEndPos, insert: finalInsert },
        selection: { anchor: contentEndPos + finalInsert.length }
      });

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('AI chat request was intentionally cancelled by the user.');
        if (contentStartPos !== -1) {
          const startReplacePos = contentStartPos - '\n<response>\n'.length;
          const cancelledText = '🛑 Agent cancelled by user.';
          view.dispatch({ 
            changes: { 
              from: startReplacePos, 
              to: contentEndPos, 
              insert: `\n<response>\n${cancelledText}\n</response>`
            } 
          });
        }
      } else {
        console.error("AI Chat Error:", error);
        if (thinkingMessagePosition !== -1) {
          view.dispatch({ changes: { from: thinkingMessagePosition, to: thinkingMessagePosition + thinkingText.length, insert: `🚨 Error: ${error.message}` } });
        }
      }
    } finally {
      if (editorPaneId) {
        this.activeAgentControllers.delete(editorPaneId);
      }
    }
  }
}

export function initializeAiService() {
  return new AiService();
}