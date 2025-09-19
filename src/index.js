// src/index.js
import { Buffer } from 'buffer';
window.Buffer = Buffer; // Polyfill for isomorphic-git
import { Editor } from './editor/editor.js';
import { Git } from './util/git-integration.js';
import { initializeAppInteractions } from './sidebar/ui-interactions.js';
import { initializeDevTools } from './devtools/devtools.js';
import { CommandPalette } from './util/command-palette.js';

// --- Expose a global API for the app ---
window.thoughtform = {};

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
    // This is the single source of truth for the command palette shortcut.
    // It uses `capture: true` to intercept the event before the browser
    // or CodeMirror can (e.g., stopping the Print dialog).
    window.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      // Listen for 'p' and check modifier keys.
      if (modifierKey && e.key.toLowerCase() === 'p') {
        // We MUST prevent the default action immediately.
        e.preventDefault();
        e.stopPropagation();

        if (e.shiftKey) {
          // Ctrl+Shift+P -> Execute Mode
          commandPalette.open('execute');
        } else {
          // Ctrl+P -> Search Mode
          commandPalette.open('search');
        }
      }
    }, { capture: true }); // Use capturing phase.
  }
}, 100);
