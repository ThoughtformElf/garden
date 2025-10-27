import './util/passive-events.js';

import { Buffer } from 'buffer';
window.Buffer = Buffer;
window.process = { env: {} };

import { Git } from './util/git-integration.js';
import { initializeAppInteractions } from './sidebar/ui-interactions.js';
import { initializeDevTools } from './devtools/devtools.js';
import { CommandPalette } from './util/command-palette.js';
import { runMigration } from './util/migration.js';
import { initializeAiService } from './ai/index.js';
import { initializeConfigService } from './config.js';
import { initializeEventBus } from './workspace/manager/events.js';
import { HookRunner } from './workspace/hooks.js';
import { registerSW } from 'virtual:pwa-register';
import { Modal } from './util/modal.js';
import { initializeWorkspaceManager } from './workspace/index.js';
import { initializeQueryLoader } from './workspace/query-loader.js';
import { seedCoreGardens } from './workspace/core-gardens.js';
import { Sync } from './devtools/sync/index.js';

function initializeNavigationListener() {
    const handleNav = async () => {
        window.thoughtform.workspace.updateSessionFromUrl();
        await initializeQueryLoader();

        const fullPath = new URL(import.meta.url).pathname;
        const srcIndex = fullPath.lastIndexOf('/src/');
        const basePath = srcIndex > -1 ? fullPath.substring(0, srcIndex) : '';

        let gardenName = window.location.pathname.startsWith(basePath)
            ? window.location.pathname.substring(basePath.length)
            : window.location.pathname;

        gardenName = gardenName.replace(/^\/|\/$/g, '') || 'home';
        gardenName = decodeURIComponent(gardenName);

        const hash = window.location.hash || '#/home';
        const filePath = decodeURI(hash.substring(1).split('?')[0]);
        
        const isPreview = (window.location.hash || '').includes('?windowed=true');
        if (isPreview) {
            window.parent.postMessage({ type: 'preview-url-changed', payload: { newUrl: window.location.href } }, '*');
        }

        await window.thoughtform.workspace.openFile(gardenName, filePath);
    };

    window.addEventListener('popstate', handleNav);
    
    return handleNav;
}


// --- Main Application Logic ---
async function main() {
  await seedCoreGardens();

  // --- 1. Initialize Core Services (No Dependencies) ---
  window.thoughtform = {
    ui: {},
    ai: initializeAiService(),
    config: initializeConfigService(),
    events: initializeEventBus(),
  };

  // --- 2. Initialize Workspace and Sync, Linking Them Correctly ---
  const initialGitClient = new Git('home'); // This will be updated by the navigation handler.
  const workspaceManager = initializeWorkspaceManager(initialGitClient);
  const syncService = new Sync(workspaceManager); // Pass workspace to Sync
  
  // Assign the singletons to the global object.
  window.thoughtform.workspace = workspaceManager;
  window.thoughtform.sync = syncService;

  // --- 3. Initialize UI Components That Depend on Core Services ---
  registerSW({
    onNeedRefresh() {
      Modal.confirm({
        title: 'Update Available',
        message: 'A new version of Thoughtform Garden is available. Reload to apply the update?',
        okText: 'Reload'
      }).then(confirmed => {
        if (confirmed) {
          const registration = window.pwaRegistration;
          if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      });
    },
    onOfflineReady() {
      console.log('App is ready for offline use.');
    }
  });

  initializeAppInteractions();
  initializeDevTools(); // This now correctly finds window.thoughtform.sync and initializes its UI.
  window.thoughtform.runMigration = runMigration;
  
  const isPreview = (window.location.hash || '').includes('?windowed=true');
  window.onerror = function(message, source, lineno, colno, error) {
    console.error("Caught global error:", message, error);
    if (!isPreview) window.thoughtform.ui.toggleDevtools?.(true, 'console');
    return false;
  };

  window.onunhandledrejection = function(event) {
    console.error("Caught unhandled promise rejection:", event.reason);
    if (!isPreview) window.thoughtform.ui.toggleDevtools?.(true, 'console');
  };

  const commandPalette = new CommandPalette();
  window.thoughtform.commandPalette = commandPalette;

  // --- 4. Render the UI for the first time ---
  await window.thoughtform.workspace.render();
  
  const editor = window.thoughtform.workspace.getActiveEditor();
  if (!editor) {
      console.error("FATAL: Workspace manager failed to create an initial editor.");
      return;
  }
  window.thoughtform.editor = editor;
  
  // --- 5. Initialize Post-Render Services ---
  const hookRunner = new HookRunner(window.thoughtform.events);
  hookRunner.initialize();
  window.thoughtform.hooks = hookRunner;
  
  const handleInitialNav = initializeNavigationListener();
  
  // --- 6. Perform Initial Navigation and Load Content ---
  await handleInitialNav(); 

  window.thoughtform.workspace.isInitialized = true;
  window.thoughtform.events.publish('app:load');
}

main();