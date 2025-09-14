import { Buffer } from 'buffer';
window.Buffer = Buffer; // Polyfill for isomorphic-git
import { Editor } from './editor.js';
import { initializeAppInteractions } from './ui-interactions.js';

// Initialize all UI interactions from the dedicated module
initializeAppInteractions();

// Initialize the application by creating the first editor instance
new Editor({ target: 'main' });

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
