// This script is executed to insert a new AI prompt at the end of the document.
// It is the default action for Mod-Enter when the cursor is not on a link or in a prompt.

(function() {
  const view = window.thoughtform.editor.editorView;
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
    effects: view.constructor.scrollIntoView(endOfDoc + insertText.length, { y: "end" })
  });
})();