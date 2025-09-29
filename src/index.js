import './util/passive-events.js'; // Apply passive event listener patch globally

import { Buffer } from 'buffer';
window.Buffer = Buffer;
window.process = { env: {} }; 

import { Editor } from './editor/editor.js';
import { Git } from './util/git-integration.js';
import { initializeAppInteractions } from './sidebar/ui-interactions.js';
import { initializeDevTools } from './devtools/devtools.js';
import { CommandPalette } from './util/command-palette.js';
import { runMigration } from './util/migration.js';

// --- Expose a global API for the app ---
window.thoughtform = {
  ui: {},
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

initializeAppInteractions();
initializeDevTools();
window.thoughtform.runMigration = runMigration;

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

    // --- THIS IS THE FIX ---
    window.addEventListener('keydown', (e) => {
      const activeEl = document.activeElement;
      
      // A more robust check to prevent shortcuts from firing when typing in any input-like field.
      const isInputFocused = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );

      // We only want to run our shortcuts if the focus is on the main body or the editor itself.
      // The `!activeEl.closest('.command-container')` check is crucial to ignore the command palette's own input.
      if (isInputFocused && !activeEl.classList.contains('cm-content')) {
        if (!activeEl.closest('.command-container')) {
             return;
        }
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
    }); // The problematic `{ capture: true }` option has been removed.
  }
}, 100);