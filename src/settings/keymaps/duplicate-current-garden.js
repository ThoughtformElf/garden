// This script duplicates the currently active garden.
// It will trigger a modal to ask for the new garden name.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance.
// 'git': The git client for the current garden.
// 'event': Null for keymap-triggered events.

const sidebar = window.thoughtform.sidebar;
// git.gardenName is the decoded name of the current garden
const currentGardenName = git?.gardenName;

if (sidebar && currentGardenName) {
  // The handleDuplicateGarden function expects the name as it's stored,
  // which might be URI encoded if it contains special characters.
  // We encode the current garden's name to match this expectation.
  const encodedGardenName = encodeURIComponent(currentGardenName);
  sidebar.handleDuplicateGarden(encodedGardenName);
} else {
  console.error('[Duplicate Garden Command] Could not find sidebar or current garden name.');
}