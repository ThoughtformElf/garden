import { Git } from '../util/git-integration.js';
import { appContextField } from '../editor/navigation.js';
import { WorkspaceRenderer } from './renderer.js';
import { PaneManager } from './manager/pane.js';
import { WorkspaceStateManager } from './manager/state.js';

/**
 * Manages the state of the entire application's UI, including panes,
 * workspaces, and active contexts.
 */
export class WorkspaceManager {
  constructor(initialGitClient) {
    this.initialGitClient = initialGitClient;
    this.panes = new Map();
    this.mainContainer = document.querySelector('main');
    this.isResizing = false;
    this.gitClients = new Map();
    this.gitClients.set(initialGitClient.gardenName, initialGitClient);
    
    this.broadcastChannel = new BroadcastChannel('thoughtform_garden_sync');
    this.broadcastChannel.onmessage = this.handleBroadcastMessage.bind(this);
    
    window.thoughtform.events.subscribe('file:rename', (data) => this.notifyFileRename(data));
    
    // Instantiate helper classes
    this._renderer = new WorkspaceRenderer(this);
    this._paneManager = new PaneManager(this);
    this._stateManager = new WorkspaceStateManager(this);

    const savedState = this._stateManager.loadState();
    if (savedState) {
        this.paneTree = savedState.paneTree;
        this.activePaneId = savedState.activePaneId;
        this.initialEditorStates = savedState.editorStates || {};
        this._paneManager.isMaximized = savedState.isMaximized || false;
    } else {
        this.paneTree = this._createInitialPaneTree();
        this.activePaneId = 'pane-1';
        this.initialEditorStates = {};
        this._paneManager.isMaximized = false;
    }
  }

  _createInitialPaneTree() {
    const initialPath = (window.location.hash || '#/home').substring(1);
    return {
      type: 'leaf',
      id: 'pane-1',
      activeBufferIndex: 0,
      buffers: [ { garden: this.initialGitClient.gardenName, path: initialPath } ]
    };
  }
  
  async getGitClient(gardenName) {
      if (!this.gitClients.has(gardenName)) {
          const client = new Git(gardenName);
          await client.initRepo();
          this.gitClients.set(gardenName, client);
      }
      return this.gitClients.get(gardenName);
  }

  setActivePane(paneId) {
    // --- THIS IS THE FIX ---
    // Only un-maximize if the layout IS maximized AND the user is trying
    // to switch to a DIFFERENT pane. This prevents the "snap back" effect.
    if (this._paneManager.isMaximized && this.activePaneId !== paneId) {
      this.toggleMaximizePane();
    }
    // --- END OF FIX ---

    if (!this.panes.has(paneId)) return;
    this.activePaneId = paneId;

    this.panes.forEach((pane, id) => {
      pane.element.classList.toggle('is-active-pane', id === paneId);
    });
    
    const activePane = this.panes.get(paneId);

    setTimeout(() => {
      activePane?.editor?.editorView.focus();
    }, 50);
    
    this._updateURL();
    window.thoughtform.sidebar?.refresh();
    this._stateManager.saveState();
  }

  async switchGarden(gardenName) {
    const editor = this.getActiveEditor();
    if (!editor || editor.gitClient.gardenName === gardenName) {
      return;
    }

    const newGitClient = await this.getGitClient(gardenName);
    editor.gitClient = newGitClient;
    window.thoughtform.sidebar.gitClient = newGitClient;

    editor.editorView.dispatch({
      effects: editor.appContextCompartment.reconfigure(appContextField.init(() => ({
        gitClient: newGitClient,
        sidebar: window.thoughtform.sidebar,
        editor: editor,
      })))
    });

    await this.openFile(gardenName, '/home');
    
    if (window.thoughtform.sidebar) {
        window.thoughtform.sidebar.activeTab = 'Files';
        sessionStorage.setItem('sidebarActiveTab', 'Files');
    }
    await window.thoughtform.sidebar.refresh();
  }
  
  async openFile(garden, path) {
    const activePaneInfo = this._paneManager.getActivePaneInfo();
    if (!activePaneInfo) return;
    
    const { node, pane } = activePaneInfo;
    const editor = pane.editor;

    const existingBufferIndex = node.buffers.findIndex(b => b.garden === garden && b.path === path);

    if (existingBufferIndex !== -1) {
      node.activeBufferIndex = existingBufferIndex;
    } else {
      node.buffers.push({ garden, path });
      node.activeBufferIndex = node.buffers.length - 1;
    }

    const newGitClient = await this.getGitClient(garden);
    if (editor.gitClient.gardenName !== garden) {
        editor.gitClient = newGitClient;
        editor.editorView.dispatch({
            effects: editor.appContextCompartment.reconfigure(appContextField.init(() => ({
                gitClient: newGitClient,
                sidebar: window.thoughtform.sidebar,
                editor: editor,
            })))
        });
    }

    await editor.loadFile(path);
    this.setActivePane(this.activePaneId);
    this._stateManager.saveState();
  }

