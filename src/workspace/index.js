import { Git } from '../util/git-integration.js';
import { appContextField, findFileCaseInsensitive } from '../editor/navigation.js';
import { WorkspaceRenderer } from './renderer.js';
import { PaneManager } from './manager/pane.js';
import { WorkspaceStateManager } from './manager/state.js';
import { UrlManager } from './manager/url.js';
import { Editor } from '../editor/editor.js';

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
    this.isInitialized = false; 
    
    this.broadcastChannel = new BroadcastChannel('thoughtform_garden_sync');
    this.broadcastChannel.onmessage = this.handleBroadcastMessage.bind(this);
    
    window.thoughtform.events.subscribe('file:rename', (data) => this.notifyFileRename(data));
    
    this._renderer = new WorkspaceRenderer(this);
    this._paneManager = new PaneManager(this);
    this._stateManager = new WorkspaceStateManager(this);
    this._urlManager = new UrlManager();

    const savedState = this._stateManager.loadState();
    const isWindowed = this._urlManager.getSessionParams().has('windowed');

    if (isWindowed || !savedState || !savedState.paneTree || !savedState.activePaneId) {
        this.paneTree = this._createInitialPaneTree();
        this.activePaneId = 'pane-1';
        this.initialEditorStates = {};
        this._paneManager.isMaximized = false;
    } else {
        this.paneTree = savedState.paneTree;
        this.activePaneId = savedState.activePaneId;
        this.initialEditorStates = savedState.editorStates || {};
        this._paneManager.isMaximized = savedState.isMaximized || false;
    }
  }

  _createInitialPaneTree() {
    let initialPath = (window.location.hash || '#/home').substring(1);
    initialPath = initialPath.split('?')[0]; 
    return {
      type: 'leaf',
      id: 'pane-1',
      activeBufferIndex: 0,
      buffers: [ { garden: this.initialGitClient.gardenName, path: initialPath } ]
    };
  }
  
  updateSessionFromUrl() {
    this._urlManager.updateFromUrl();
  }

  activateLiveSyncForCurrentFile() {
      const editor = this.getActiveEditor();
      if (editor) {
          window.thoughtform.sync.liveSync.activateDocForEditor(editor);
      }
  }
  
  async hotReloadGarden(gardenName) {
      const liveSyncState = window.thoughtform.sync.liveSync.state;
      if (liveSyncState === 'bootstrapping' || liveSyncState === 'active') {
          console.log(`%c[LIVESYNC-GUARD] hotReloadGarden BLOCKED for garden "${gardenName}" to preserve active live sync session.`, 'color: orange; font-weight: bold;');
          return;
      }
      console.log(`%c[Workspace] hotReloadGarden TRIGGERED for "${gardenName}"`, 'color: red; font-weight: bold;');

      const newGitClient = new Git(gardenName);
      await newGitClient.initRepo();
      this.gitClients.set(gardenName, newGitClient);

      for (const [paneId, pane] of this.panes.entries()) {
          if (pane.editor && pane.editor.gitClient.gardenName === gardenName) {
              const targetElement = pane.element;
              const currentPath = pane.editor.filePath;

              // This now correctly calls the new method that handles cleanup.
              pane.editor.destroy();

              const newEditor = new Editor({
                  target: targetElement,
                  gitClient: newGitClient,
                  commandPalette: window.thoughtform.commandPalette,
                  initialFile: currentPath,
                  paneId: paneId
              });
              
              await new Promise(resolve => {
                  const check = setInterval(() => { if (newEditor.isReady) { clearInterval(check); resolve(); } }, 50);
              });
              
              this.panes.set(paneId, { element: targetElement, editor: newEditor });
          }
      }

      if (window.thoughtform.sidebar && window.thoughtform.sidebar.gitClient.gardenName === gardenName) {
          window.thoughtform.sidebar.gitClient = newGitClient;
          await window.thoughtform.sidebar.refresh();
      }
      
      window.thoughtform.events.publish('workspace:garden:reloaded', { gardenName });
      console.log(`[Workspace] Hot-reload complete for "${gardenName}".`);
  }

  async resetAndSwitchToHome() {
      this.gitClients.clear();
      const homeGitClient = await this.getGitClient('home');
      this.initialGitClient = homeGitClient;
      this.paneTree = this._createInitialPaneTree();
      this.activePaneId = 'pane-1';
      this.initialEditorStates = {};
      await this.render();
      await window.thoughtform.sidebar.refresh();
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
    if (this._paneManager.isMaximized && this.activePaneId !== paneId) this.toggleMaximizePane();
    if (!this.panes.has(paneId)) return;
    this.activePaneId = paneId;

    this.panes.forEach((pane, id) => {
      pane.element.classList.toggle('is-active-pane', id === paneId);
    });
    
    const activePane = this.panes.get(paneId);
    setTimeout(() => activePane?.editor?.editorView.focus(), 50);
    
    this._updateURL();
    window.thoughtform.sidebar?.refresh();
    this._stateManager.saveState();
  }

  async switchGarden(gardenName) {
    const editor = this.getActiveEditor();
    if (!editor || editor.gitClient.gardenName === gardenName) return;

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
    
    window.thoughtform.events.publish('workspace:garden:switched', { editor });
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

    if (editor.isLiveSyncConnected && editor.gitClient.gardenName === garden && editor.filePath === path) {
        console.log(`%c[LIVESYNC-GUARD] openFile BLOCKED for "${garden}#${path}" because it is already live.`, 'color: orange; font-weight: bold;');
        return;
    }

    const existingBufferIndex = node.buffers.findIndex(b => b.garden === garden && b.path === path);

    if (existingBufferIndex !== -1) node.activeBufferIndex = existingBufferIndex;
    else {
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
        window.thoughtform.events.publish('workspace:garden:switched', { editor });
    }

    await editor.loadFile(path);
    this.activateLiveSyncForCurrentFile();
    this.setActivePane(this.activePaneId);
  }

  async openInNewPane(linkContent, sourcePaneId) {
    if (!linkContent || !sourcePaneId) return;

    const sourceEditor = this.panes.get(sourcePaneId)?.editor;
    if (!sourceEditor) return;

    let path = linkContent.split('|')[0].trim();
    let garden = null;
  
    if (path.includes('#')) {
      [garden, path] = path.split('#');
    }

    let finalPath, finalGarden;

    if (garden && garden !== sourceEditor.gitClient.gardenName) {
        finalGarden = garden;
        const targetGitClient = await this.getGitClient(finalGarden);
        const foundPath = await findFileCaseInsensitive(path, { gitClient: targetGitClient, sidebar: window.thoughtform.sidebar });
        finalPath = foundPath || (path.startsWith('/') ? path : `/${path}`);
    } else {
        finalGarden = sourceEditor.gitClient.gardenName;
        const foundPath = await findFileCaseInsensitive(path, { gitClient: sourceEditor.gitClient, sidebar: window.thoughtform.sidebar });
        finalPath = foundPath || (path.startsWith('/') ? path : `/${path}`);
    }
    
    const sourcePane = this.panes.get(sourcePaneId);
    if (!sourcePane || !sourcePane.element) return;
    const paneElement = sourcePane.element;
    const direction = paneElement.offsetWidth > paneElement.offsetHeight ? 'vertical' : 'horizontal';

    await this.splitPane(sourcePaneId, direction, { garden: finalGarden, path: finalPath });
  }

  _updateURL() {
      if (!this.isInitialized) return;

      const info = this._paneManager.getActivePaneInfo();
      if (!info) return;
      const activeBuffer = info.node.buffers[info.node.activeBufferIndex];
      
      const fullUrl = this._urlManager.buildUrl(activeBuffer.garden, activeBuffer.path);
      const isWindowed = this._urlManager.getSessionParams().has('windowed');
      
      const currentFullUrl = window.location.pathname + window.location.hash;
      
      if (currentFullUrl !== fullUrl) {
          window.history.pushState(null, '', fullUrl);
          
          if (isWindowed) {
              window.parent.postMessage({ type: 'preview-url-changed', payload: { newUrl: window.location.href } }, '*');
          }
      }
  }

  async notifyFileUpdate(gardenName, filePath, sourcePaneId) {
    this.broadcastChannel.postMessage({ type: 'file_updated', gardenName, filePath, sourcePaneId });

    for (const [paneId, pane] of this.panes.entries()) {
        if (paneId !== sourcePaneId && pane.editor.gitClient.gardenName === gardenName && pane.editor.filePath === filePath) {
            await pane.editor.forceReloadFile(filePath);
        }
    }
  }

  notifyFileRename({ oldPath, newPath, gardenName }) {
    this._performRenameUpdate(oldPath, newPath, gardenName);
    this.broadcastChannel.postMessage({ type: 'file_renamed', oldPath, newPath, gardenName });
  }

  _performRenameUpdate(oldPath, newPath, gardenName) {
    let activePaneWasUpdated = false;

    const updateTree = (node) => {
      if (node.type === 'leaf') {
        node.buffers.forEach(buffer => {
          if (buffer.garden === gardenName && buffer.path === oldPath) buffer.path = newPath;
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
        editor.refreshStatusBar();
        if (editor.paneId === this.activePaneId) activePaneWasUpdated = true;
      }
    });

    if (activePaneWasUpdated) this._updateURL();
    
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
  
  buildUrl(garden, path, isForWindow = false) {
    return this._urlManager.buildUrl(garden, path, isForWindow);
  }
  
  render() { return this._renderer.render(); }
  updateLayout() { return this._renderer.updateLayout(); }
  splitPane(paneId, direction, fileToOpen = null) { return this._paneManager.splitPane(paneId, direction, fileToOpen); }
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