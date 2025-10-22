import FlexSearch from 'flexsearch';
import { Git } from './git-integration.js';
import { executeFile } from '../workspace/executor.js';

// A set of common binary extensions to skip during indexing.
const binaryExtensions = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'avif', 'bmp', 'tiff',
  'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a',
  'mp4', 'webm', 'mov', 'mkv', 'avi', 'flv',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'zip', 'rar', '7z', 'tar', 'gz',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'db', 'sqlite', 'bin', 'exe', 'dll', 'iso'
]);

// Debounce function to limit how often search is called
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export class CommandPalette {
  constructor() {
    this.isOpen = false;
    this.query = '';
    this.results = [];
    this.selectedIndex = 0;
    this.mode = 'searchFiles'; // Default mode
    this.lastEditorState = null; // To store editor and selection for link insertion
    
    this.isIndexing = false;
    this.indexPromise = null;
    this.isIndexBuilt = false;

    // The new unified index for paths and content
    this.unifiedIndex = new FlexSearch.Document({
        document: {
            id: "id",
            index: ["pathSearch", "content"], // Index both a path string and the content
            store: ["garden", "path"]
        },
        tokenize: "forward"
    });

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleInput = debounce(this.handleInput.bind(this), 150);
    this.handleResultClick = this.handleResultClick.bind(this);
    this.close = this.close.bind(this);
    this.createDOMElements();
    this.listenForFileChanges();
  }
  
  createDOMElements() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'command-overlay hidden';
    this.overlay.addEventListener('click', this.close);

    this.container = document.createElement('div');
    this.container.className = 'command-container';
    this.container.addEventListener('click', e => e.stopPropagation());

    this.titleElement = document.createElement('div');
    this.titleElement.className = 'command-title';

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'command-input';
    this.input.addEventListener('input', this.handleInput);

    this.resultsList = document.createElement('ul');
    this.resultsList.className = 'command-results-list';
    this.resultsList.addEventListener('click', this.handleResultClick);

    this.container.appendChild(this.titleElement);
    this.container.appendChild(this.input);
    this.container.appendChild(this.resultsList);
    this.overlay.appendChild(this.container);
    document.body.appendChild(this.overlay);
  }

  listenForFileChanges() {
    if (window.thoughtform && window.thoughtform.events) {
        const updateIndex = (eventType, data) => {
            if (!this.isIndexBuilt || this.isIndexing) return;

            const extension = data.path.split('.').pop()?.toLowerCase();
            if (binaryExtensions.has(extension) && eventType !== 'file:delete') return;

            switch(eventType) {
                case 'file:create':
                    window.thoughtform.workspace.getGitClient(data.gardenName).then(git => {
                        git.readFile(data.path).then(content => {
                            const pathSearch = `${data.gardenName} ${data.path.substring(1)}`.toLowerCase();
                            this.unifiedIndex.add({ id: `${data.gardenName}#${data.path}`, garden: data.gardenName, path: data.path, pathSearch, content });
                        });
                    });
                    break;
                case 'file:update':
                    const pathSearch = `${data.gardenName} ${data.path.substring(1)}`.toLowerCase();
                    this.unifiedIndex.update({ id: `${data.gardenName}#${data.path}`, garden: data.gardenName, path: data.path, pathSearch, content: data.content });
                    break;
                case 'file:delete':
                    this.unifiedIndex.remove(`${data.gardenName}#${data.path}`);
                    break;
            }
        };

        window.thoughtform.events.subscribe('file:create', (data) => updateIndex('file:create', data));
        window.thoughtform.events.subscribe('file:update', (data) => updateIndex('file:update', data));
        window.thoughtform.events.subscribe('file:delete', (data) => updateIndex('file:delete', data));
    }
  }
  
  async _buildIndex() {
    try {
        this.isIndexing = true;
        this.input.placeholder = 'Indexing... please wait';
        this.resultsList.innerHTML = '<li class="command-no-results">Scanning gardens...</li>';

        const gardensRaw = localStorage.getItem('thoughtform_gardens');
        const gardens = gardensRaw ? JSON.parse(gardensRaw) : ['home'];
        let indexedCount = 0;
        
        for (const gardenName of gardens) {
            const tempGitClient = await window.thoughtform.workspace.getGitClient(gardenName);
            const allPaths = await window.thoughtform.sidebar.listAllPaths(tempGitClient, '/');
            
            for (const file of allPaths) {
                if (!file.isDirectory) {
                    const extension = file.path.split('.').pop()?.toLowerCase();
                    const pathSearch = `${gardenName} ${file.path.substring(1)}`.toLowerCase();

                    if (binaryExtensions.has(extension)) {
                        this.unifiedIndex.add({ id: `${gardenName}#${file.path}`, garden: gardenName, path: file.path, pathSearch, content: "" });
                        indexedCount++;
                        continue;
                    }

                    try {
                        const content = await tempGitClient.readFile(file.path);
                        if (typeof content === 'string') {
                            this.unifiedIndex.add({ id: `${gardenName}#${file.path}`, garden: gardenName, path: file.path, pathSearch, content });
                            indexedCount++;
                        }
                    } catch (e) { /* Silently fail on unreadable files */ }
                }
                if (indexedCount > 0 && indexedCount % 50 === 0) {
                 this.resultsList.innerHTML = `<li class="command-no-results">Indexing... (${indexedCount} files scanned)</li>`;
                 await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        }
        this.input.placeholder = `Search across ${this.unifiedIndex.size} documents...`;
        this.isIndexing = false;
        this.isIndexBuilt = true;
    } catch (error) {
        this.resultsList.innerHTML = `<li class="command-no-results" style="color: red;">Error during indexing.</li>`;
        this.isIndexing = false;
    }
  }

  async open(mode = 'searchFiles') {
    if (this.isOpen) return;
    this.isOpen = true;
    this.mode = mode;

    // Capture the editor state at the moment the palette is opened
    const activeEditor = window.thoughtform.workspace.getActiveEditor();
    if (activeEditor && activeEditor.editorView) {
        this.lastEditorState = {
            editor: activeEditor,
            selection: activeEditor.editorView.state.selection.main
        };
    } else {
        this.lastEditorState = null;
    }

    // Configure UI based on mode
    switch(this.mode) {
        case 'executeCommand':
            this.titleElement.textContent = 'Execute Command';
            this.input.placeholder = 'Find a .js file to execute...';
            break;
        case 'searchContent':
            this.titleElement.textContent = 'Global Content Search';
            this.input.placeholder = 'Search content across all gardens...';
            break;
        case 'searchFiles':
        default:
            this.titleElement.textContent = 'Search Files';
            this.input.placeholder = 'Find file across all gardens...';
            break;
    }

    this.overlay.classList.remove('hidden');
    this.input.focus();
    document.addEventListener('keydown', this.handleKeyDown);

    if (!this.isIndexBuilt && !this.indexPromise) {
        this.indexPromise = this._buildIndex().finally(() => {
            this.indexPromise = null;
            if (this.input.value) this.search(this.input.value);
        });
    } else if (this.isIndexBuilt) {
        this.input.placeholder = `Search across ${this.unifiedIndex.size} documents...`;
    }

    this.search('');
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.classList.add('hidden');
    this.input.value = '';
    this.query = '';
    this.results = [];
    this.selectedIndex = 0;
    this.lastEditorState = null; // Clear the saved editor state
    document.removeEventListener('keydown', this.handleKeyDown);
    const activeEditor = window.thoughtform.workspace.getActiveEditor();
    if (activeEditor && activeEditor.editorView) {
      activeEditor.editorView.focus();
    }
  }

  async search(query) {
    this.query = query.toLowerCase().trim();
    if (this.isIndexing) return;
    
    if (!this.isIndexBuilt) {
        this.resultsList.innerHTML = `<li class="command-no-results">Waiting for index...</li>`;
        return;
    }

    let searchConfig = { enrich: true, limit: 100 };
    let searchField = "pathSearch"; // Default for files and commands

    if (this.mode === 'searchContent') {
        searchField = "content";
        searchConfig.limit = 50;
    }
    
    let flatResults = [];
    if (this.query) {
        const searchResults = await this.unifiedIndex.searchAsync(this.query, { index: searchField, ...searchConfig });
        flatResults = searchResults[0]?.result || [];
    } else if (this.mode !== 'searchContent') {
        // For file/command search, show all if query is empty
        flatResults = this.unifiedIndex.search({ index: searchField, ...searchConfig })[0]?.result || [];
    }

    if (this.mode === 'executeCommand') {
        flatResults = flatResults.filter(item => item.doc.path.endsWith('.js'));
    }

    const activeGitClient = await window.thoughtform.workspace.getActiveGitClient();
    const currentGardenName = activeGitClient ? activeGitClient.gardenName : '';
    
    flatResults.sort((a, b) => {
        const aIsCurrent = a.doc.garden === currentGardenName;
        const bIsCurrent = b.doc.garden === currentGardenName;
        if (aIsCurrent && !bIsCurrent) return -1;
        if (!aIsCurrent && bIsCurrent) return 1;
        return a.doc.path.localeCompare(b.doc.path); // Alphabetical sort as fallback
    });

    this.results = flatResults;
    this.selectedIndex = 0;
    this.renderResults();
  }
  
  async getSnippet(gardenName, filePath) {
    try {
        const git = await window.thoughtform.workspace.getGitClient(gardenName);
        const content = await git.readFile(filePath);
        const lines = content.split('\n');
        const queryLower = this.query.toLowerCase();
        let bestLine = lines.find(line => line.toLowerCase().includes(queryLower));
        
        if (!bestLine) {
            bestLine = lines.find(line => line.trim() !== '') || "No content preview available.";
        }
        const regex = new RegExp(this.query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
        return bestLine.trim().replace(regex, '<mark>$&</mark>');
    } catch (e) {
        return "Could not load file preview.";
    }
  }

  async renderResults() {
    this.resultsList.innerHTML = '';
    if (this.results.length === 0) {
      this.resultsList.innerHTML = `<li class="command-no-results">${this.isIndexing ? 'Indexing...' : 'No matches found'}</li>`;
      return;
    }
    
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < this.results.length; index++) {
        const file = this.results[index].doc;
        const li = document.createElement('li');
        li.className = 'command-result-item';
        li.dataset.index = index;

        const pathText = file.path.startsWith('/') ? file.path.substring(1) : file.path;
        const gardenSpan = ` <span class="command-garden">[${file.garden}]</span>`;
        
        if (this.mode === 'searchContent') {
            const snippet = await this.getSnippet(file.garden, file.path);
            li.innerHTML = `
                <div class="command-path">${gardenSpan} ${pathText}</div>
                <div class="global-search-snippet">${snippet}</div>
            `;
        } else {
            li.innerHTML = `<div class="command-path">${gardenSpan} ${pathText}</div>`;
        }

        if (index === this.selectedIndex) {
            li.classList.add('active');
            li.scrollIntoView({ block: 'nearest' });
        }
        fragment.appendChild(li);
    }
    this.resultsList.appendChild(fragment);
  }

  async selectItem(index) {
    if (index < 0 || index >= this.results.length) return;
    const file = this.results[index].doc;
    
    if (this.mode === 'executeCommand') {
        const editor = window.thoughtform.workspace.getActiveEditor();
        const git = await window.thoughtform.workspace.getActiveGitClient();
        if (editor && git) {
            const fullPath = `${file.garden}#${file.path}`;
            executeFile(fullPath, editor, git);
        }
    } else {
        window.thoughtform.workspace.openFile(file.garden, file.path);
    }
    this.close();
  }

  async insertLink(index) {
    if (index < 0 || index >= this.results.length || !this.lastEditorState) return;

    const { editor, selection } = this.lastEditorState;
    if (!editor || !editor.editorView || editor.editorView.isDestroyed) return;

    const file = this.results[index].doc;
    const activeGarden = editor.gitClient.gardenName;
    
    const targetPath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
    let linkContent;
    if (file.garden === activeGarden) {
        linkContent = targetPath;
    } else {
        linkContent = `${file.garden}#${targetPath}`;
    }
    const linkText = `[[${linkContent}]]`;

    editor.editorView.dispatch({
        changes: { from: selection.from, to: selection.to, insert: linkText },
        selection: { anchor: selection.from + linkText.length }
    });
    
    this.close();
  }
  
  async openInNewPane(index) {
    if (index < 0 || index >= this.results.length || !this.lastEditorState) return;

    const { editor } = this.lastEditorState;
    if (!editor || !editor.paneId) {
        console.error('[CommandPalette] Cannot open in new pane, source editor or paneId not found.');
        return;
    }

    const file = this.results[index].doc;
    const sourceGarden = editor.gitClient.gardenName;
    
    const targetPath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
    let linkContent;
    if (file.garden === sourceGarden) {
        linkContent = targetPath;
    } else {
        linkContent = `${file.garden}#${targetPath}`;
    }

    window.thoughtform.workspace.openInNewPane(linkContent, editor.paneId);
    
    this.close();
  }

  handleInput(e) {
    this.search(e.target.value);
  }
  
  async handleResultClick(e) {
    const item = e.target.closest('.command-result-item');
    if (item) {
      await this.selectItem(parseInt(item.dataset.index, 10));
    }
  }

  async handleKeyDown(e) {
    if (!this.isOpen) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
        this.renderResults();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex - 1 + this.results.length) % this.results.length;
        this.renderResults();
        break;
      case 'Enter':
        e.preventDefault();
        if (this.results.length > 0) {
            if (e.shiftKey && (e.ctrlKey || e.metaKey) && this.mode !== 'executeCommand') {
                await this.openInNewPane(this.selectedIndex);
            } else if ((e.ctrlKey || e.metaKey) && this.mode !== 'executeCommand') {
                await this.insertLink(this.selectedIndex);
            } else {
                await this.selectItem(this.selectedIndex);
            }
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
    }
  }
}