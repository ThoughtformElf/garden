// This script creates a new file by calling the editor's core functionality.
// It will trigger a modal to ask for the file name.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance, passed by the executor.
// 'git': The git client for the current garden, passed by the executor.
// 'event': Null for keymap-triggered events.

if (editor) {
  editor.newFile();
} else {
  console.error('[New File Keymap] Could not find editor instance.');
}