// This script creates a new file by calling the editor's core functionality.
// It will trigger a modal to ask for the file name.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance.
// 'git': The git client for the current garden.
// 'event': Null for keymap-triggered events.

if (window.thoughtform.editor) {
  window.thoughtform.editor.newFile();
} else {
  console.error('[New File Keymap] Could not find editor instance.');
}