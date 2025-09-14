import { Buffer } from 'buffer';
window.Buffer = Buffer; // Polyfill for isomorphic-git

import { Editor } from './editor.js';
import { Git } from './git-integration.js';
import { initializeAppInteractions } from './ui-interactions.js';

// --- Main Application Logic ---

// Get the base path dynamically. For GitHub Pages, it's the repo name.
// This is more robust than hardcoding.
const basePath = new URL(import.meta.url).pathname.split('/').slice(0, -2).join('/');

// Determine the garden name by removing the base path from the window's pathname.
let gardenName = window.location.pathname.startsWith(basePath)
  ? window.location.pathname.substring(basePath.length)
  : window.location.pathname;

// Clean up the name: remove leading/trailing slashes and default if empty.
gardenName = gardenName.replace(/^\/|\/$/g, '') || 'home';

console.log(`Base Path: "${basePath}"`);
console.log(`Loading garden: "${gardenName}"`);

// Create a specific Git client instance for this garden
const gitClient = new Git(gardenName);

// Initialize UI interactions
initializeAppInteractions();

// Initialize the application by creating the editor instance
new Editor({ 
  target: 'main',
  gitClient: gitClient
});

// Initialize Eruda
const el = document.getElementById('eruda-container');
import('eruda').then(({ default: eruda }) => {
  eruda.init({
    container: el,
    tool: ['console', 'elements', 'network', 'resources'],
    inline: true,
    useShadowDom: false,
  });
});
