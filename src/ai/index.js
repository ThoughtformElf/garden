import { streamChatCompletion as streamGemini } from './models/gemini.js';
import { TaskRunner } from '../agent/runner.js'; // Import the new TaskRunner

class AiService {
  constructor() {
    this.config = {
      geminiApiKey: '',
      geminiModelName: 'gemini-1.5-flash'
    };
    this.loadConfig();
  }

  loadConfig() {
    this.config.geminiApiKey = localStorage.getItem('thoughtform_gemini_api_key') || '';
    const savedModel = localStorage.getItem('thoughtform_gemini_model_name');
    this.config.geminiModelName = savedModel || 'gemini-1.5-flash';
  }

  saveConfig(apiKey, modelName) {
    localStorage.setItem('thoughtform_gemini_api_key', apiKey || '');
    localStorage.setItem('thoughtform_gemini_model_name', modelName || '');
    this.loadConfig();
  }

  async getCompletion(prompt) {
    this.loadConfig();
    if (!this.config.geminiApiKey) {
      throw new Error('Gemini API key is not set. Please configure it in the AI dev tools panel.');
    }
    return streamGemini(this.config.geminiApiKey, this.config.geminiModelName, prompt);
  }

  async getCompletionAsString(prompt) {
      const stream = await this.getCompletion(prompt);
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

    try {
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

      const editor = window.thoughtform.workspace.getActiveEditor();
      if (!editor || !editor.gitClient) {
        throw new Error("Cannot find active editor or gitClient instance for agent.");
      }
      
      const initialContext = view.state.doc.toString();
      const runner = new TaskRunner({
          gitClient: editor.gitClient,
          aiService: this,
          initialContext: initialContext
      });
      const stream = runner.run(userPrompt);
      
      const reader = stream.getReader();
      const startTag = '\n<response>\n';
      view.dispatch({ changes: { from: thinkingMessagePosition, to: thinkingMessagePosition + thinkingText.length, insert: startTag } });
      
      let finalAnswerStarted = false;
      let contentStartPos = thinkingMessagePosition + startTag.length;
      let contentEndPos = contentStartPos;

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
                // Replace the entire log block with the start of the final answer
                view.dispatch({
                    changes: { 
                        from: contentStartPos, 
                        to: contentEndPos, 
                        insert: chunkText 
                    }
                });
                contentEndPos = contentStartPos + chunkText.length;
            } else {
                // Continue streaming the final answer by inserting at the end
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