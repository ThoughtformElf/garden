import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment, Annotation, RangeSetBuilder } from '@codemirror/state';
import { keymap, ViewPlugin, Decoration } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { vim, Vim } from '@replit/codemirror-vim';
import { lineNumbersRelative } from '@uiw/codemirror-extensions-line-numbers-relative';
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
import { Sidebar } from '../sidebar/sidebar.js';
import { basicDark } from '../util/theme.js';
import { diffCompartment, createDiffExtension } from './diff.js';
import { initializeDragAndDrop } from '../util/drag-drop.js';

// Define the shell language using the legacy stream parser
const shellLanguage = StreamLanguage.define(shell);

// Create a unique annotation type to mark programmatic changes
const programmaticChange = Annotation.define();

// --- START: STABLE HASHTAG HIGHLIGHTING ---

// Decoration to apply a simple CSS class.
const hashtagDecoration = Decoration.mark({ class: 'cm-hashtag' });

// This ViewPlugin is a simple scanner. It is stable and will not freeze the browser.
const hashtagPlugin = ViewPlugin.fromClass(
  class {
    decorations;

    constructor(view) {
      this.decorations = this.findHashtags(view);
    }

    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.findHashtags(update.view);
      }
    }

    findHashtags(view) {
      const builder = new RangeSetBuilder();
      // Use a very simple, fast regex to find all potential candidates.
      const hashtagRegex = /#[\w-]+/g;

      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        let match;

        while ((match = hashtagRegex.exec(text))) {
          const matchStart = from + match.index;
          const end = matchStart + match[0].length;
          const line = view.state.doc.lineAt(matchStart);

          // **RULE 1: Check for preceding characters.**
          // If the match is not at the very start of the line, check the character
          // immediately before it. If it's not whitespace, it's invalid (e.g., "word#tag").
          if (matchStart > line.from) {
            const charBefore = view.state.doc.sliceString(matchStart - 1, matchStart);
            if (/\s/.test(charBefore) === false) {
              continue; // Skip this invalid match.
            }
          }

          // **RULE 2: Check if inside a URL.**
          // This is a simple but effective check. We find all URLs on the line
          // and see if our hashtag falls within the character range of any URL.
          const urlRegex = /https?:\/\/[^\s]+/g;
          let urlMatch;
          let isInsideUrl = false;
          while ((urlMatch = urlRegex.exec(line.text))) {
            const urlStart = line.from + urlMatch.index;
            const urlEnd = urlStart + urlMatch[0].length;
            if (matchStart >= urlStart && end <= urlEnd) {
              isInsideUrl = true;
              break;
            }
          }
          if (isInsideUrl) {
            continue; // Skip this match.
          }
          
          // If all rules pass, apply the decoration.
          builder.add(matchStart, end, hashtagDecoration);
        }
      }
      return builder.finish();
    }
  },
  {
    decorations: v => v.decorations,
  }
);

// Theme defined directly in this file for maximum visibility and control.
const aggressiveTheme = EditorView.theme({
    '.cm-hashtag': {
        backgroundColor: '#FFFF00', // BRIGHT YELLOW
        color: '#000000 !important',      // Black text, forced
    }
});
// --- END: STABLE HASHTAG HIGHLIGHTING ---

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
    
    initializeDragAndDrop(this.gitClient, this.sidebar);
    
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
        keymap.of([indentWithTab]),
        EditorView.lineWrapping,
        lineNumbersRelative,
        this.languageCompartment.of(this.getLanguageExtension(this.filePath)),
        updateListener,
        basicDark,
        editorFontSize,
        hashtagPlugin,      // STABLE scanner plugin
        aggressiveTheme,    // BRIGHT YELLOW theme
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
    
    this.editorView.dispatch({
      changes: { from: 0, to: this.editorView.state.doc.length, insert: currentContent },
      annotations: programmaticChange.of(true)
    });
    
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
