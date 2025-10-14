// src/editor/editor.js
import { EditorView } from '@codemirror/view';
import { EditorState, Compartment, Annotation } from '@codemirror/state';
import { vim, Vim } from '@replit/codemirror-vim';
import debounce from 'lodash/debounce';

import { Sidebar } from '../sidebar/sidebar.js';
import { initializeDragAndDrop } from '../util/drag-drop.js';
import { getLanguageExtension } from './languages.js';
import { diffCompartment, createDiffExtension } from './diff.js';
import { statusBarCompartment, createStatusBarExtension } from './status-bar.js';
import { appContextField, findFileCaseInsensitive } from './navigation.js';
import { KeymapService } from '../workspace/keymaps.js';
import { Modal } from '../util/modal.js';
import { createEditorExtensions } from './extensions.js';

const programmaticChange = Annotation.define();

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

    this.debouncedHandleUpdate = debounce(this.handleUpdate.bind(this), 500);
    
    this.init();
  }

  async init() {
    if (!this.targetElement) {
      console.error(`Target container not found or provided.`);
      return;
    }

    // Only the first editor initializes the sidebar.
    if (!document.querySelector('#sidebar').hasChildNodes()) {
      await this.gitClient.initRepo();
      this.sidebar = new Sidebar({
        target: '#sidebar',
        gitClient: this.gitClient,
        editor: this // Pass self for context
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

    let initialContent = await this.loadFileContent(this.filePath);

    this.mediaViewerElement = document.createElement('div');
    this.mediaViewerElement.className = 'media-viewer-container';
    this.targetElement.appendChild(this.mediaViewerElement);

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
    
    // THIS IS THE FIX (Part 1):
    // The focus command is removed from here. The WorkspaceManager is now the
    // single source of truth for which pane should be focused.
    // this.editorView.focus(); 
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

  async loadFileContent(filepath) {
    try {
      const rawContent = await this.gitClient.readFile(filepath);
      return rawContent;
    } catch (e) {
      if (e.message && e.message.includes('does not exist')) {
        // This is the expected case for a new file. Do nothing, just return the placeholder.
      } else {
        console.warn(`An unexpected error occurred while reading ${filepath}:`, e);
      }
      return `// "${filepath.substring(1)}" does not exist. Start typing to create it.`;
    }
  }
  
  async showDiff(originalContent) {
    if (originalContent === null) {
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
    const videoExtensions = ['mp4', 'webm', 'mov', 'ogg'];
    const audioExtensions = ['mp3', 'wav', 'flac'];
    const mediaExtensions = [...imageExtensions, ...videoExtensions, ...audioExtensions];
    const extension = filepath.split('.').pop()?.toLowerCase();

    if (mediaExtensions.includes(extension)) {
      this.hideDiff();
      this.targetElement.classList.remove('is-editor');
      this.targetElement.classList.add('is-media-preview');
      this.mediaViewerElement.innerHTML = '<p>Loading media...</p>';

      const buffer = await this.gitClient.readFileAsBuffer(filepath);
      if (buffer) {
        const mimeTypeMap = {
          'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif',
          'svg': 'image/svg+xml', 'webp': 'image/webp', 'avif': 'image/avif',
          'mp4': 'video/mp4', 'webm': 'video/webm', 'mov': 'video/quicktime', 'ogg': 'video/ogg',
          'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'flac': 'audio/flac',
        };
        const mimeType = mimeTypeMap[extension] || 'application/octet-stream';
        const blob = new Blob([buffer], { type: mimeType });
        
        if (this.currentMediaObjectUrl) URL.revokeObjectURL(this.currentMediaObjectUrl);
        
        this.currentMediaObjectUrl = URL.createObjectURL(blob);

        let mediaElementHTML = '';
        if (imageExtensions.includes(extension)) {
          mediaElementHTML = `<img src="${this.currentMediaObjectUrl}" alt="${filepath}" />`;
        } else if (videoExtensions.includes(extension)) {
          mediaElementHTML = `<video src="${this.currentMediaObjectUrl}" controls></video>`;
        } else if (audioExtensions.includes(extension)) {
          mediaElementHTML = `<audio src="${this.currentMediaObjectUrl}" controls></audio>`;
        }
        this.mediaViewerElement.innerHTML = mediaElementHTML;
        const mediaElement = this.mediaViewerElement.querySelector('video, audio');
        if (mediaElement) mediaElement.load();
      } else {
        this.mediaViewerElement.innerHTML = `<p class="error">Could not load media: ${filepath}</p>`;
      }
      this.filePath = filepath;
      if (this.sidebar) await this.sidebar.refresh();
      await this._applyUserSettings();
      return;
    }

    this.targetElement.classList.remove('is-media-preview');
    this.targetElement.classList.add('is-editor');

    if (this.currentMediaObjectUrl) {
      URL.revokeObjectURL(this.currentMediaObjectUrl);
      this.currentMediaObjectUrl = null;
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

    if (this.sidebar) await this.sidebar.refresh();
    await this._applyUserSettings();
  }
  
  /**
   * Reloads the content of a file from the backend into the editor
   * while preserving the user's cursor position and scroll state.
   * @param {string} filepath - The path of the file to reload.
   */
  async forceReloadFile(filepath) {
    if (this.filePath !== filepath || !this.editorView) {
        // If the file to reload isn't the one currently open, or the editor isn't ready,
        // use the standard loadFile method which handles all cases.
        await this.loadFile(filepath);
        return;
    }

    // 1. Capture the current editor state (selection and scroll).
    const oldSelection = this.editorView.state.selection;
    const oldScrollTop = this.editorView.scrollDOM.scrollTop;

    // 2. Fetch the latest content from the filesystem.
    const newContent = await this.loadFileContent(filepath);
    const currentDoc = this.editorView.state.doc;

    // 3. If the content is identical, do nothing to prevent unnecessary updates and screen flicker.
    if (newContent === currentDoc.toString()) {
        return;
    }

    // 4. Create a single transaction that both replaces the content and restores the selection.
    // This is more efficient than two separate transactions.
    const newDocLength = newContent.length;
    const transactionSpec = {
        changes: { from: 0, to: currentDoc.length, insert: newContent },
        annotations: programmaticChange.of(true),
        selection: {
            // Ensure the restored cursor position is not out of bounds in the new content.
            anchor: Math.min(oldSelection.main.anchor, newDocLength),
            head: Math.min(oldSelection.main.head, newDocLength),
        }
    };

    // 5. Dispatch the combined transaction.
    this.editorView.dispatch(transactionSpec);

    // 6. Restore the scroll position. We use requestAnimationFrame to ensure this
    // runs *after* the browser has painted the DOM changes from the transaction.
    requestAnimationFrame(() => {
        if (this.editorView && this.editorView.scrollDOM) {
            this.editorView.scrollDOM.scrollTop = oldScrollTop;
        }
    });
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
          window.thoughtform.events.publish('file:create', { path: newPath, gardenName: this.gitClient.gardenName });
          window.thoughtform.workspace.openFile(this.gitClient.gardenName, newPath);
      } catch (writeError) {
          console.error('Error creating file:', writeError);
          await this.sidebar.showAlert({ title: 'Error', message: `Could not create file: ${writeError.message}` });
      }
    } finally {
      // this.editorView.focus(); // Don't focus here, let the workspace manager do it.
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
        // this.editorView.focus(); // Don't focus here
    }
  }

  async handleUpdate(newContent) {
    if (!this.isReady) return;
    await this.gitClient.writeFile(this.filePath, newContent);
    // After writing, notify the workspace manager to update other contexts.
    window.thoughtform.workspace.notifyFileUpdate(this.gitClient.gardenName, this.filePath, this.paneId);
    if (this.sidebar) await this.sidebar.refresh();
  }

  getFilePath(hash) {
    let filepath = hash.startsWith('#') ? hash.substring(1) : hash;
    filepath = decodeURIComponent(filepath);
    if (!filepath) filepath = 'home';
    return filepath;
  }
}