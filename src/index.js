import './util/passive-events.js';

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
import { initializeEventBus } from './workspace/manager/events.js';
import { HookRunner } from './workspace/hooks.js';
import { registerSW } from 'virtual:pwa-register';
import { Modal } from './util/modal.js';
import { initializeWorkspaceManager } from './workspace/index.js';
import { initializeQueryLoader } from './workspace/query-loader.js';

function initializeNavigationListener(isPreview) {
    const handleNav = async () => {
        if (isPreview) {
            window.parent.postMessage({ type: 'preview-url-changed', payload: { newUrl: window.location.href } }, '*');
        }

        const fullPath = new URL(import.meta.url).pathname;
        const srcIndex = fullPath.lastIndexOf('/src/');
        const basePath = srcIndex > -1 ? fullPath.substring(0, srcIndex) : '';

        let gardenName = window.location.pathname.startsWith(basePath)
            ? window.location.pathname.substring(basePath.length)
            : window.location.pathname;

        gardenName = gardenName.replace(/^\/|\/$/g, '') || 'home';
        gardenName = decodeURIComponent(gardenName);

        // THIS IS THE FIX: Strip query params from the file path
        let filePath = (window.location.hash || '#/home').substring(1);
        filePath = decodeURI(filePath).split('?')[0];

        await window.thoughtform.workspace.openFile(gardenName, filePath);
    };

    window.addEventListener('popstate', handleNav);
    
    if (isPreview) {
        document.body.classList.add('is-preview-mode');

        document.body.addEventListener('mousedown', () => {
            window.parent.postMessage({ type: 'preview-focus' }, '*');
        }, { capture: true });

        const markInteracted = () => {
            window.parent.postMessage({ type: 'preview-interacted' }, '*');
            document.body.removeEventListener('mousedown', markInteracted, true);
            document.body.removeEventListener('wheel', markInteracted, true);
        };
        document.body.addEventListener('mousedown', markInteracted, true);
        document.body.addEventListener('wheel', markInteracted, true);
    }
}


// --- Main Application Logic ---
async function main() {
  const fullPath = new URL(import.meta.url).pathname;
  const srcIndex = fullPath.lastIndexOf('/src/');
  const basePath = srcIndex > -1 ? fullPath.substring(0, srcIndex) : '';

  // THIS IS THE FIX: Correctly detect preview mode from the hash
  const hash = window.location.hash || '';
  const isPreview = hash.includes('?preview=true');

  const settingsGit = new Git('Settings');
  await settingsGit.initRepo();

  let gardenName = window.location.pathname.startsWith(basePath)
    ? window.location.pathname.substring(basePath.length)
    : window.location.pathname;

  gardenName = gardenName.replace(/^\/|\/$/g, '') || 'home';
  gardenName = decodeURIComponent(gardenName);

  console.log(`Base Path: "${basePath}"`);
  console.log(`Loading garden: "${gardenName}"`);

  const gitClient = new Git(gardenName);

  window.thoughtform = {
    ui: {},
    ai: initializeAiService(),
    config: initializeConfigService(),
    events: initializeEventBus(),
  };
  
  window.thoughtform.workspace = initializeWorkspaceManager(gitClient);

  const updateSW = registerSW({
    onNeedRefresh() {
      Modal.confirm({
        title: 'Update Available',
        message: 'A new version of Thoughtform Garden is available. Reload to apply the update?',
        okText: 'Reload'
      }).then(confirmed => {
        if (confirmed) updateSW(true);
      });
    },
    onOfflineReady() {
      console.log('App is ready for offline use.');
    }
  });

  window.thoughtform.updateApp = updateSW;

  initializeAppInteractions();
  initializeDevTools();
  window.thoughtform.runMigration = runMigration;

  window.onerror = function(message, source, lineno, colno, error) {
    console.error("Caught global error:", message, error);
    if (!isPreview) window.thoughtform.ui.toggleDevtools?.(true, 'console');
    return false;
  };

  window.onunhandledrejection = function(event) {
    console.error("Caught unhandled promise rejection:", event.reason);
    if (!isPreview) window.thoughtform.ui.toggleDevtools?.(true, 'console');
  };

  const editorShim = { gitClient }; 
  window.thoughtform.editor = editorShim;

  const commandPalette = new CommandPalette();
  window.thoughtform.commandPalette = commandPalette;

  await window.thoughtform.workspace.render();
  
  const editor = window.thoughtform.workspace.getActiveEditor();
  if (!editor) {
      console.error("FATAL: Workspace manager failed to create an initial editor.");
      return;
  }
  
  window.thoughtform.editor = editor;
  
  const hookRunner = new HookRunner(window.thoughtform.events);
  hookRunner.initialize();
  window.thoughtform.hooks = hookRunner;
  
  initializeNavigationListener(isPreview);

  await initializeQueryLoader();

  window.thoughtform.events.publish('app:load');
}

main();