  _updateURL() {
      const info = this._paneManager.getActivePaneInfo();
      if (!info) return;
      const activeBuffer = info.node.buffers[info.node.activeBufferIndex];
      
      const fullUrlPath = new URL(import.meta.url).pathname;
      const srcIndex = fullUrlPath.lastIndexOf('/src/');
      const basePath = srcIndex > -1 ? fullUrlPath.substring(0, srcIndex) : '';

      const newPathname = `${basePath}/${encodeURIComponent(activeBuffer.garden)}`;
      const newHash = `#${encodeURI(activeBuffer.path)}`;
      const newUrl = `${newPathname}${newHash}`;

      if (window.location.pathname !== newPathname || window.location.hash !== newHash) {
          window.history.pushState(null, '', newUrl);
      }
  }

  async notifyFileUpdate(gardenName, filePath, sourcePaneId) {
    this.broadcastChannel.postMessage({
        type: 'file_updated',
        gardenName,
        filePath,
        sourcePaneId
    });

    for (const [paneId, pane] of this.panes.entries()) {
        if (paneId !== sourcePaneId && pane.editor.gitClient.gardenName === gardenName && pane.editor.filePath === filePath) {
            await pane.editor.forceReloadFile(filePath);
        }
    }
  }

  notifyFileRename({ oldPath, newPath, gardenName }) {
    this._performRenameUpdate(oldPath, newPath, gardenName);
    this.broadcastChannel.postMessage({
      type: 'file_renamed',
      oldPath,
      newPath,
      gardenName
    });
  }

  _performRenameUpdate(oldPath, newPath, gardenName) {
    let activePaneWasUpdated = false;

    const updateTree = (node) => {
      if (node.type === 'leaf') {
        node.buffers.forEach(buffer => {
          if (buffer.garden === gardenName && buffer.path === oldPath) {
            buffer.path = newPath;
          }
        });
      } else if (node.type.startsWith('split-')) {
        node.children.forEach(updateTree);
      }
    };
    updateTree(this.paneTree);

    this.panes.forEach(pane => {
      const editor = pane.editor;
      if (editor.gitClient.gardenName === gardenName && editor.filePath === oldPath) {
        editor.filePath = newPath;
        editor.refreshStatusBar(); // Explicitly update the status bar
        if (editor.paneId === this.activePaneId) {
          activePaneWasUpdated = true;
        }
      }
    });

    if (activePaneWasUpdated) {
      this._updateURL();
    }
    
    window.thoughtform.sidebar?.refresh();
    this._stateManager.saveState();
  }

  async handleBroadcastMessage(event) {
    const { type, gardenName, filePath, sourcePaneId, oldPath, newPath } = event.data;
    if (type === 'file_updated') {
        for (const [, pane] of this.panes.entries()) {
            if (pane.editor.gitClient.gardenName === gardenName && pane.editor.filePath === filePath) {
                await pane.editor.forceReloadFile(filePath);
            }
        }
    } else if (type === 'file_renamed') {
        this._performRenameUpdate(oldPath, newPath, gardenName);
    }
  }

  getActiveEditor() {
    const pane = this.panes.get(this.activePaneId);
    return pane ? pane.editor : null;
  }

  async getActiveGitClient() {
    const info = this._paneManager.getActivePaneInfo();
    if (!info) return this.initialGitClient;
    const activeBuffer = info.node.buffers[info.node.activeBufferIndex];
    return await this.getGitClient(activeBuffer.garden);
  }
  
  // Delegated Public API
  render() { return this._renderer.render(); }
  splitPane(paneId, direction) { return this._paneManager.splitPane(paneId, direction); }
  closeActivePane() { return this._paneManager.closeActivePane(); }
  selectNextPane() { return this._paneManager.selectNextPane(); }
  selectPrevPane() { return this._paneManager.selectPrevPane(); }
  movePaneUp() { return this._paneManager.movePaneUp(); }
  movePaneDown() { return this._paneManager.movePaneDown(); }
  toggleMaximizePane() { return this._paneManager.toggleMaximizePane(); }
  _saveStateToSession() { return this._stateManager.saveState(); }
}

export function initializeWorkspaceManager(initialGitClient) {
  return new WorkspaceManager(initialGitClient);
}