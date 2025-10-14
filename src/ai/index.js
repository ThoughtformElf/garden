import { streamChatCompletion as streamGemini } from './models/gemini.js';
import { Agent } from '../agent/index.js'; // Import the new Agent class

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

    return streamGemini(this.config.geminiApiKey, this.config.geminiModelName, prompt);
  }

  /**
   * Handles the entire AI chat interaction lifecycle within the editor.
   * This now acts as a router, deciding whether to use the simple chat or the agent.
   * @param {EditorView} view - The CodeMirror EditorView instance.
   */
  async handleAiChatRequest(view) {
    let thinkingMessagePosition = -1;
    const thinkingText = '🤖 Thinking...';

    try {
      const pos = view.state.selection.main.head;
      const currentLine = view.state.doc.lineAt(pos);
      const fullContext = view.state.doc.toString();
      
      // Gather the full blockquote context as the user's prompt.
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
      // Adjust substring to remove the '>$' prefix (2 characters + potential space)
      userPrompt = userPrompt.split('\n').map(line => line.trim().replace(/^>\$\s*/, '')).join('\n');
      
      // --- AGENT ROUTING LOGIC ---
      const hasWikilinks = /\[\[.+?\]\]/.test(fullContext);
      let stream;

      // Insert a placeholder message.
      const insertPos = endPos;
      const placeholderTransaction = { changes: { from: insertPos, insert: `\n${thinkingText}` } };
      view.dispatch(placeholderTransaction);
      thinkingMessagePosition = insertPos + '\n'.length;

      if (hasWikilinks) {
        // Use the Agent
        const editor = window.thoughtform.workspace.getActiveEditor(); 
        if (!editor || !editor.gitClient) {
          throw new Error("Cannot find active editor or gitClient instance for agent.");
        }
        
        const agent = new Agent({
          gitClient: editor.gitClient,
          aiService: this,
          startingFilePath: editor.filePath
        });

        stream = agent.run(userPrompt);

      } else {
        // Use simple chat
        const finalPrompt = `CONTEXT:\n---\n${fullContext}\n---\n\nBased on the context above, respond to the following prompt:\n\n${userPrompt}`;
        stream = await this.getCompletion(finalPrompt);
      }
      
      // --- STREAM PROCESSING ---
      const reader = stream.getReader();
      
      // Replace the "Thinking..." message with the opening tag.
      const startTag = '\n<response>\n';
      view.dispatch({ changes: { from: thinkingMessagePosition, to: thinkingMessagePosition + thinkingText.length, insert: startTag } });
      
      let finalAnswerStarted = false;
      let statusLogHTML = '';
      let responseBodyStart = thinkingMessagePosition + startTag.length;
      let responseBodyEnd = responseBodyStart;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunkText = value;

        if (chunkText.startsWith('[STATUS]')) {
            if (finalAnswerStarted) continue; // Ignore status updates after the final answer begins.

            // Append the new status message to our growing log.
            statusLogHTML += `  <div class="agent-status">${chunkText.substring(8).trim()}</div>\n`;
            
            // Replace the entire previous content with the updated, full log.
            view.dispatch({
                changes: { from: responseBodyStart, to: responseBodyEnd, insert: statusLogHTML }
            });
            // Update the end pointer to the new end of the log.
            responseBodyEnd = responseBodyStart + statusLogHTML.length;

        } else {
            if (!finalAnswerStarted) {
                finalAnswerStarted = true;
                // This is the first token of the real answer. Overwrite the entire status log.
                view.dispatch({
                    changes: { from: responseBodyStart, to: responseBodyEnd, insert: chunkText }
                });
                responseBodyEnd = responseBodyStart + chunkText.length;
            } else {
                // This is a subsequent token. Just append it.
                view.dispatch({
                    changes: { from: responseBodyEnd, insert: chunkText }
                });
                responseBodyEnd += chunkText.length;
            }
        }
      }

      // After the stream is complete, append the closing tag and the next user prompt.
      const finalInsert = `\n</response>\n\n>$ `;
      view.dispatch({
        changes: { from: responseBodyEnd, insert: finalInsert },
        selection: { anchor: responseBodyEnd + finalInsert.length }
      });

    } catch (error) {
      console.error("AI Chat Error:", error);
      if (thinkingMessagePosition !== -1) {
        view.dispatch({ changes: { from: thinkingMessagePosition, to: thinkingMessagePosition + thinkingText.length, insert: `🚨 Error: ${error.message}` } });
      }
    }
  }
}

export function initializeAiService() {
  return new AiService();
}