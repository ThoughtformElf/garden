import { Buffer } from 'buffer';
window.Buffer = Buffer; // Polyfill for isomorphic-git
import { Editor } from './editor.js';
import { Git } from './git-integration.js';
import { initializeAppInteractions } from './ui-interactions.js';

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

new Editor({ 
  target: 'main',
  gitClient: gitClient
});

const el = document.getElementById('eruda-container');
import('eruda').then(({ default: eruda }) => {
  eruda.init({
    container: el,
    tool: ['console', 'elements', 'network', 'resources'],
    inline: true,
    useShadowDom: false,
  });
});
