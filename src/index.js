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
const checkEditorReady = setInterval(() => {
  if (editor.isReady) {
    clearInterval(checkEditorReady);

    const commandPalette = new CommandPalette({ gitClient, editor });
    // Expose the palette instance on our global API
    window.thoughtform.commandPalette = commandPalette;

    window.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (modifierKey && e.key === 'k') {
        e.preventDefault();
        commandPalette.open();
      }
    });
  }
}, 100);
