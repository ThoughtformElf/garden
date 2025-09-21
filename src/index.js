import process from 'process';
import { Buffer } from 'buffer';
window.Buffer = Buffer;
window.process = process;
import { Editor } from './editor/editor.js';
import { Git } from './util/git-integration.js';
import { initializeAppInteractions } from './sidebar/ui-interactions.js';
import { initializeDevTools } from './devtools/devtools.js';
import { CommandPalette } from './util/command-palette.js';

// --- Expose a global API for the app ---
window.thoughtform = {
  ui: {}, // Create a namespace for UI control functions
};

// --- Main Application Logic ---
const fullPath = new URL(import.meta.url).pathname;
const srcIndex = fullPath.lastIndexOf('/src/');
const basePath = srcIndex > -1 ? fullPath.substring(0, srcIndex) : '';

let gardenName = window.location.pathname.startsWith(basePath)
  ? window.location.pathname.substring(basePath.length)
  : window.location.pathname;

gardenName = gardenName.replace(/^\/|\/$/g, '') || 'home';
gardenName = decodeURIComponent(gardenName);

console.log(`Base Path: "${basePath}"`);
console.log(`Loading garden: "${gardenName}"`);

const gitClient = new Git(gardenName);

// This will populate window.thoughtform.ui with methods
initializeAppInteractions();
initializeDevTools();

// --- Global Error Handling ---
window.onerror = function(message, source, lineno, colno, error) {
  console.error("Caught global error:", message, error);
  // Ensure devtools are shown when an error occurs, and force console tab
  window.thoughtform.ui.toggleDevtools?.(true, 'console');
  // Return false to allow the default browser error handling to continue
  return false;
};

window.onunhandledrejection = function(event) {
  console.error("Caught unhandled promise rejection:", event.reason);
  // Ensure devtools are shown when an error occurs, and force console tab
  window.thoughtform.ui.toggleDevtools?.(true, 'console');
};
// --- End of Error Handling ---

const editor = new Editor({
  target: 'main',
  gitClient: gitClient
});

// --- Initialize Command Palette & API ---
// We wait for the editor to be fully ready before creating the palette
// and setting up the master keydown listener.
const checkEditorReady = setInterval(() => {
  if (editor.isReady) {
    clearInterval(checkEditorReady);

    const commandPalette = new CommandPalette({ gitClient, editor });
    window.thoughtform.commandPalette = commandPalette;

    // --- MASTER KEYDOWN LISTENER ---
    // This is the single source of truth for global keyboard shortcuts.
    // It uses `capture: true` to intercept events before other listeners.
    window.addEventListener('keydown', (e) => {
      // Don't interfere with inputs, textareas, etc., unless it's the editor itself.
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
      if (isInputFocused && !activeEl.classList.contains('cm-content')) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (!modifierKey) return;

      switch (e.key.toLowerCase()) {
        case 'p':
          e.preventDefault();
          e.stopPropagation();
          if (e.shiftKey) {
            commandPalette.open('execute');
          } else {
            commandPalette.open('search');
          }
          break;

        case '[':
          e.preventDefault();
          e.stopPropagation();
          window.thoughtform.ui.toggleSidebar?.();
          break;

        case '`':
          e.preventDefault();
          e.stopPropagation();
          // Manually toggle without forcing a specific tab
          window.thoughtform.ui.toggleDevtools?.(null, null);
          break;
      }
    }, { capture: true }); // Use capturing phase.
  }
}, 100);