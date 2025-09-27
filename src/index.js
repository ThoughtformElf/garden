import './util/passive-events.js'; // Apply passive event listener patch globally

import { Buffer } from 'buffer';
window.Buffer = Buffer;
window.process = { env: {} }; 

import { Editor } from './editor/editor.js';
import { Git } from './util/git-integration.js';
import { initializeAppInteractions } from './sidebar/ui-interactions.js';
import { initializeDevTools } from './devtools/devtools.js';
import { CommandPalette } from './util/command-palette.js';
import { runMigration } from './util/migration.js'; // <-- ADD THIS LINE

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
window.thoughtform.runMigration = runMigration; // <-- ADD THIS LINE

// --- Global Error Handling ---
window.onerror = function(message, source, lineno, colno, error) {
  console.error("Caught global error:", message, error);
  window.thoughtform.ui.toggleDevtools?.(true, 'console');
  return false;
};

window.onunhandledrejection = function(event) {
  console.error("Caught unhandled promise rejection:", event.reason);
  window.thoughtform.ui.toggleDevtools?.(true, 'console');
};
// --- End of Error Handling ---

const editor = new Editor({
  target: 'main',
  gitClient: gitClient
});

// --- Initialize Command Palette & API ---
const checkEditorReady = setInterval(() => {
  if (editor.isReady) {
    clearInterval(checkEditorReady);

    const commandPalette = new CommandPalette({ gitClient, editor });
    window.thoughtform.commandPalette = commandPalette;

    // --- MASTER KEYDOWN LISTENER ---
    window.addEventListener('keydown', (e) => {
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
          window.thoughtform.ui.toggleDevtools?.(null, null);
          break;
      }
    }, { capture: true });
  }
}, 100);