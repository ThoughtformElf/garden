// src/editor/editor.js
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, highlightActiveLine } from '@codemirror/view';
import { EditorState, Compartment, Annotation } from '@codemirror/state';
import { history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { vim, Vim } from '@replit/codemirror-vim';
import { lineNumbersRelative } from '@uiw/codemirror-extensions-line-numbers-relative';
import debounce from 'lodash/debounce';
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';

import { Sidebar } from '../sidebar/sidebar.js';
import { basicDark } from '../util/theme.js';
import { initializeDragAndDrop } from '../util/drag-drop.js';
import { allHighlightPlugins } from './plugins/index.js';
import { getLanguageExtension } from './languages.js';
import { diffCompartment, createDiffExtension } from './diff.js';
import { tokenCounterCompartment, createTokenCounterExtension } from './token-counter.js';
import { appContextField, linkNavigationKeymap } from './navigation.js';
import { aiChatKeymap } from './keymaps/ai.js';
import { promptInsertionKeymap } from './keymaps/prompt.js';

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

    this.languageCompartment = new Compartment();
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
    
    Vim.map('jj', '<Esc>', 'insert');

    // --- ALL CUSTOM KEYMAPS ARE DEFINED AND ORDERED HERE ---

    const browserNavigationKeymap = keymap.of([
      { key: 'Alt-ArrowLeft', run: () => { window.history.back(); return true; } },
      { key: 'Alt-ArrowRight', run: () => { window.history.forward(); return true; } },
    ]);

    const globalShortcutsKeymap = keymap.of([
      { key: 'Mod-p', run: () => { window.thoughtform.commandPalette.open('search'); return true; }, shift: () => { window.thoughtform.commandPalette.open('execute'); return true; } },
      { key: 'Mod-[', run: () => { window.thoughtform.ui.toggleSidebar?.(); return true; } },
      { key: 'Mod-`', run: () => { window.thoughtform.ui.toggleDevtools?.(null, null); return true; } },
    ]);

    this.editorView = new EditorView({
      doc: initialContent,
      extensions: [
        appContextField.init(() => ({
          gitClient: this.gitClient,
          sidebar: this.sidebar,
        })),

        // 1. HIGHEST PRIORITY: App/Browser-level overrides that must always win.
        globalShortcutsKeymap,
        browserNavigationKeymap,
        
        // 2. CONTEXT-SPECIFIC: Editor actions that have specific contexts.
        aiChatKeymap,
        linkNavigationKeymap,
        promptInsertionKeymap, // THIS IS THE FIX: Added the new keymap here.
        keymap.of([indentWithTab]),
        
        // 3. THE VIM EXTENSION: This now has a clean environment to manage its state.
        vim(),
        
        // 4. REPLACEMENT FOR `basicSetup` (omitting the conflicting `defaultKeymap`).
        //    This provides all the standard editor UI and features.
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
            ...closeBracketsKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...completionKeymap,
            ...lintKeymap
        ]),

        // 5. YOUR CUSTOM PLUGINS AND THEME:
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
      parent: this.mainContainer,
    });
    
    Editor.editors.push(this);
    this.isReady = true;
    this.listenForNavigation();
    this.loadFile(this.filePath);
    this.editorView.focus();
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