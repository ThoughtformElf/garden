// This script is the action for the "Mod-Shift-Enter" keyboard shortcut.
// It finds a wikilink under the cursor and opens it in a new pane.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance, passed by the executor.
// 'git': The git client for the current garden, passed by the executor.
// 'event': Null for keymap-triggered events.

const view = editor.editorView;
if (!view) {
  console.error('[navigate-in-new-pane] Editor view not found.');
  return;
}

const pos = view.state.selection.main.head;
const line = view.state.doc.lineAt(pos);

// We only care about wikilinks for this action.
const wikilinkRegex = /\[\[([^\[\]]+?)\]\]/g;

let match;
// Reset regex state for each use
wikilinkRegex.lastIndex = 0;
while ((match = wikilinkRegex.exec(line.text))) {
  const start = line.from + match.index;
  const end = start + match[0].length;

  // Check if the cursor is inside the bounds of this link match.
  if (pos >= start && pos <= end) {
    const linkContent = match[1];

    // Use the new workspace manager method to handle the logic.
    // The editor context contains the paneId.
    window.thoughtform.workspace.openInNewPane(
      linkContent,
      editor.paneId
    );

    // We found our link and handled it, so we can stop.
    return;
  }
}