import { Buffer } from 'buffer';
window.Buffer = Buffer; // Polyfill for isomorphic-git

import { Editor } from './editor.js';
import { Git } from './git-integration.js'; // Import the class, not an instance
import { initializeAppInteractions } from './ui-interactions.js';

// --- Main Application Logic ---

// 1. Get the base path from the vite config (hardcoded for now as it's static)
const basePath = '/garden/';

// 2. Determine the garden name from the URL path
let gardenName = window.location.pathname.startsWith(basePath)
  ? window.location.pathname.substring(basePath.length)
  : window.location.pathname.substring(1);

// Sanitize the name: remove trailing slashes and default if empty
gardenName = gardenName.replace(/\/$/, '') || 'home';

console.log(`Loading garden: "${gardenName}"`);

// 3. Create a specific Git client instance for this garden
const gitClient = new Git(gardenName);

// 4. Initialize UI interactions
initializeAppInteractions();

// 5. Initialize the application by creating the editor instance
//    and passing the dedicated gitClient to it.
new Editor({ 
  target: 'main',
  gitClient: gitClient
});

// Initialize Eruda (no changes here)
const el = document.getElementById('eruda-container');
import('eruda').then(({ default: eruda }) => {
  eruda.init({
    container: el,
    tool: ['console', 'elements', 'network', 'resources'],
    inline: true,
    useShadowDom: false,
  });
});
