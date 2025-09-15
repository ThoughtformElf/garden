// src/index.js
import { Buffer } from 'buffer';
window.Buffer = Buffer; // Polyfill for isomorphic-git
import { Editor } from './editor/editor.js';
import { Git } from './util/git-integration.js';
import { initializeAppInteractions } from './sidebar/ui-interactions.js';
import { initializeDevTools } from './devtools/devtools.js'; // Import the new module

// --- Main Application Logic ---

const basePath = new URL(import.meta.url).pathname.split('/').slice(0, -2).join('/');

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

new Editor({ 
  target: 'main',
  gitClient: gitClient
});
