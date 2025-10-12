// src/editor/editor.js
import { EditorView } from '@codemirror/view';
import { EditorState, Compartment, Annotation } from '@codemirror/state';
import { vim, Vim } from '@replit/codemirror-vim';
import debounce from 'lodash/debounce';

import { Sidebar } from '../sidebar/sidebar.js';
import { initializeDragAndDrop } from '../util/drag-drop.js';
import { getLanguageExtension } from './languages.js';
import { diffCompartment, createDiffExtension } from './diff.js';
import { tokenCounterCompartment, createTokenCounterExtension } from './token-counter.js';
import { appContextField, findFileCaseInsensitive } from './navigation.js';
import { KeymapService } from '../keymaps.js';
import { Modal } from '../util/modal.js';
import { createEditorExtensions } from './extensions.js';

const programmaticChange = Annotation.define();

export class Editor {
  static editors = [];

  constructor({ url, target = 'body main', editorConfig = {}, gitClient, commandPalette }) {
    if (!gitClient) throw new Error('Editor requires a gitClient instance.');
    if (!commandPalette) throw new Error('Editor requires a commandPalette instance.');

    if (!window.location.hash) {
      window.location.hash = '#home';
    }
    
    this.targetSelector = target;
    this.url = url || window.location.hash;
    this.editorConfig = editorConfig;
    this.gitClient = gitClient;
    this.commandPalette = commandPalette;
    
    this.editorView = null;
    this.sidebar = null;
    this.filePath = this.getFilePath(this.url);
    this.isReady = false;
    this.mainContainer = null;
    this.keymapService = null;

    this.languageCompartment = new Compartment();
    this.vimCompartment = new Compartment();
    this.tokenCounterCompartment = new Compartment();
    this.imageViewerElement = null;
    this.currentObjectUrl = null;

    this.debouncedHandleUpdate = debounce(this.handleUpdate.bind(this), 500);
    
    this.init();
  }

