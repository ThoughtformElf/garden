// src/index.js
import { Buffer } from 'buffer';
window.Buffer = Buffer; // Polyfill for isomorphic-git
import { Editor } from './editor/editor.js';
import { Git } from './util/git-integration.js';
import { initializeAppInteractions } from './sidebar/ui-interactions.js';
import { initializeDevTools } from './devtools/devtools.js'; // Import the new module
import { CommandPalette } from './util/command-palette.js';

// --- Main Application Logic ---
// --- FIX: Robust base path calculation ---
const fullPath = new URL(import.meta.url).pathname;
const srcIndex = fullPath.lastIndexOf('/src/');
const basePath = srcIndex > -1 ? fullPath.substring(0, srcIndex) : '';

let gardenName = window.location.pathname.startsWith(basePath)
  ? window.location.pathname.substring(basePath.length)
  : window.location.pathname;

gardenName = gardenName.replace(/^\/|\/$/g, '') || 'home';

// FIX: Decode the garden name immediately to handle spaces (%20) etc.
// This ensures the entire application uses the clean, un-encoded name.
gardenName = decodeURIComponent(gardenName);

console.log(`Base Path: "${basePath}"`);
console.log(`Loading garden: "${gardenName}"`);

const gitClient = new Git(gardenName);

initializeAppInteractions();
initializeDevTools(); // Initialize Eruda and the custom data tab

const editor = new Editor({ 
  target: 'main',
  gitClient: gitClient
});

// --- Initialize Command Palette ---
// Wait for the editor to be ready before initializing
const checkEditorReady = setInterval(() => {
  if (editor.isReady) {
    clearInterval(checkEditorReady);

    const commandPalette = new CommandPalette({ gitClient, editor });

    window.addEventListener('keydown', (e) => {
      // Use `metaKey` for Command key on macOS
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (modifierKey && e.key === 'k') {
        e.preventDefault();
        commandPalette.open();
      }
    });
  }
}, 100);
