import { EditorView } from '@codemirror/view';
import { EditorState as CodeMirrorEditorState, Compartment, Annotation } from '@codemirror/state';
import { vim, Vim } from '@replit/codemirror-vim';
import debounce from 'lodash/debounce';

import { Sidebar } from '../sidebar/sidebar.js';
import { initializeDragAndDrop } from '../util/drag-drop.js';
import { getLanguageExtension } from './languages.js';
import { appContextField, findFileCaseInsensitive } from './navigation.js';
import { KeymapService } from '../workspace/keymaps.js';
import { createEditorExtensions } from './extensions.js';
import { statusBarPlugin } from './status-bar.js';

// Import the new action handlers
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
    this.keymapService = null;

    this.languageCompartment = new Compartment();
    this.vimCompartment = new Compartment();
    this.appContextCompartment = new Compartment();
    this.mediaViewerElement = null;
    this.currentMediaObjectUrl = null;
    
    this.programmaticChange = Annotation.define();

    // Instantiate helper classes
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
      initializeDragAndDrop(this.gitClient, this.sidebar);
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
      if (update.docChanged && !update.transactions.some(t => t.annotation(this.programmaticChange))) {
        this.debouncedHandleUpdate(update.state.doc.toString());
      }
      if (update.selectionSet || update.viewportChanged) {
        this.debouncedStateSave();
      }
    });
    
    const tempState = CodeMirrorEditorState.create({ doc: initialContent });
    const tempView = new EditorView({ state: tempState });
    this.keymapService = new KeymapService(tempView);
    const dynamicKeymapExtension = this.keymapService.getCompartment();

    const extensions = createEditorExtensions({
      appContext: appContextField.init(() => ({
        gitClient: this.gitClient,
        sidebar: this.sidebar,
        editor: this,
      })),
      dynamicKeymapExtension,
      vimCompartment: this.vimCompartment,
      languageCompartment: this.languageCompartment,
      appContextCompartment: this.appContextCompartment,
      updateListener,
      filePath: this.filePath,
      getLanguageExtension,
    });

    this.editorView = new EditorView({
      doc: initialContent,
      extensions: extensions,
      parent: this.targetElement,
    });
    
    this.keymapService.editorView = this.editorView;
    tempView.destroy();

    Editor.editors.push(this);
    this.isReady = true;

    await this.loadFile(this.filePath);
  }

  async _applyUserSettings() {
    const { value: editingMode } = await window.thoughtform.config.get('interface.yml', 'editingMode', this);
    
    if (editingMode === 'vim') {
      Vim.map('jj', '<Esc>', 'insert');
      this.editorView.dispatch({
        effects: this.vimCompartment.reconfigure(vim())
      });
    } else {
       this.editorView.dispatch({
        effects: this.vimCompartment.reconfigure([])
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
    if (!this.isReady) return;
    await this.gitClient.writeFile(this.filePath, newContent);
    
    // THIS IS THE FIX: Publish an event for the global search index to consume
    window.thoughtform.events.publish('file:update', {
        gardenName: this.gitClient.gardenName,
        path: this.filePath,
        content: newContent
    });
    
    window.thoughtform.workspace.notifyFileUpdate(this.gitClient.gardenName, this.filePath, this.paneId);
    if (this.sidebar) await this.sidebar.refresh();
  }

  refreshStatusBar() {
    if (this.editorView) {
      const plugin = this.editorView.plugin(statusBarPlugin);
      if (plugin) {
        plugin.updateAll();
      }
    }
  }

  // --- API Methods (Delegating to helper classes) ---

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