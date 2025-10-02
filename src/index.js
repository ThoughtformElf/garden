// src/index.js
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
import { initializeAiService } from './ai/index.js'; // Import the new AI service

// --- Expose a global API for the app ---
window.thoughtform = {
  ui: {},
  ai: initializeAiService(), // Initialize and attach the AI service
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

const commandPalette = new CommandPalette({ gitClient: null, editor: null });
window.thoughtform.commandPalette = commandPalette;

const editor = new Editor({
  target: 'main',
  gitClient: gitClient,
  commandPalette: commandPalette
});

// --- THIS IS THE FIX ---
// Attach the editor instance to the global object so other modules, like the AI service, can access it.
window.thoughtform.editor = editor;
// --- END OF FIX ---

const checkEditorReady = setInterval(() => {
  if (editor.isReady) {
    clearInterval(checkEditorReady);
    
    commandPalette.gitClient = gitClient;
    commandPalette.editor = editor;

    // --- THE DEFINITIVE GLOBAL SHORTCUT HANDLER ---
    // This listener uses the `capture` phase to ensure it runs before any other
    // listeners (like the editor's). This guarantees our global shortcuts
    // will always fire, regardless of which element has focus.
    window.addEventListener('keydown', (e) => {
      // If the command palette is already open, let it handle its own keyboard events.
      if (commandPalette.isOpen) {
        return;
      }
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      // --- FIX: This block handles BOTH AI and other shortcuts ---
      let handled = false;
      if (modifierKey) {
          switch (e.key.toLowerCase()) {
            case 'p':
              if (e.shiftKey) {
                commandPalette.open('execute');
              } else {
                commandPalette.open('search');
              }
              handled = true;
              break;

            case '[':
              window.thoughtform.ui.toggleSidebar?.();
              handled = true;
              break;

            case '`':
              window.thoughtform.ui.toggleDevtools?.(null, null);
              handled = true;
              break;
            
          }
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, { capture: true }); 
  }
}, 100);