  async init() {
    this.mainContainer = document.querySelector(this.targetSelector);
    if (!this.mainContainer) {
      console.error(`Target container not found: ${this.targetSelector}`);
      return;
    }

    await this.gitClient.initRepo();

    this.sidebar = new Sidebar({
      target: '#sidebar',
      gitClient: this.gitClient,
      editor: this
    });
    await this.sidebar.init();
    
    initializeDragAndDrop(this.gitClient, this.sidebar);
    
    const initialContent = await this.loadFileContent(this.filePath);

    const loadingIndicator = document.getElementById('loading-indicator');
    if(loadingIndicator) loadingIndicator.remove();
    this.mainContainer.style.display = 'flex';

    this.imageViewerElement = document.createElement('div');
    this.imageViewerElement.className = 'image-viewer-container';
    this.mainContainer.appendChild(this.imageViewerElement);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !update.transactions.some(t => t.annotation(programmaticChange))) {
        this.debouncedHandleUpdate(update.state.doc.toString());
      }
    });
    
    const tempState = EditorState.create({ doc: initialContent });
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
      tokenCounterCompartment: this.tokenCounterCompartment,
      updateListener,
      filePath: this.filePath,
      getLanguageExtension,
      createTokenCounterExtension,
      ...(this.editorConfig.extensions || []),
    });

    this.editorView = new EditorView({
      doc: initialContent,
      extensions: extensions,
      parent: this.mainContainer,
    });
    
    this.keymapService.editorView = this.editorView;
    tempView.destroy();

    Editor.editors.push(this);
    this.isReady = true;
    this.listenForNavigation();
    this.loadFile(this.filePath);
    this.editorView.focus();

    this._applyUserSettings();
  }

  async _applyUserSettings() {
    const { value: editingMode } = await window.thoughtform.config.get('interface.yml', 'editingMode');
    if (editingMode === 'vim') {
      Vim.map('jj', '<Esc>', 'insert');
      this.editorView.dispatch({
        effects: this.vimCompartment.reconfigure(vim())
      });
    }

    await this.keymapService.updateKeymaps();
  }

  async navigateTo(linkContent) {
    if (!linkContent) return;
  
    let path = linkContent.split('|')[0].trim();
    let garden = null;
  
    if (path.includes('#')) {
      [garden, path] = path.split('#');
    }
  
    const appContext = { gitClient: this.gitClient, sidebar: this.sidebar };

    if (garden) {
      if (!path.startsWith('/')) {
          path = `/${path}`;
      }
      const fullPathUrl = new URL(import.meta.url).pathname;
      const srcIndex = fullPathUrl.lastIndexOf('/src/');
      const basePath = srcIndex > -1 ? fullPathUrl.substring(0, srcIndex) : '';
      window.location.href = `${window.location.origin}${basePath}/${encodeURIComponent(garden)}#${encodeURIComponent(path)}`;
    } else {
      const foundPath = await findFileCaseInsensitive(path, appContext);
      let finalPath;
  
      if (foundPath) {
        finalPath = foundPath;
      } else {
        finalPath = path.startsWith('/') ? path : `/${path}`;
      }
      window.location.hash = `#${encodeURIComponent(finalPath)}`;
    }
  }

  async loadFileContent(filepath) {
    try {
      const rawContent = await this.gitClient.readFile(filepath);
      return rawContent;
    } catch (e) {
      console.warn(`Could not read file ${filepath}, starting with empty content.`, e);
      return '';
    }
  }
  
  async showDiff(originalContent) {
    if (originalContent === null) {
      console.error("Cannot show diff, original content is null.");
      this.hideDiff();
      return;
    }
    const diffExt = createDiffExtension(originalContent);
    this.editorView.dispatch({
      effects: diffCompartment.reconfigure(diffExt)
    });
  }

  hideDiff() {
    this.editorView.dispatch({
      effects: diffCompartment.reconfigure([])
    });
  }

  listenForNavigation() {
    window.addEventListener('hashchange', async () => {
      this.hideDiff();
      const newFilePath = this.getFilePath(window.location.hash);
      if (newFilePath && this.filePath !== newFilePath) {
        await this.loadFile(newFilePath);
      }
    });
  }

  async previewHistoricalFile(filepath, oid, parentOid) {
    const [currentContent, parentContent] = await Promise.all([
      this.gitClient.readBlobFromCommit(oid, filepath),
      this.gitClient.readBlobFromCommit(parentOid, filepath)
    ]);

    if (currentContent === null || parentContent === null) {
        await this.sidebar.showAlert({ title: "Error", message: "Could not load historical diff for this file."});
        return;
    }
    
    this.editorView.dispatch({
        changes: { from: 0, to: this.editorView.state.doc.length, insert: currentContent },
        annotations: programmaticChange.of(true),
    });
    this.showDiff(parentContent);
  }

  async loadFile(filepath) {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif'];
    const extension = filepath.split('.').pop()?.toLowerCase();

    if (imageExtensions.includes(extension)) {
      this.hideDiff();

      this.mainContainer.classList.remove('is-editor');
      this.mainContainer.classList.add('is-image-preview');
      this.imageViewerElement.innerHTML = '<p>Loading image...</p>';

      const buffer = await this.gitClient.readFileAsBuffer(filepath);
      if (buffer) {
        const mimeType = `image/${extension === 'svg' ? 'svg+xml' : extension}`;
        const blob = new Blob([buffer], { type: mimeType });
        
        if (this.currentObjectUrl) URL.revokeObjectURL(this.currentObjectUrl);
        
        this.currentObjectUrl = URL.createObjectURL(blob);
        this.imageViewerElement.innerHTML = `<img src="${this.currentObjectUrl}" alt="${filepath}" />`;
      } else {
        this.imageViewerElement.innerHTML = `<p class="error">Could not load image: ${filepath}</p>`;
      }

      this.filePath = filepath;
      if (this.sidebar) {
        await this.sidebar.refresh();
      }
      return;
    }

    this.mainContainer.classList.remove('is-image-preview');
    this.mainContainer.classList.add('is-editor');

    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
    
    this.hideDiff();
    const newContent = await this.loadFileContent(filepath);
    this.filePath = filepath;

    const newLanguage = getLanguageExtension(filepath);
    this.editorView.dispatch({
      effects: this.languageCompartment.reconfigure(newLanguage)
    });
    
    const currentDoc = this.editorView.state.doc;
    this.editorView.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: newContent },
      annotations: programmaticChange.of(true),
    });

    if (this.sidebar) {
      await this.sidebar.refresh();
    }
    this.editorView.focus();
  }
  
  async forceReloadFile(filepath) {
      await this.loadFile(filepath);
  }
  
  async newFile() {
    try {
      const newName = await Modal.prompt({
        title: 'New File',
        label: 'Enter new file name (including folders, e.g., "projects/new-idea"):',
      });
      if (!newName || !newName.trim()) {
        return;
      }
      const newPath = `/${newName.trim()}`;
      
      try {
        const stat = await this.gitClient.pfs.stat(newPath);
        const itemType = stat.isDirectory() ? 'folder' : 'file';
        await this.sidebar.showAlert({ title: 'Creation Failed', message: `A ${itemType} named "${newName}" already exists.` });
        return;
      } catch (e) {
        if (e.code !== 'ENOENT') {
          console.error('Error checking for file:', e);
          await this.sidebar.showAlert({ title: 'Error', message: 'An unexpected error occurred.' });
          return;
        }
      }

      try {
          await this.gitClient.writeFile(newPath, '');
          window.thoughtform.events.publish('file:create', { path: newPath });
          window.location.hash = `#${newPath}`;
      } catch (writeError) {
          console.error('Error creating file:', writeError);
          await this.sidebar.showAlert({ title: 'Error', message: `Could not create file: ${writeError.message}` });
      }
    } finally {
      this.editorView.focus();
    }
  }

  async duplicateFile(path) {
    if (!path) return;
    
    try {
        const stat = await this.gitClient.pfs.stat(path);
        if (stat.isDirectory()) {
            await this.sidebar.showAlert({ title: 'Action Not Supported', message: 'Duplicating folders is not yet supported.' });
            return;
        }
    
        const directory = path.substring(0, path.lastIndexOf('/'));
        const originalFilename = path.substring(path.lastIndexOf('/') + 1);
        const defaultName = `${originalFilename.split('.').slice(0, -1).join('.') || originalFilename} (copy)${originalFilename.includes('.') ? '.' + originalFilename.split('.').pop() : ''}`;
        
        const newFilename = await Modal.prompt({
            title: 'Duplicate File',
            label: 'Enter name for duplicated file:',
            defaultValue: defaultName
        });
        if (!newFilename) return;
    
        const newPath = `${directory}/${newFilename}`;
        try {
          const rawContent = await this.gitClient.readFile(path);
          await this.gitClient.writeFile(newPath, rawContent);
          await this.sidebar.refresh();
        } catch (e) {
          console.error('Error duplicating file:', e);
          await this.sidebar.showAlert({ title: 'Error', message: `Failed to duplicate file: ${e.message}` });
        }
    } finally {
        this.editorView.focus();
    }
  }

  async handleUpdate(newContent) {
    if (!this.isReady) return;
    if (this.filePath !== this.getFilePath(window.location.hash)) {
      return;
    }
    
    await this.gitClient.writeFile(this.filePath, newContent);
    
    if (this.sidebar) {
      await this.sidebar.refresh();
    }
  }

  getFilePath(hash) {
    let filepath = hash.startsWith('#') ? hash.substring(1) : hash;
    filepath = decodeURIComponent(filepath);
    if (!filepath) {
      filepath = 'home';
    }
    return filepath;
  }
}

window.Editor = Editor;