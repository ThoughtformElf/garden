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
import { gitClient } from './git-integration.js';
import { Sidebar } from './sidebar.js';
import { basicDark } from './theme.js';

// Define the shell language using the legacy stream parser
const shellLanguage = StreamLanguage.define(shell);

// Create a unique annotation type to mark programmatic changes
const programmaticChange = Annotation.define();

/**
 * @class Editor
 * @description Manages a single CodeMirror editor instance and its state.
 */
export class Editor {
  /**
   * A static list of all created editor instances.
   * @type {Editor[]}
   */
  static editors = [];

  /**
   * @param {Object} options Configuration object for the editor.
   * @param {string} [options.url=window.location.hash] The URL to determine the file path.
   * @param {string} [options.target='body > main'] A CSS selector for the container element.
   * @param {Object} [options.editorConfig] Custom CodeMirror configuration options.
   */
  constructor({ url, target = 'body > main', editorConfig = {} } = {}) {
    if (!window.location.hash) {
      window.location.hash = '#/README.md';
      return;
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

  /**
   * Initializes the editor by cloning the repo and creating the CodeMirror view.
   */
  async init() {
    const container = document.querySelector(this.targetSelector);
    if (!container) {
      console.error(`Target container not found: ${this.targetSelector}`);
      return;
    }

    // This is the long-running operation. The loading message will be displayed during this time.
    await gitClient.cloneRepo();

    // Now that the repo is ready, we can initialize the sidebar and prepare the editor.
    this.sidebar = new Sidebar({ target: '#sidebar' });
    await this.sidebar.init();
    
    const initialContent = await gitClient.readFile(this.filePath);

    // Remove the loading indicator now that we have content.
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.remove();
    }
    
    // Stop centering content now that the editor will be added.
    container.style.display = 'block';

    const updateListener = EditorView.updateListener.of(update => {
      // Only trigger a save if the document changed AND it was not a programmatic change.
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
        ...this.editorConfig.extensions || []
      ],
      parent: container,
    });

    Editor.editors.push(this);
    this.isReady = true;
    this.listenForNavigation();
    this.editorView.focus();
  }

  /**
   * Creates the markdown language configuration with support for fenced code blocks.
   */
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

  /**
   * Determines the CodeMirror language extension based on file extension.
   * @param {string} filepath The path to the file.
   * @returns {LanguageSupport} The CodeMirror language extension.
   */
  getLanguageExtension(filepath) {
    const filename = filepath.split('/').pop();
    const extension = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';
    // First, check for specific filenames that don't have standard extensions.
    switch (filename) {
      case '.gitignore':
      case '.npmrc':
      case '.editorconfig':
      case 'Dockerfile':
        return shellLanguage;
    }
    
    // Then, fall back to checking extensions.
    switch (extension) {
      case 'js':
        return javascript();
      case 'css':
        return css();
      case 'html':
        return html();
      case 'json':
        return json();
      case 'xml':
        return xml();
      case 'yaml':
      case 'yml':
        return yaml();
      case 'sh':
      case 'bash':
      case 'zsh':
        return shellLanguage;
      case 'md':
      default:
        return this.markdownLanguage;
    }
  }

  /**
   * Sets up an event listener for hash changes to enable client-side navigation.
   */
  listenForNavigation() {
    window.addEventListener('hashchange', async () => {
      const newFilePath = this.getFilePath(window.location.hash);
      if (newFilePath !== this.filePath) {
        await this.loadFile(newFilePath);
      }
    });
  }

  /**
   * Loads a file into the editor, replacing its content and updating the language.
   * @param {string} filepath The path to the file to load.
   */
  async loadFile(filepath) {
    console.log(`Loading ${filepath}...`);
    const newContent = await gitClient.readFile(filepath);
    this.filePath = filepath;
    const newLanguage = this.getLanguageExtension(filepath);
    this.editorView.dispatch({
      effects: this.languageCompartment.reconfigure(newLanguage)
    });
    const currentDoc = this.editorView.state.doc;
    this.editorView.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: newContent },
      // Annotate this transaction to mark it as a programmatic change.
      annotations: programmaticChange.of(true)
    });
    if (this.sidebar) {
      await this.sidebar.refresh();
    }
    this.editorView.focus();
  }

  /**
   * Handles saving the document content and refreshing the sidebar.
   * @param {string} newContent The new document content.
   */
  async handleUpdate(newContent) {
    if (!this.isReady) return;
    console.log(`Saving ${this.filePath}...`);
    await gitClient.writeFile(this.filePath, newContent);
    if (this.sidebar) {
      await this.sidebar.refresh();
    }
  }

  /**
   * Determines the correct file path from the given URL hash.
   * @param {string} hash The URL hash (e.g., #/path/to/file.md).
   * @returns {string} The final file path.
   */
  getFilePath(hash) {
    let filepath = hash.startsWith('#') ? hash.substring(1) : hash;
    if (filepath === '/' || filepath === '') {
      filepath = '/README.md';
    }
    return filepath;
  }
}

// Expose the Editor class globally for console access
window.Editor = Editor;
