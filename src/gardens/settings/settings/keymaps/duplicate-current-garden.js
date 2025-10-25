// This script duplicates the currently active garden.
// It will trigger a modal to ask for the new garden name.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance.
// 'git': The git client for the current garden.
// 'event': Null for keymap-triggered events.

const sidebar = window.thoughtform.sidebar;
const currentGardenName = git?.gardenName;

if (sidebar && currentGardenName) {
  // The handleDuplicateGarden function on the sidebar handles all the logic,
  // including prompting the user.
  sidebar.handleDuplicateGarden(currentGardenName);
} else {
  console.error('[Duplicate Garden Keymap] Could not find sidebar or current garden name.');
}