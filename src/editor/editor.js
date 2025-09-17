// src/editor/editor.js
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment, Annotation } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { vim, Vim } from '@replit/codemirror-vim';
import { lineNumbersRelative } from '@uiw/codemirror-extensions-line-numbers-relative';
import debounce from 'lodash/debounce';

import { Sidebar } from '../sidebar/sidebar.js';
import { basicDark } from '../util/theme.js';
import { initializeDragAndDrop } from '../util/drag-drop.js';

import { allHighlightPlugins } from './plugins/index.js';
import { getLanguageExtension } from './languages.js';
import { diffCompartment, createDiffExtension } from './diff.js';
import { tokenCounterCompartment, createTokenCounterExtension } from './token-counter.js';

// Create a unique annotation type to mark programmatic changes
const programmaticChange = Annotation.define();

export class Editor {
  static editors = [];

  constructor({ url, target = 'body > main', editorConfig = {}, gitClient } = {}) {
    if (!gitClient) throw new Error('Editor requires a gitClient instance.');
    if (!window.location.hash) window.location.hash = '#/README';

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
    this.sidebar = new Sidebar({ target: '#sidebar', gitClient: this.gitClient, editor: this });
    await this.sidebar.init();
    initializeDragAndDrop(this.gitClient, this.sidebar);

    const initialContent = await this.gitClient.readFile(this.filePath);
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) loadingIndicator.remove();
    container.style.display = 'flex';

    const updateListener = EditorView.updateListener.of(update => {
      if (update.docChanged && !update.transactions.some(t => t.annotation(programmaticChange))) {
        this.debouncedHandleUpdate(update.state.doc.toString());
      }
    });

    Vim.map('jj', '<Esc>', 'insert');

    this.editorView = new EditorView({
      doc: initialContent,
      extensions: [
        vim(),
        basicSetup,
        keymap.of([indentWithTab]),
        EditorView.lineWrapping,
        lineNumbersRelative,
        basicDark,
        this.languageCompartment.of(getLanguageExtension(this.filePath)),
        updateListener,
        ...allHighlightPlugins, // <-- All highlighters added here
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

  async showDiff(originalContent) {
    if (originalContent === null) {
      console.error('Cannot show diff, original content is null.');
      this.hideDiff();
      return;
    }
    const diffExt = createDiffExtension(originalContent);
    this.editorView.dispatch({ effects: diffCompartment.reconfigure(diffExt) });
  }

  hideDiff() {
    this.editorView.dispatch({ effects: diffCompartment.reconfigure([]) });
  }

  listenForNavigation() {
    window.addEventListener('hashchange', async () => {
      this.hideDiff();
      const newFilePath = this.getFilePath(window.location.hash);
      if (newFilePath !== this.filePath) await this.loadFile(newFilePath);
    });
  }

  async previewHistoricalFile(filepath, oid, parentOid) {
    const [currentContent, parentContent] = await Promise.all([
      this.gitClient.readBlobFromCommit(oid, filepath),
      this.gitClient.readBlobFromCommit(parentOid, filepath),
    ]);
    if (currentContent === null || parentContent === null) {
      await this.sidebar.showAlert({
          title: 'Error',
          message: 'Could not load historical diff for this file.'
      });
      return;
    }
    this.editorView.dispatch({
      changes: { from: 0, to: this.editorView.state.doc.length, insert: currentContent },
      annotations: programmaticChange.of(true),
    });
    this.showDiff(parentContent);
  }

  async loadFile(filepath) {
    console.log(`Loading ${filepath}...`);
    this.hideDiff();
    const newContent = await this.gitClient.readFile(filepath);
    this.filePath = filepath;
    const newLanguage = getLanguageExtension(filepath);
    this.editorView.dispatch({ effects: this.languageCompartment.reconfigure(newLanguage) });
    const currentDoc = this.editorView.state.doc;
    this.editorView.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: newContent },
      annotations: programmaticChange.of(true),
    });
    if (this.sidebar) await this.sidebar.refresh();
    this.editorView.focus();
  }

  async forceReloadFile(filepath) {
    console.log(`[forceReloadFile] Forcibly reloading ${filepath} from disk.`);
    const newContent = await this.gitClient.readFile(filepath);
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
    console.log(`Saving ${this.filePath}...`);
    await this.gitClient.writeFile(this.filePath, newContent);
    if (this.sidebar) await this.sidebar.refresh();
  }

  getFilePath(hash) {
    let filepath = hash.startsWith('#') ? hash.substring(1) : hash;
    filepath = decodeURIComponent(filepath);
    if (filepath === '/' || filepath === '') filepath = '/README';
    return filepath;
  }
}

window.Editor = Editor;
