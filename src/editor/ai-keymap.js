// src/editor/ai-keymap.js
import { keymap } from '@codemirror/view';

/**
 * A CodeMirror keymap extension for interacting with an AI assistant.
 * When inside a blockquote, pressing Ctrl+Enter will send the content
 * of the blockquote as a prompt and stream the response back.
 */
export const aiChatKeymap = keymap.of([
  {
    key: 'Mod-Enter', // Ctrl+Enter on Win/Linux, Cmd+Enter on Mac
    run: (view) => {
      const pos = view.state.selection.main.head;
      const currentLine = view.state.doc.lineAt(pos);

      // 1. Check if the user is in a blockquote. If not, do nothing.
      if (!currentLine.text.trim().startsWith('>')) {
        return false;
      }

      // 2. We've confirmed we should handle this event.
      // Use a self-invoking async function to manage the AI call without blocking the UI.
      (async () => {
        let thinkingMessagePosition = -1;
        const thinkingText = '> 🤖 Thinking...';

        try {
          // 3. Gather the full blockquote context as the user's prompt.
          // Go up from the current line until a non-blockquote line is found.
          let startLineNum = currentLine.number;
          while (startLineNum > 1 && view.state.doc.line(startLineNum - 1).text.trim().startsWith('>')) {
            startLineNum--;
          }

          // Go down from the current line to find the end of the block.
          let endLineNum = currentLine.number;
          while (endLineNum < view.state.doc.lines && view.state.doc.line(endLineNum + 1).text.trim().startsWith('>')) {
            endLineNum++;
          }

          const startPos = view.state.doc.line(startLineNum).from;
          const endPos = view.state.doc.line(endLineNum).to;
          let userPrompt = view.state.sliceDoc(startPos, endPos);

          // Clean the prompt by removing markdown '>' characters.
          userPrompt = userPrompt.split('\n').map(line => line.trim().substring(1).trim()).join('\n');

          // The entire document is sent as primary context to the AI.
          const fullContext = view.state.doc.toString();
          const finalPrompt = `CONTEXT:\n---\n${fullContext}\n---\n\nBased on the context above, respond to the following prompt:\n\n${userPrompt}`;

          // 4. Insert a placeholder message to show the AI is working.
          const insertPos = endPos;
          const placeholderTransaction = { changes: { from: insertPos, insert: `\n\n${thinkingText}` } };
          view.dispatch(placeholderTransaction);
          thinkingMessagePosition = insertPos + '\n\n'.length;

          // 5. Call the AI service and get a stream.
          const stream = await window.thoughtform.ai.getCompletion(finalPrompt);
          const reader = stream.getReader();
          let isFirstChunk = true;
          let currentResponsePos = thinkingMessagePosition;

          // 6. Process the stream, inserting text as it arrives.
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // When AI sends newlines, ensure they are also formatted as blockquotes.
            const chunkText = value.replace(/\n/g, '\n> ');

            if (isFirstChunk) {
              // The first chunk replaces the "Thinking..." placeholder.
              view.dispatch({
                changes: { from: currentResponsePos, to: currentResponsePos + thinkingText.length, insert: `> ${chunkText}` }
              });
              currentResponsePos += `> ${chunkText}`.length;
              isFirstChunk = false;
            } else {
              // Subsequent chunks are inserted at the end of the previous one.
              view.dispatch({
                changes: { from: currentResponsePos, insert: chunkText }
              });
              currentResponsePos += chunkText.length;
            }
          }

          // 7. Add a new, empty blockquote for the user to continue the conversation.
          const finalUserPrompt = '\n\n> ';
          view.dispatch({
            changes: { from: currentResponsePos, insert: finalUserPrompt },
            selection: { anchor: currentResponsePos + finalUserPrompt.length } // Move cursor to new line
          });

        } catch (error) {
          console.error("AI Chat Error:", error);
          // If an error occurs, replace the placeholder with an error message.
          if (thinkingMessagePosition !== -1) {
            view.dispatch({
              changes: {
                from: thinkingMessagePosition,
                to: thinkingMessagePosition + thinkingText.length,
                insert: `> 🚨 Error: ${error.message}`
              }
            });
          }
        }
      })();

      // Return true to signal that we have handled this key event.
      return true;
    }
  }
]);