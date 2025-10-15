import FlexSearch from 'flexsearch';
import { Git } from './git-integration.js';

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

// A set of common binary extensions to skip during indexing.
const binaryExtensions = new Set([
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'avif', 'bmp', 'tiff',
  // Audio
  'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a',
  // Video
  'mp4', 'webm', 'mov', 'mkv', 'avi', 'flv',
  // Fonts
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  // Archives
  'zip', 'rar', '7z', 'tar', 'gz',
  // Documents
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  // Other
  'db', 'sqlite', 'bin', 'exe', 'dll', 'iso'
]);


export class GlobalSearch {
  constructor() {
    this.isOpen = false;
    this.query = '';
    this.results = [];
    this.selectedIndex = 0;
    this.isIndexing = false;
    this.indexPromise = null;
    this.isIndexBuilt = false; 

    // Initialize the FlexSearch index
    this.index = new FlexSearch.Document({
        document: {
            id: "id",
            index: "content",
            store: ["garden", "path"]
        },
        tokenize: "forward",
        context: true // Needed for searching within content
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
    this.overlay.className = 'command-overlay hidden'; // Reuse command palette styles
    this.overlay.addEventListener('click', this.close);

    this.container = document.createElement('div');
    this.container.className = 'command-container';
    this.container.addEventListener('click', e => e.stopPropagation());

    this.titleElement = document.createElement('div');
    this.titleElement.className = 'command-title';
    this.titleElement.textContent = 'Global Content Search';

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'command-input';
    this.input.placeholder = 'Search content across all gardens...';
    this.input.addEventListener('input', this.handleInput);

    this.resultsList = document.createElement('ul');
    this.resultsList.className = 'command-results-list global-search-results'; // Add a specific class
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
            if (binaryExtensions.has(extension)) return;

            switch(eventType) {
                case 'file:create':
                    window.thoughtform.workspace.getGitClient(data.gardenName).then(git => {
                        git.readFile(data.path).then(content => {
                            this.index.add({ id: `${data.gardenName}#${data.path}`, garden: data.gardenName, path: data.path, content });
                        });
                    });
                    break;
                case 'file:update':
                    this.index.update({ id: `${data.gardenName}#${data.path}`, garden: data.gardenName, path: data.path, content: data.content });
                    break;
                case 'file:delete':
                    this.index.remove(`${data.gardenName}#${data.path}`);
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
        let processedCount = 0;
        
        for (const gardenName of gardens) {
            const tempGitClient = await window.thoughtform.workspace.getGitClient(gardenName);
            const allPaths = await window.thoughtform.sidebar.listAllPaths(tempGitClient, '/');
            
            for (const file of allPaths) {
                processedCount++;
                if (!file.isDirectory) {
                    const extension = file.path.split('.').pop()?.toLowerCase();
                    if (binaryExtensions.has(extension)) {
                        continue;
                    }

                    try {
                        const content = await tempGitClient.readFile(file.path);
                        if (typeof content === 'string' && content.trim().length > 0) {
                            this.index.add({ id: `${gardenName}#${file.path}`, garden: gardenName, path: file.path, content });
                            indexedCount++;
                        }
                    } catch (e) {
                        // Silently fail on unreadable text files, as the user can't do anything about it.
                    }
                }
                if (processedCount % 50 === 0) {
                 this.resultsList.innerHTML = `<li class="command-no-results">Indexing... (${indexedCount} files scanned)</li>`;
                 await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        }

        this.input.placeholder = `Search across ${this.index.size} documents...`;
        this.isIndexing = false;
        this.isIndexBuilt = true;
    } catch (error) {
        this.resultsList.innerHTML = `<li class="command-no-results">Error during indexing. See console.</li>`;
        this.isIndexing = false;
    }
  }

  async open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.overlay.classList.remove('hidden');
    this.input.focus();
    document.addEventListener('keydown', this.handleKeyDown);

    if (!this.isIndexBuilt && !this.indexPromise) {
        this.indexPromise = this._buildIndex().finally(() => {
            this.indexPromise = null;
            if (this.input.value) {
                this.search(this.input.value);
            }
        });
    } else if (this.isIndexBuilt) {
        this.input.placeholder = `Search across ${this.index.size} documents...`;
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
    document.removeEventListener('keydown', this.handleKeyDown);
    const activeEditor = window.thoughtform.workspace.getActiveEditor();
    if (activeEditor && activeEditor.editorView) {
      activeEditor.editorView.focus();
    }
  }

  async search(query) {
    this.query = query.trim();
    if (this.isIndexing) {
        return; 
    }
    if (!this.query) {
        this.results = [];
        this.selectedIndex = 0;
        this.renderResults();
        return;
    }

    const searchResults = await this.index.searchAsync(this.query, {
        index: "content",
        enrich: true,
        limit: 50
    });
    
    const flatResults = searchResults[0]?.result || [];

    const activeGitClient = await window.thoughtform.workspace.getActiveGitClient();
    const currentGardenName = activeGitClient ? activeGitClient.gardenName : '';
    
    flatResults.sort((a, b) => {
        const aIsCurrent = a.doc.garden === currentGardenName;
        const bIsCurrent = b.doc.garden === currentGardenName;
        if (aIsCurrent && !bIsCurrent) return -1;
        if (!aIsCurrent && bIsCurrent) return 1;
        return 0;
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
    
    const activeGitClient = await window.thoughtform.workspace.getActiveGitClient();
    const currentGardenName = activeGitClient ? activeGitClient.gardenName : '';

    const fragment = document.createDocumentFragment();
    for (let index = 0; index < this.results.length; index++) {
        const file = this.results[index].doc;
        const li = document.createElement('li');
        li.className = 'command-result-item fuzzy-search';
        li.dataset.index = index;

        const pathText = file.path.startsWith('/') ? file.path.substring(1) : file.path;
        
        // THIS IS THE FIX: Always display the garden name for clarity in global search.
        const gardenSpan = ` <span class="command-garden">[${file.garden}]</span>`;
        
        const snippet = await this.getSnippet(file.garden, file.path);
        
        li.innerHTML = `
            <div class="command-path">${gardenSpan} ${pathText}</div>
            <div class="global-search-snippet">${snippet}</div>
        `;

        if (index === this.selectedIndex) {
            li.classList.add('active');
            li.scrollIntoView({ block: 'nearest' });
        }
        fragment.appendChild(li);
    }
    this.resultsList.appendChild(fragment);
  }

  selectItem(index) {
    if (index < 0 || index >= this.results.length) return;
    const file = this.results[index].doc;
    window.thoughtform.workspace.openFile(file.garden, file.path);
    this.close();
  }

  handleInput(e) {
    this.search(e.target.value);
  }
  
  handleResultClick(e) {
    const item = e.target.closest('.command-result-item');
    if (item) {
      this.selectItem(parseInt(item.dataset.index, 10));
    }
  }

  handleKeyDown(e) {
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
            this.selectItem(this.selectedIndex);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
    }
  }
}