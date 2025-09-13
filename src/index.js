import { Buffer } from 'buffer';
window.Buffer = Buffer; // Polyfill for isomorphic-git
import { Editor } from './editor.js';
import { initializeSidebarInteractions } from './ui-interactions.js';

// Initialize sidebar resizing and collapsing before the editor.
initializeSidebarInteractions();

// Initialize the application by creating the first editor instance
new Editor({ target: 'main' });
// Always load and initialize Eruda for all users.
const el = document.querySelector('#eruda-container');
if (el) {
  import('eruda').then(({ default: eruda }) => {
    eruda.init({
      container: el,
      tool: ['console', 'elements', 'network', 'resources'],
    });
  });
}
