// src/editor/editor.js
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment, Annotation } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { vim, Vim } from '@replit/codemirror-vim';
import { lineNumbersRelative } from '@uiw/codemirror-extensions-line-numbers-relative'; // Corrected import
import debounce from 'lodash/debounce'; // Corrected import

import { Sidebar } from '../sidebar/sidebar.js';
import { basicDark } from '../util/theme.js';
import { initializeDragAndDrop } from '../util/drag-drop.js';
import { allHighlightPlugins } from './plugins/index.js';
import { getLanguageExtension } from './languages.js';
import { diffCompartment, createDiffExtension } from './diff.js';
import { tokenCounterCompartment, createTokenCounterExtension } from './token-counter.js';
import { appContextField, linkNavigationKeymap } from './navigation.js';

const programmaticChange = Annotation.define();

export class Editor {
  static editors = [];

  constructor({ url, target = 'body main', editorConfig = {}, gitClient }) { // No more commandPalette
    if (!gitClient) throw new Error('Editor requires a gitClient instance.');
    if (!window.location.hash) {
      window.location.hash = '#README.md';
    }
    
    this.targetSelector = target;
    this.url = url || window.location.hash;
    this.editorConfig = editorConfig;
    this.gitClient = gitClient;
    
    this.editorView = null;
    this.sidebar = null;
    this.filePath = this.getFilePath(this.url);
    this.isReady = false;

    this.languageCompartment = new Compartment();
    this.tokenCounterCompartment = new Compartment();

    this.debouncedHandleUpdate = debounce(this.handleUpdate.bind(this), 500);
    
    this.init();
  }

  async init() {
    const container = document.querySelector(this.targetSelector);
    if (!container) {
      console.error(`Target container not found: ${this.targetSelector}`);
      return;
    }

    await this.gitClient.initRepo();

    this.sidebar = new Sidebar({
      target: '#sidebar', // Corrected selector
      gitClient: this.gitClient,
      editor: this
    });
    await this.sidebar.init();
    
    initializeDragAndDrop(this.gitClient, this.sidebar);
    
    const initialContent = await this.loadFileContent(this.filePath);

    const loadingIndicator = document.getElementById('loading-indicator');
    if(loadingIndicator) loadingIndicator.remove();
    container.style.display = 'flex';

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !update.transactions.some(t => t.annotation(programmaticChange))) {
        this.debouncedHandleUpdate(update.state.doc.toString());
      }
    });
    
    Vim.map('jj', '<Esc>', 'insert');

    this.editorView = new EditorView({
      doc: initialContent,
      extensions: [
        appContextField.init(() => ({
          gitClient: this.gitClient,
          sidebar: this.sidebar,
        })),
        linkNavigationKeymap,
        keymap.of([indentWithTab]),
        vim(),
        basicSetup,
        EditorView.lineWrapping,
        lineNumbersRelative,
        basicDark,
        this.languageCompartment.of(getLanguageExtension(this.filePath)),
        updateListener,
        ...allHighlightPlugins,
        diffCompartment.of([]),
        this.tokenCounterCompartment.of(createTokenCounterExtension()),
        ...(this.editorConfig.extensions || []),
      ],
      parent: container,
    });
    
    Editor.editors.push(this);
    this.isReady = true;
    this.listenForNavigation();
    this.editorView.focus();
  }

  async loadFileContent(filepath) {
    try {
      const rawContent = await this.gitClient.readFile(filepath);
      // Check if the content is a JSON object with our metadata structure
      try {
        const parsed = JSON.parse(rawContent);
        if (parsed && typeof parsed.content !== 'undefined') {
          return parsed.content;
        }
      } catch (e) {
        // Not a JSON file, treat as raw text content for backwards compatibility.
      }
      return rawContent; // Return raw content if not in new format
    } catch (e) {
      console.warn(`Could not read file ${filepath}, starting with empty content.`, e);
      return ''; // Return empty string if file doesn't exist
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
    // --- FIX: Prevent loading images directly into the editor ---
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif'];
    const extension = filepath.split('.').pop()?.toLowerCase();
    if (imageExtensions.includes(extension)) {
      console.warn(`Attempted to load image file "${filepath}" into the editor. Aborting.`);
      // Revert the URL hash to the last known good file to prevent a broken state
      window.location.hash = `#${encodeURIComponent(this.filePath)}`;
      await this.sidebar.showAlert({
        title: 'Cannot Open Image',
        message: 'Image files cannot be opened directly in the editor. You can embed them in other notes using ![[filename.png]].'
      });
      return;
    }
    
    console.log(`Loading ${filepath}...`);
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
      console.log(`forceReloadFile: Forcibly reloading ${filepath} from disk.`);
      const newContent = await this.loadFileContent(filepath);
      this.filePath = filepath;
      const currentDoc = this.editorView.state.doc;
      this.editorView.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: newContent },
          annotations: programmaticChange.of(true),
      });
      this.hideDiff();
  }

  async handleUpdate(newContent) {
    if (!this.isReady) return;
    if (this.filePath !== this.getFilePath(window.location.hash)) {
      console.log('In preview mode, not saving changes.');
      return;
    }
    
    const fileData = {
      content: newContent,
      lastModified: new Date().toISOString()
    };
    
    console.log(`Saving ${this.filePath}...`);
    await this.gitClient.writeFile(this.filePath, JSON.stringify(fileData, null, 2));
    
    if (this.sidebar) {
      await this.sidebar.refresh();
    }
  }

  getFilePath(hash) {
    let filepath = hash.startsWith('#') ? hash.substring(1) : hash;
    filepath = decodeURIComponent(filepath);
    if (!filepath) {
      filepath = 'README.md';
    }
    return filepath;
  }
}

window.Editor = Editor;