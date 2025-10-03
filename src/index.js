// src/index.js
import './util/passive-events.js'; // Apply passive event listener patch globally

import { Buffer } from 'buffer';
window.Buffer = Buffer;
window.process = { env: {} };

import { Editor } from './editor/editor.js';
import { Git } from './util/git-integration.js';
import { initializeAppInteractions } from './sidebar/ui-interactions.js';
import { initializeDevTools } from './devtools/devtools.js';
import { CommandPalette } from './util/command-palette.js';
import { runMigration } from './util/migration.js';
import { initializeAiService } from './ai/index.js'; // Import the new AI service

// --- Expose a global API for the app ---
window.thoughtform = {
  ui: {},
  ai: initializeAiService(), // Initialize and attach the AI service
};

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
window.thoughtform.runMigration = runMigration;

// --- Global Error Handling ---
window.onerror = function(message, source, lineno, colno, error) {
  console.error("Caught global error:", message, error);
  window.thoughtform.ui.toggleDevtools?.(true, 'console');
  return false;
};

window.onunhandledrejection = function(event) {
  console.error("Caught unhandled promise rejection:", event.reason);
  window.thoughtform.ui.toggleDevtools?.(true, 'console');
};

const commandPalette = new CommandPalette({ gitClient: null, editor: null });
window.thoughtform.commandPalette = commandPalette;

const editor = new Editor({
  target: 'main',
  gitClient: gitClient,
  commandPalette: commandPalette
});

// Attach the editor instance to the global object so other modules can access it.
window.thoughtform.editor = editor;

const checkEditorReady = setInterval(() => {
  if (editor.isReady) {
    clearInterval(checkEditorReady);
    
    commandPalette.gitClient = gitClient;
    commandPalette.editor = editor;

    // The problematic global keydown listener has been completely removed.
    // All keyboard handling is now managed correctly within the CodeMirror extensions.

  }
}, 100);