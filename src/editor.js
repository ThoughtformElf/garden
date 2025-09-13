import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { vim, Vim } from '@replit/codemirror-vim';
import { LanguageDescription } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { yamlFrontmatter } from '@codemirror/lang-yaml';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import debounce from 'lodash/debounce';
import {amy} from 'thememirror';
import { gitClient } from './git-integration.js';
import { Sidebar } from './sidebar.js';

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
    // If no hash is present on load, redirect to the default file.
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

    // Wait for the repo to be cloned
    await gitClient.cloneRepo();

    // Initialize sidebar
    this.sidebar = new Sidebar({ target: '#sidebar' });
    await this.sidebar.init();
    
    const initialContent = await gitClient.readFile(this.filePath);

    // CodeMirror extensions
    const debouncedOnUpdate = debounce(this.handleUpdate.bind(this), 500);

    const updateListener = EditorView.updateListener.of(update => {
      if (update.docChanged) {
        debouncedOnUpdate(update.state.doc.toString());
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

    // Vim keybindings
    Vim.map('jj', '<Esc>', 'insert');

    // Markdown language support with embedded languages
    const markdownLang = markdown({
      codeLanguages: [
        LanguageDescription.of({ name: 'javascript', load: () => Promise.resolve(javascript()) }),
        LanguageDescription.of({ name: 'html', load: () => Promise.resolve(html()) }),
        LanguageDescription.of({ name: 'css', load: () => Promise.resolve(css()) })
      ]
    });

    const mainLanguage = yamlFrontmatter({ content: markdownLang });

    this.editorView = new EditorView({
      doc: initialContent,
      extensions: [
        vim(),
        basicSetup,
        mainLanguage,
        updateListener,
        amy,
        editorFontSize,
        ...this.editorConfig.extensions || []
      ],
      parent: container,
    });

    // Add this instance to the global list
    Editor.editors.push(this);
    this.isReady = true;

    // Listen for URL changes to load new files
    this.listenForNavigation();

    // Autofocus the editor on creation for immediate use.
    this.editorView.focus();
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
   * Loads a file into the editor, replacing its current content.
   * @param {string} filepath The path to the file to load.
   */
  async loadFile(filepath) {
    console.log(`Loading ${filepath}...`);
    const newContent = await gitClient.readFile(filepath);
    this.filePath = filepath;

    const currentDoc = this.editorView.state.doc;
    this.editorView.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: newContent }
    });
    this.editorView.focus();
  }

  /**
   * Handles saving the document content to the virtual file system.
   * @param {string} newContent The new document content.
   */
  async handleUpdate(newContent) {
    if (!this.isReady) return;
    console.log(`Saving ${this.filePath}...`);
    await gitClient.writeFile(this.filePath, newContent);
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
