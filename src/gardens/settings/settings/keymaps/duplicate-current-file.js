// This script duplicates the currently active file in the editor.
// It will trigger a modal to ask for the new file name.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance.
// 'git': The git client for the current garden.
// 'event': Null for keymap-triggered events.

if (editor && editor.filePath) {
  editor.duplicateFile(editor.filePath);
} else {
  console.error('[Duplicate Keymap] Could not find editor or current file path.');
}