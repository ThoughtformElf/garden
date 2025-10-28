import { EditorView } from '@codemirror/view';
import { EditorState as CodeMirrorEditorState, Compartment, Annotation } from '@codemirror/state';
import { vim, Vim } from '@replit/codemirror-vim';
import debounce from 'lodash/debounce';
import { keymap } from '@codemirror/view';
import { history, defaultKeymap } from '@codemirror/commands';

import * as Y from 'yjs';
import { yCollab } from 'y-codemirror.next';

import { Sidebar } from '../sidebar/sidebar.js';
import { initializeDragAndDrop } from '../util/drag-drop.js';
import { getLanguageExtension } from './languages.js';
import { appContextField, findFileCaseInsensitive } from './navigation.js';
import { KeymapService } from '../workspace/keymaps.js';
import { createEditorExtensions } from './extensions.js';
import { statusBarPlugin } from './status-bar.js';

import { EditorFiles } from './files.js';
import { EditorGit } from './git.js';
import { EditorState } from './state.js';

export class Editor {
  static editors = [];

  constructor({ target, editorConfig = {}, gitClient, commandPalette, initialFile, paneId }) {
    if (!gitClient) throw new Error('Editor requires a gitClient instance.');
    if (!commandPalette) throw new Error('Editor requires a commandPalette instance.');

    this.targetElement = typeof target === 'string' ? document.querySelector(target) : target;
    this.editorConfig = editorConfig;
    this.gitClient = gitClient;
    this.commandPalette = commandPalette;
    this.paneId = paneId;
    
    this.editorView = null;
    this.sidebar = null;
    this.filePath = initialFile || '/home';
    this.isReady = false;
    this.keymapService = new KeymapService(this);
    this.aiOverrides = {};

    this.languageCompartment = new Compartment();
    this.vimCompartment = new Compartment();
    this.defaultKeymapCompartment = new Compartment();
    this.appContextCompartment = new Compartment();
    this.yjsCompartment = new Compartment();
    this.mediaViewerElement = null;
    this.currentMediaObjectUrl = null;
    
    this.programmaticChange = Annotation.define();

    this.yDoc = null;
    this.yUndoManager = null;
    this.isLiveSyncConnected = false;

    this._files = new EditorFiles(this);
    this._git = new EditorGit(this);
    this._state = new EditorState(this);

    this.debouncedHandleUpdate = debounce(this.handleUpdate.bind(this), 500);
    this.debouncedStateSave = debounce(() => {
        window.thoughtform.workspace?._saveStateToSession();
    }, 500);
    
    this.init();
  }

  async init() {
    if (!this.targetElement) {
      console.error(`Target container not found or provided.`);
      return;
    }

    if (!document.querySelector('#sidebar').hasChildNodes()) {
      await this.gitClient.initRepo();
      this.sidebar = new Sidebar({
        target: '#sidebar',
        gitClient: this.gitClient,
        editor: this
      });
      await this.sidebar.init();

      if (!window.thoughtform._dragDropInitialized) {
        initializeDragAndDrop(this.sidebar);
        window.thoughtform._dragDropInitialized = true;
      }
      
      const loadingIndicator = document.getElementById('loading-indicator');
      if(loadingIndicator) loadingIndicator.remove();
      document.querySelector('.main-content').style.display = 'flex';
    } else {
      this.sidebar = window.thoughtform.sidebar;
    }
    
    if (!window.thoughtform.sidebar) window.thoughtform.sidebar = this.sidebar;

    let initialContent = await this._files.loadFileContent(this.filePath);

    this.mediaViewerElement = document.createElement('div');
    this.mediaViewerElement.className = 'media-viewer-container';
    this.targetElement.appendChild(this.mediaViewerElement);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
          const isProgrammatic = update.transactions.some(t => t.annotation(this.programmaticChange));
          const isRemote = update.transactions.some(tr => tr.annotation('y-codemirror.next$remote'));
      }

      if (this.isLiveSyncConnected) {
        return;
      }
      
