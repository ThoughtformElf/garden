// src/ai/index.js
import { streamChatCompletion as streamGemini } from './models/gemini.js';

class AiService {
  constructor() {
    this.config = {
      geminiApiKey: '',
      geminiModelName: 'gemini-2.5-flash'
    };
    this.loadConfig();
  }

  loadConfig() {
    this.config.geminiApiKey = localStorage.getItem('thoughtform_gemini_api_key') || '';
    const savedModel = localStorage.getItem('thoughtform_gemini_model_name');
    this.config.geminiModelName = savedModel || 'gemini-2.5-flash';
  }

  saveConfig(apiKey, modelName) {
    localStorage.setItem('thoughtform_gemini_api_key', apiKey || '');
    localStorage.setItem('thoughtform_gemini_model_name', modelName || '');
    this.loadConfig(); // Reload config after saving
  }

  /**
   * Gets a streaming completion from the configured AI provider.
   * @param {string} prompt - The full prompt to send to the AI.
   * @returns {Promise<ReadableStream>} A stream of text chunks.
   */
  async getCompletion(prompt) {
    this.loadConfig(); // Always load the latest config before a request

    if (!this.config.geminiApiKey) {
      throw new Error('Gemini API key is not set. Please configure it in the AI dev tools panel.');
    }

    // For now, it only calls Gemini. This can be expanded later.
    return streamGemini(this.config.geminiApiKey, this.config.geminiModelName, prompt);
  }

  /**
   * Handles the entire AI chat interaction lifecycle within the editor.
   * @param {EditorView} view - The CodeMirror EditorView instance.
   */
  async handleAiChatRequest(view) {
    let thinkingMessagePosition = -1;
    // --- FIX: The placeholder is now plain text ---
    const thinkingText = '🤖 Thinking...';

    try {
      const pos = view.state.selection.main.head;
      const currentLine = view.state.doc.lineAt(pos);

      // Gather the full blockquote context as the user's prompt.
      let startLineNum = currentLine.number;
      while (startLineNum > 1 && view.state.doc.line(startLineNum - 1).text.trim().startsWith('>')) {
        startLineNum--;
      }
      let endLineNum = currentLine.number;
      while (endLineNum < view.state.doc.lines && view.state.doc.line(endLineNum + 1).text.trim().startsWith('>')) {
        endLineNum++;
      }
      const startPos = view.state.doc.line(startLineNum).from;
      const endPos = view.state.doc.line(endLineNum).to;
      let userPrompt = view.state.sliceDoc(startPos, endPos);
      userPrompt = userPrompt.split('\n').map(line => line.trim().substring(1).trim()).join('\n');

      const fullContext = view.state.doc.toString();
      const finalPrompt = `CONTEXT:\n---\n${fullContext}\n---\n\nBased on the context above, respond to the following prompt:\n\n${userPrompt}`;

      // Insert a placeholder message.
      const insertPos = endPos;
      const placeholderTransaction = { changes: { from: insertPos, insert: `\n\n${thinkingText}` } };
      view.dispatch(placeholderTransaction);
      thinkingMessagePosition = insertPos + '\n\n'.length;

      // Call the AI service and process the stream.
      const stream = await this.getCompletion(finalPrompt);
      const reader = stream.getReader();
      let isFirstChunk = true;
      let currentResponsePos = thinkingMessagePosition;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // --- FIX: The chunkText is now the raw value from the AI ---
        const chunkText = value;

        if (isFirstChunk) {
          // Replace the placeholder with the first chunk. No ">" prefix.
          view.dispatch({ changes: { from: currentResponsePos, to: currentResponsePos + thinkingText.length, insert: chunkText } });
          currentResponsePos += chunkText.length;
          isFirstChunk = false;
        } else {
          // Insert subsequent chunks. No ">" prefix.
          view.dispatch({ changes: { from: currentResponsePos, insert: chunkText } });
          currentResponsePos += chunkText.length;
        }
      }

      // --- FIX: Add two newlines for a clean separation, not a new blockquote ---
      const finalUserPrompt = '\n\n';
      view.dispatch({
        changes: { from: currentResponsePos, insert: finalUserPrompt },
        selection: { anchor: currentResponsePos + finalUserPrompt.length }
      });

    } catch (error) {
      console.error("AI Chat Error:", error);
      if (thinkingMessagePosition !== -1) {
        // --- FIX: The error message is also plain text ---
        view.dispatch({ changes: { from: thinkingMessagePosition, to: thinkingMessagePosition + thinkingText.length, insert: `🚨 Error: ${error.message}` } });
      }
    }
  }
}

export function initializeAiService() {
  return new AiService();
}