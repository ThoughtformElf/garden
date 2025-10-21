// This script renames the currently active file in the editor.
// It will trigger a modal to ask for the new file name.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance.
// 'git': The git client for the current garden.
// 'event': Null for keymap-triggered events.

const sidebar = window.thoughtform.sidebar;
const currentFilePath = editor?.filePath;

if (sidebar && currentFilePath) {
  // The handleRename function from the sidebar contains all the necessary logic,
  // including prompting the user, performing the rename, and handling cancellation.
  sidebar.handleRename(currentFilePath);
} else {
  console.error('[Rename Keymap] Could not find sidebar or current file path.');
}