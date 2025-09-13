import { Buffer } from 'buffer';
window.Buffer = Buffer; // Polyfill for isomorphic-git

import { Editor } from './editor.js';

// Initialize the application by creating the first editor instance
new Editor({ target: 'main' });