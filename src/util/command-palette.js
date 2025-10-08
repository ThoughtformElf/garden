// src/util/command-palette.js
import { Git } from './git-integration.js';

export class CommandPalette {
  constructor({ gitClient, editor }) {
    this.gitClient = gitClient;
    this.editor = editor;

    this.isOpen = false;
    this.query = '';
    this.results = [];
    this.selectedIndex = 0;
    this.mode = 'search';
    this.crossGardenFileCache = null;
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleResultClick = this.handleResultClick.bind(this);
    this.close = this.close.bind(this);
    this.createDOMElements();
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
      // --- THIS IS THE FIX (Part 1) ---
      // Call the new `listAllPaths` method which correctly finds all nested files.
      const allPaths = await this.editor.sidebar.listAllPaths(tempGitClient, '/');
      
      // --- THIS IS THE FIX (Part 2) ---
      // `listAllPaths` returns objects {path, isDirectory}. We must filter out
      // directories and then use the `path` property.
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
    if (!this.gitClient || !this.editor) {
      console.error("CommandPalette cannot open: gitClient or editor is not initialized.");
      return;
    }

    if (this.isOpen) return;
    this.isOpen = true;
    this.mode = mode;

    if (this.mode === 'execute') {
      this.titleElement.textContent = 'Executing a File...';
      this.input.placeholder = 'Find a .js file to execute...';
    } else {
      this.titleElement.textContent = 'Searching Files...';
      this.input.placeholder = 'Find file across all gardens...';
    }

    this.overlay.classList.remove('hidden');
    this.input.focus();
    
    document.addEventListener('keydown', this.handleKeyDown);

    if (!this.crossGardenFileCache) {
      const originalPlaceholder = this.input.placeholder;
      this.input.placeholder = 'Indexing all gardens...';
      this.input.disabled = true;

      await this._buildCrossGardenIndex();

      this.input.placeholder = originalPlaceholder;
      this.input.disabled = false;
      this.input.focus();
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

    // --- THIS IS THE FIX ---
    // Return keyboard focus to the editor so the user can immediately resume typing
    // and use editor-bound shortcuts again.
    if (this.editor && this.editor.editorView) {
      this.editor.editorView.focus();
    }
  }

  search(query) {
    this.query = query.toLowerCase();
    
    let sourceFiles = this.crossGardenFileCache;

    if (this.mode === 'execute') {
        sourceFiles = this.crossGardenFileCache.filter(file => 
            file.garden === this.gitClient.gardenName && file.path.endsWith('.js')
        );
    }

    if (!this.query) {
      this.results = (this.mode === 'execute' ? sourceFiles : sourceFiles.filter(file => file.garden === this.gitClient.gardenName)).slice(0, 100);
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
        const aIsCurrent = a.garden === this.gitClient.gardenName;
        const bIsCurrent = b.garden === this.gitClient.gardenName;
        if (aIsCurrent && !bIsCurrent) return -1;
        if (!aIsCurrent && bIsCurrent) return 1;
        return 0;
      });
    }

    this.selectedIndex = 0;
    this.renderResults();
  }

  renderResults() {
    this.resultsList.innerHTML = '';
    if (this.results.length === 0) {
      this.resultsList.innerHTML = '<li class="command-no-results">No matches found</li>';
      return;
    }

    this.results.forEach((file, index) => {
      const li = document.createElement('li');
      li.className = 'command-result-item';
      li.dataset.index = index;

      const pathText = file.path.startsWith('/') ? file.path.substring(1) : file.path;
      
      if (file.garden !== this.gitClient.gardenName) {
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
      try {
        const fileContent = await this.gitClient.readFile(file.path);
        // Pass editor and git globals into the executed script's scope
        const executable = new Function('editor', 'git', fileContent);
        const result = await executable(this.editor, this.gitClient);
        console.log(`Execution successful for ${file.path}. Result:`, result);
      } catch (error) {
        console.error(`Execution failed for ${file.path}:`, error);
        window.thoughtform.ui.toggleDevtools?.(true, 'console');
      }
    } else { // 'search' mode
      if (file.garden !== this.gitClient.gardenName) {
        const fullPath = new URL(import.meta.url).pathname;
        const srcIndex = fullPath.lastIndexOf('/src/');
        const basePath = srcIndex > -1 ? fullPath.substring(0, srcIndex) : '';
        
        window.location.href = `${window.location.origin}${basePath}/${encodeURIComponent(file.garden)}#${encodeURIComponent(file.path)}`;
      } else {
        window.location.hash = `#${encodeURIComponent(file.path)}`;
      }
      this.close();
    }
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