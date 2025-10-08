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
import { initializeAiService } from './ai/index.js';
import { initializeConfigService } from './config.js'; // Import the new Config service

// --- Expose a global API for the app ---
window.thoughtform = {
  ui: {},
  ai: initializeAiService(),
  config: initializeConfigService(), // Initialize and attach the Config service
};

// --- Main Application Logic ---
async function main() {
  const fullPath = new URL(import.meta.url).pathname;
  const srcIndex = fullPath.lastIndexOf('/src/');
  const basePath = srcIndex > -1 ? fullPath.substring(0, srcIndex) : '';

  // --- Ensure the Settings garden exists on every load ---
  const settingsGit = new Git('Settings');
  await settingsGit.initRepo();
  // ---

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

  // Now we can create the editor
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

      // Initialize the config service now that the editor is ready
      window.thoughtform.config.initialize();
    }
  }, 100);
}

main();