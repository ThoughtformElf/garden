// This script creates a new garden by calling the sidebar's core functionality.
// It will trigger a modal to ask for the garden name.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance, passed by the executor.
// 'git': The git client for the current garden, passed by the executor.
// 'event': Null for keymap-triggered events.

const sidebar = window.thoughtform.sidebar;

if (sidebar) {
  sidebar.handleNewGarden();
} else {
  console.error('[New Garden Keymap] Could not find sidebar instance.');
}