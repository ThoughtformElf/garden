import { Git } from './git-integration.js';
import { executeFile } from '../workspace/executor.js';

export class CommandPalette {
  constructor({ gitClient, editor }) {
    this.gitClient = gitClient; // Stays for now for cross-garden indexing
    this.editor = editor; // Stays for now for cross-garden indexing

    this.isOpen = false;
    this.query = '';
    this.results = [];
    this.selectedIndex = 0;
    this.mode = 'search';
    this.crossGardenFileCache = null;
    this.indexingPromise = null; // To track background indexing

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleResultClick = this.handleResultClick.bind(this);
    this.close = this.close.bind(this);
    this.createDOMElements();
    this.listenForFileChanges(); // Subscribe to events
  }
  
  // Listen for file creation/deletion to invalidate the cache.
  listenForFileChanges() {
    if (window.thoughtform && window.thoughtform.events) {
        window.thoughtform.events.subscribe('file:create', () => {
            console.log('[CommandPalette] File change detected, invalidating index cache.');
            this.crossGardenFileCache = null;
        });
        window.thoughtform.events.subscribe('file:delete', () => {
            console.log('[CommandPalette] File change detected, invalidating index cache.');
            this.crossGardenFileCache = null;
        });
    }
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

  async _buildCrossGardenIndex() {
    const gardensRaw = localStorage.getItem('thoughtform_gardens');
    const gardens = gardensRaw ? JSON.parse(gardensRaw) : ['home'];
    const fileIndex = [];
    
    await Promise.all(gardens.map(async (gardenName) => {
      const tempGitClient = new Git(gardenName);
      const allPaths = await this.editor.sidebar.listAllPaths(tempGitClient, '/');
      
      for (const file of allPaths) {
        if (!file.isDirectory) {
            const filePath = file.path;
            fileIndex.push({
              garden: gardenName,
              path: filePath,
              searchString: `${gardenName} ${filePath.substring(1)}`.toLowerCase()
            });
        }
      }
    }));
    
    this.crossGardenFileCache = fileIndex;
  }

  async open(mode = 'search') {
    if (!window.thoughtform.workspace.getActiveEditor()) {
      console.error("CommandPalette cannot open: no active editor found.");
      return;
    }

    if (this.isOpen) return;
    this.isOpen = true;
    this.mode = mode;

    if (this.mode === 'execute') {
      this.titleElement.textContent = 'Executing a File...';
      this.input.placeholder = 'Find a .js file to execute across all gardens...';
    } else {
      this.titleElement.textContent = 'Searching Files...';
      this.input.placeholder = 'Find file across all gardens...';
    }

    this.overlay.classList.remove('hidden');
    this.input.focus();
    
    document.addEventListener('keydown', this.handleKeyDown);

    // If cache is empty and not already being built, start indexing in the background.
    if (!this.crossGardenFileCache && !this.indexingPromise) {
      const originalPlaceholder = this.input.placeholder;
      this.input.placeholder = 'Indexing all gardens...';

      this.indexingPromise = this._buildCrossGardenIndex().finally(() => {
        this.input.placeholder = originalPlaceholder;
        this.indexingPromise = null;
        // Re-run the current search now that the index is ready.
        this.search(this.input.value);
      });
    }
    
    // Immediately search with whatever is in the cache (which may be empty).
    await this.search('');
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
    this.query = query.toLowerCase();
    
    // Use the cache if it exists, otherwise use an empty array while indexing.
    let sourceFiles = this.crossGardenFileCache || [];

    if (this.mode === 'execute') {
        sourceFiles = sourceFiles.filter(file => file.path.endsWith('.js'));
    }
    
    const activeGitClient = await window.thoughtform.workspace.getActiveGitClient();
    const currentGardenName = activeGitClient ? activeGitClient.gardenName : '';

    if (!this.query) {
      this.results = (this.mode === 'execute' ? sourceFiles : sourceFiles.filter(file => file.garden === currentGardenName)).slice(0, 100);
    } else {
      this.results = sourceFiles.filter(file => {
        let queryIndex = 0;
        let searchIndex = 0;
        while (queryIndex < this.query.length && searchIndex < file.searchString.length) {
          if (this.query[queryIndex] === file.searchString[searchIndex]) {
            queryIndex++;
          }
          searchIndex++;
        }
        return queryIndex === this.query.length;
      }).sort((a, b) => {
        const aIsCurrent = a.garden === currentGardenName;
        const bIsCurrent = b.garden === currentGardenName;
        if (aIsCurrent && !bIsCurrent) return -1;
        if (!aIsCurrent && bIsCurrent) return 1;
        return 0;
      });
    }

    this.selectedIndex = 0;
    this.renderResults();
  }

  async renderResults() {
    this.resultsList.innerHTML = '';
    if (this.results.length === 0 && !this.indexingPromise) {
      this.resultsList.innerHTML = '<li class="command-no-results">No matches found</li>';
      return;
    }
    
    const activeGitClient = await window.thoughtform.workspace.getActiveGitClient();
    const currentGardenName = activeGitClient ? activeGitClient.gardenName : '';

    this.results.forEach((file, index) => {
      const li = document.createElement('li');
      li.className = 'command-result-item';
      li.dataset.index = index;

      const pathText = file.path.startsWith('/') ? file.path.substring(1) : file.path;
      
      if (file.garden !== currentGardenName) {
        li.innerHTML = `<span class="command-path">${pathText}</span> <span class="command-garden">${file.garden}</span>`;
      } else {
        li.textContent = pathText;
      }

      if (index === this.selectedIndex) {
        li.classList.add('active');
        li.scrollIntoView({ block: 'nearest' });
      }

      this.resultsList.appendChild(li);
    });
  }

  async selectItem(index) {
    if (index < 0 || index >= this.results.length) return;

    const file = this.results[index];
    
    if (this.mode === 'execute') {
      this.close();
      const editor = window.thoughtform.workspace.getActiveEditor();
      const git = await window.thoughtform.workspace.getActiveGitClient();
      if (editor && git) {
          const fullPath = `${file.garden}#${file.path}`;
          executeFile(fullPath, editor, git);
      }
    } else { // 'search' mode
      window.thoughtform.workspace.openFile(file.garden, file.path);
      this.close();
    }
  }

  async handleInput(e) {
    await this.search(e.target.value);
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