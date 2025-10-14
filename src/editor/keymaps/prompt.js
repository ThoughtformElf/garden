import { keymap, EditorView } from '@codemirror/view';

/**
 * A keymap that adds a new AI prompt if Mod-Enter is pressed
 * and not handled by other more specific keymaps (like AI chat execution or link navigation).
 */
export const promptInsertionKeymap = keymap.of([
  {
    key: 'Mod-Enter',
    run: (view) => {
      // This keymap has lower priority. If we've reached this point, it means
      // the other Mod-Enter handlers (AI chat and link navigation) did not
      // handle the event. Therefore, we can safely insert the prompt.

      const doc = view.state.doc;
      const endOfDoc = doc.length;
      let insertText = `\n\n>$ `;

      // Check if the document already ends with newlines to avoid adding too many.
      if (endOfDoc > 1) {
          const lastTwoChars = doc.sliceString(endOfDoc - 2, endOfDoc);
          if (lastTwoChars === '\n\n') {
              insertText = `>$ `;
          } else if (lastTwoChars.endsWith('\n')) {
              insertText = `\n>$ `;
          }
      }

      // Dispatch a transaction to insert the text, move the cursor, and scroll into view.
      view.dispatch({
        changes: { from: endOfDoc, insert: insertText },
        selection: { anchor: endOfDoc + insertText.length },
        effects: EditorView.scrollIntoView(endOfDoc + insertText.length, { y: "end" })
      });

      // We have handled the event.
      return true;
    }
  }
]);