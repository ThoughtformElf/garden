import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment, Annotation } from '@codemirror/state';
import { vim, Vim } from '@replit/codemirror-vim';
import { LanguageDescription, StreamLanguage } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import debounce from 'lodash/debounce';
import { Sidebar } from './sidebar.js';
import { basicDark } from './theme.js';
import { diffCompartment, createDiffExtension } from './editor-diff.js';

// Define the shell language using the legacy stream parser
const shellLanguage = StreamLanguage.define(shell);

// Create a unique annotation type to mark programmatic changes
const programmaticChange = Annotation.define();

export class Editor {
  static editors = [];

  constructor({ url, target = 'body > main', editorConfig = {}, gitClient } = {}) {
    if (!gitClient) {
      throw new Error('Editor requires a gitClient instance.');
    }
    this.gitClient = gitClient;

    if (!window.location.hash) {
      window.location.hash = '#/README';
    }
    
    this.targetSelector = target;
    this.url = url || window.location.hash;
    this.editorConfig = editorConfig;
    this.editorView = null;
    this.sidebar = null;
    this.filePath = this.getFilePath(this.url);
    this.isReady = false;
    this.languageCompartment = new Compartment();
    this.markdownLanguage = this.createMarkdownLanguage();
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
    
    const initialContent = await this.gitClient.readFile(this.filePath);
    
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.remove();
    }
    
    container.style.display = 'block';

    const updateListener = EditorView.updateListener.of(update => {
      if (update.docChanged && !update.transactions.some(t => t.annotation(programmaticChange))) {
        this.debouncedHandleUpdate(update.state.doc.toString());
      }
    });

    const createFontTheme = (size) => {
      return EditorView.theme({
        '&': { fontSize: size },
        '.cm-scroller': { fontFamily: 'monospace' }
      });
    };

    const isMobile = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const editorFontSize = isMobile ? createFontTheme('1.5rem') : createFontTheme('1rem');
    Vim.map('jj', '<Esc>', 'insert');

    this.editorView = new EditorView({
      doc: initialContent,
      extensions: [
        vim(),
        basicSetup,
        this.languageCompartment.of(this.getLanguageExtension(this.filePath)),
        updateListener,
        basicDark,
        editorFontSize,
        diffCompartment.of([]),
        ...(this.editorConfig.extensions || [])
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

  createMarkdownLanguage() {
    return markdown({
      base: markdownLanguage,
      codeLanguages: [
        LanguageDescription.of({ name: 'javascript', load: () => Promise.resolve(javascript()) }),
        LanguageDescription.of({ name: 'html', load: () => Promise.resolve(html()) }),
        LanguageDescription.of({ name: 'css', load: () => Promise.resolve(css()) })
      ]
    });
  }

  getLanguageExtension(filepath) {
    const filename = filepath.split('/').pop();
    const extension = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';
    
    switch (filename) {
      case '.gitignore': case '.npmrc': case '.editorconfig': case 'Dockerfile':
        return shellLanguage;
    }
    
    switch (extension) {
      case 'js': return javascript();
      case 'css': return css();
      case 'html': return html();
      case 'json': return json();
      case 'xml': return xml();
      case 'yaml': case 'yml': return yaml();
      case 'sh': case 'bash': case 'zsh': return shellLanguage;
      case 'md': default: return this.markdownLanguage;
    }
  }

  listenForNavigation() {
    window.addEventListener('hashchange', async () => {
      this.hideDiff();
      const newFilePath = this.getFilePath(window.location.hash);
      if (newFilePath !== this.filePath) {
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
      alert('Could not load historical diff for this file.');
      return;
    }
    
    // Temporarily update the editor's content for preview
    this.editorView.dispatch({
      changes: { from: 0, to: this.editorView.state.doc.length, insert: currentContent },
      annotations: programmaticChange.of(true)
    });
    
    // Show the diff against the parent commit's content
    this.showDiff(parentContent);
  }

  async loadFile(filepath) {
    console.log(`Loading ${filepath}...`);
    this.hideDiff();
    const newContent = await this.gitClient.readFile(filepath);
    this.filePath = filepath;
    
    const newLanguage = this.getLanguageExtension(filepath);
    this.editorView.dispatch({
      effects: this.languageCompartment.reconfigure(newLanguage)
    });
    
    const currentDoc = this.editorView.state.doc;
    this.editorView.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: newContent },
      annotations: programmaticChange.of(true)
    });

    if (this.sidebar) {
      await this.sidebar.refresh();
    }
    this.editorView.focus();
  }

  async forceReloadFile(filepath) {
    console.log(`[forceReloadFile] Forcibly reloading ${filepath} from disk.`);
    const newContent = await this.gitClient.readFile(filepath);
    this.filePath = filepath;

    const currentDoc = this.editorView.state.doc;
    this.editorView.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: newContent },
      annotations: programmaticChange.of(true)
    });
    
    this.hideDiff();
  }

  async handleUpdate(newContent) {
    if (!this.isReady) return;
    
    // Do not save changes if we are in a historical preview state
    if (this.filePath !== this.getFilePath(window.location.hash)) {
        console.log("In preview mode, not saving changes.");
        return;
    }

    console.log(`Saving ${this.filePath}...`);
    await this.gitClient.writeFile(this.filePath, newContent);
    if (this.sidebar) {
      await this.sidebar.refresh();
    }
  }

  getFilePath(hash) {
    let filepath = hash.startsWith('#') ? hash.substring(1) : hash;
    filepath = decodeURIComponent(filepath);
    if (filepath === '/' || filepath === '') {
      filepath = '/README';
    }
    return filepath;
  }
}

window.Editor = Editor;
