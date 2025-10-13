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
import { initializeConfigService } from './config.js';
import { initializeEventBus } from './workspace/events.js';
import { HookRunner } from './workspace/hooks.js';
import { registerSW } from 'virtual:pwa-register';
import { Modal } from './util/modal.js';
import { initializeWorkspaceManager } from './workspace/index.js'; // Import the new manager

// Handles browser back/forward buttons.
function initializeNavigationListener() {
    window.addEventListener('popstate', async () => {
        const fullPath = new URL(import.meta.url).pathname;
        const srcIndex = fullPath.lastIndexOf('/src/');
        const basePath = srcIndex > -1 ? fullPath.substring(0, srcIndex) : '';

        let gardenName = window.location.pathname.startsWith(basePath)
            ? window.location.pathname.substring(basePath.length)
            : window.location.pathname;

        gardenName = gardenName.replace(/^\/|\/$/g, '') || 'home';
        gardenName = decodeURIComponent(gardenName);

        let filePath = (window.location.hash || '#/home').substring(1);
        filePath = decodeURI(filePath);

        // Tell the workspace to load this state into the active pane.
        await window.thoughtform.workspace.openFile(gardenName, filePath);
    });
}

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

  // --- Expose a global API for the app ---
  window.thoughtform = {
    ui: {},
    ai: initializeAiService(),
    config: initializeConfigService(),
    events: initializeEventBus(),
    workspace: initializeWorkspaceManager(gitClient),
  };

  // --- PWA Update Logic ---
  const updateSW = registerSW({
    onNeedRefresh() {
      Modal.confirm({
        title: 'Update Available',
        message: 'A new version of Thoughtform Garden is available. Reload to apply the update?',
        okText: 'Reload'
      }).then(confirmed => {
        if (confirmed) {
          updateSW(true); // Reloads the page with the new version
        }
      });
    },
    onOfflineReady() {
      console.log('App is ready for offline use.');
    }
  });

  // Attach the update check function to the global API so devtools can call it
  window.thoughtform.updateApp = updateSW;

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

  const editorShim = { gitClient }; 
  window.thoughtform.editor = editorShim;

  const commandPalette = new CommandPalette({ gitClient: null, editor: null });
  window.thoughtform.commandPalette = commandPalette;

  await window.thoughtform.workspace.render();
  
  const editor = window.thoughtform.workspace.getActiveEditor();
  if (!editor) {
      console.error("FATAL: Workspace manager failed to create an initial editor.");
      return;
  }
  
  window.thoughtform.editor = editor;
  commandPalette.gitClient = editor.gitClient;
  commandPalette.editor = editor;
  
  const hookRunner = new HookRunner(window.thoughtform.events);
  hookRunner.initialize();
  window.thoughtform.hooks = hookRunner;
  
  initializeNavigationListener();

  window.thoughtform.events.publish('app:load');
}

main();