      if (update.docChanged && !update.transactions.some(t => t.annotation(this.programmaticChange))) {
        this.debouncedHandleUpdate(update.state.doc.toString());
      }
      if (update.selectionSet || update.viewportChanged) {
        this.debouncedStateSave();
      }
    });

    const extensions = createEditorExtensions({
      appContext: appContextField.init(() => ({
        gitClient: this.gitClient,
        sidebar: this.sidebar,
        editor: this,
      })),
      keymapCompartment: this.keymapService.keymapCompartment,
      vimCompartment: this.vimCompartment,
      defaultKeymapCompartment: this.defaultKeymapCompartment,
      languageCompartment: this.languageCompartment,
      appContextCompartment: this.appContextCompartment,
      yjsCompartment: this.yjsCompartment,
      updateListener,
      filePath: this.filePath,
      getLanguageExtension,
    });

    this.editorView = new EditorView({
      doc: initialContent,
      extensions: extensions,
      parent: this.targetElement,
    });
    
    Editor.editors.push(this);
    this.isReady = true;

    await this.loadFile(this.filePath);
  }

  connectLiveSync(yDoc, isHost) {
    console.log(`%c[LIVESYNC-LIFECYCLE] connectLiveSync CALLED for ${this.filePath}. Is Host: ${isHost}. Current connection state: ${this.isLiveSyncConnected}`, 'color: green; font-weight: bold;');
    if (this.isLiveSyncConnected) this.disconnectLiveSync();

    this.yDoc = yDoc;
    const ytext = this.yDoc.getText('codemirror');
    this.yUndoManager = new Y.UndoManager(ytext);
    
    const yCollabExtension = yCollab(ytext, null, { undoManager: this.yUndoManager });

    this.editorView.dispatch({
        effects: [
            this.yjsCompartment.reconfigure(yCollabExtension),
            this.defaultKeymapCompartment.reconfigure(keymap.of([]))
        ]
    });
    
    this.isLiveSyncConnected = true;
  }

  disconnectLiveSync() {
    if (!this.isLiveSyncConnected) return;

    if (this.editorView && !this.editorView.isDestroyed) {
        this.editorView.dispatch({
          effects: [
            this.yjsCompartment.reconfigure([]),
            this.defaultKeymapCompartment.reconfigure(keymap.of(defaultKeymap))
          ]
        });
    }
    
    this.yDoc = null;
    this.yUndoManager = null;
    this.isLiveSyncConnected = false;
  }

  destroy() {
    console.log(`%c[LIVESYNC-LIFECYCLE] editor.destroy() CALLED for ${this.filePath}`, 'color: red; font-weight: bold;');
    this.disconnectLiveSync();
    if (this.editorView) {
        this.editorView.destroy();
    }
    const index = Editor.editors.indexOf(this);
    if (index > -1) {
        Editor.editors.splice(index, 1);
    }
  }

  async _applyUserSettings() {
    const { value: editingMode } = await window.thoughtform.config.get('interface.yml', 'editingMode', this);
    
    if (editingMode === 'vim') {
      Vim.map('jj', '<Esc>', 'insert');
      this.editorView.dispatch({
        effects: [
          this.vimCompartment.reconfigure(vim()),
          this.defaultKeymapCompartment.reconfigure([])
        ]
      });
    } else if (!this.isLiveSyncConnected) {
       this.editorView.dispatch({
        effects: [
          this.vimCompartment.reconfigure([]),
          this.defaultKeymapCompartment.reconfigure(keymap.of(defaultKeymap))
        ]
      });
    }
    
    if (this.keymapService) {
      await this.keymapService.updateKeymaps();
    }
  }

  async navigateTo(linkContent) {
    if (!linkContent) return;
  
    let path = linkContent.split('|')[0].trim();
    let garden = null;
  
    if (path.includes('#')) {
      [garden, path] = path.split('#');
    }
  
    if (garden && garden !== this.gitClient.gardenName) {
      window.thoughtform.workspace.openFile(garden, path.startsWith('/') ? path : `/${path}`);
    } else {
      const currentGarden = this.gitClient.gardenName;
      const foundPath = await findFileCaseInsensitive(path, { gitClient: this.gitClient, sidebar: this.sidebar });
      let finalPath = foundPath || (path.startsWith('/') ? path : `/${path}`);
      window.thoughtform.workspace.openFile(currentGarden, finalPath);
    }
  }

  async handleUpdate(newContent) {
    if (!this.isReady || this.isLiveSyncConnected) return;

    let isCreation = false;
    try {
        await this.gitClient.pfs.stat(this.filePath);
    } catch (e) {
        if (e.code === 'ENOENT') {
            isCreation = true; // File doesn't exist yet, so this write is a creation.
        }
    }

    await this.gitClient.writeFile(this.filePath, newContent);

    const eventData = {
        gardenName: this.gitClient.gardenName,
        path: this.filePath,
        content: newContent
    };

    if (isCreation) {
        window.thoughtform.events.publish('file:create', eventData);
    } else {
        window.thoughtform.events.publish('file:update', eventData);
    }
    
    window.thoughtform.workspace.notifyFileUpdate(this.gitClient.gardenName, this.filePath, this.paneId);
    if (this.sidebar) await this.sidebar.refresh();

    const liveSync = window.thoughtform.sync.liveSync;
    if (isCreation && !this.isLiveSyncConnected && 
        (liveSync.state === 'host' || liveSync.state === 'active') &&
        liveSync.syncableGardens.includes(this.gitClient.gardenName)) {
        window.thoughtform.workspace.activateLiveSyncForCurrentFile();
    }
  }

  refreshStatusBar() {
    if (this.editorView) {
      const plugin = this.editorView.plugin(statusBarPlugin);
      if (plugin) {
        plugin.updateAll();
      }
    }
  }

  getFilePath(hash) { return this._files.getFilePath(hash); }
  loadFileContent(filepath) { return this._files.loadFileContent(filepath); }
  loadFile(filepath) { return this._files.loadFile(filepath); }
  forceReloadFile(filepath) { return this._files.forceReloadFile(filepath); }
  newFile() { return this._files.newFile(); }
  duplicateFile(path) { return this._files.duplicateFile(path); }
  showDiff(originalContent) { return this._git.showDiff(originalContent); }
  hideDiff() { return this._git.hideDiff(); }
  previewHistoricalFile(filepath, oid, parentOid) { return this._git.previewHistoricalFile(filepath, oid, parentOid); }
  getCurrentState() { return this._state.getCurrentState(); }
  restoreState(state) { return this._state.restoreState(state); }
}