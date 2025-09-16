// src/util/command-palette.js
import { Git } from './git-integration.js';

/**
 * A lightweight, dependency-free command palette for file navigation across all gardens.
 */
export class CommandPalette {
  constructor({ gitClient, editor }) {
    if (!gitClient || !editor) {
      throw new Error('CommandPalette requires a gitClient and editor instance.');
    }
    this.gitClient = gitClient;
    this.editor = editor;

    this.isOpen = false;
    this.query = '';
    this.results = [];
    this.selectedIndex = 0;

    // A session-wide cache for all files across all gardens
    this.crossGardenFileCache = null;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleResultClick = this.handleResultClick.bind(this);
    this.close = this.close.bind(this);

    this.createDOMElements();
  }

  createDOMElements() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'cp-overlay hidden';
    this.overlay.addEventListener('click', this.close);

    this.container = document.createElement('div');
    this.container.className = 'cp-container';
    this.container.addEventListener('click', e => e.stopPropagation());

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'cp-input';
    this.input.placeholder = 'Find file across all gardens...';
    this.input.addEventListener('input', this.handleInput);

    this.resultsList = document.createElement('ul');
    this.resultsList.className = 'cp-results-list';
    this.resultsList.addEventListener('click', this.handleResultClick);

    this.container.appendChild(this.input);
    this.container.appendChild(this.resultsList);
    this.overlay.appendChild(this.container);
    document.body.appendChild(this.overlay);
  }

  async _buildCrossGardenIndex() {
    const gardensRaw = localStorage.getItem('thoughtform_gardens');
    const gardens = gardensRaw ? JSON.parse(gardensRaw) : ['home'];
    const fileIndex = [];
    
    // This uses Promise.all for fast, parallel file listing
    await Promise.all(gardens.map(async (gardenName) => {
      const tempGitClient = new Git(gardenName);
      const files = await this.editor.sidebar.listFiles(tempGitClient, '/');
      for (const filePath of files) {
        fileIndex.push({
          garden: gardenName,
          path: filePath,
          // Pre-calculate a search string for better performance
          searchString: `${gardenName} ${filePath.substring(1)}`.toLowerCase()
        });
      }
    }));
    
    this.crossGardenFileCache = fileIndex;
  }

  async open() {
    if (this.isOpen) return;
    this.isOpen = true;

    this.overlay.classList.remove('hidden');
    this.input.focus();
    
    document.addEventListener('keydown', this.handleKeyDown);

    // If the index hasn't been built this session, build it now.
    if (!this.crossGardenFileCache) {
      const originalPlaceholder = this.input.placeholder;
      this.input.placeholder = 'Indexing all gardens...';
      this.input.disabled = true;

      await this._buildCrossGardenIndex();

      this.input.placeholder = originalPlaceholder;
      this.input.disabled = false;
      this.input.focus();
    }
    
    // Initial render with all files
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
  }

  search(query) {
    this.query = query.toLowerCase();
    
    if (!this.query) {
      // Show files from the current garden first
      this.results = this.crossGardenFileCache
        .filter(file => file.garden === this.gitClient.gardenName)
        .slice(0, 100);
    } else {
      this.results = this.crossGardenFileCache.filter(file => {
        // This fuzzy search now checks against the pre-built search string
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
        // Bonus: Prioritize results from the current garden
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
      this.resultsList.innerHTML = '<li class="cp-no-results">No matches found</li>';
      return;
    }

    this.results.forEach((file, index) => {
      const li = document.createElement('li');
      li.className = 'cp-result-item';
      li.dataset.index = index;

      const pathText = file.path.startsWith('/') ? file.path.substring(1) : file.path;
      
      // If the file is not in the current garden, show the garden name
      if (file.garden !== this.gitClient.gardenName) {
        li.innerHTML = `<span class="cp-path">${pathText}</span> <span class="cp-garden">${file.garden}</span>`;
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

  selectItem(index) {
    if (index < 0 || index >= this.results.length) return;

    const file = this.results[index];
    
    if (file.garden !== this.gitClient.gardenName) {
      // Full page navigation to the other garden
      // --- FIX: This is the corrected base path logic ---
      const fullPath = new URL(import.meta.url).pathname;
      const srcIndex = fullPath.lastIndexOf('/src/');
      const basePath = srcIndex > -1 ? fullPath.substring(0, srcIndex) : '';
      
      window.location.href = `${window.location.origin}${basePath}/${encodeURIComponent(file.garden)}#${encodeURIComponent(file.path)}`;
    } else {
      // Simple hash change for files in the current garden
      window.location.hash = `#${encodeURIComponent(file.path)}`;
    }
    
    this.close();
  }

  handleInput(e) {
    this.search(e.target.value);
  }
  
  handleResultClick(e) {
    const item = e.target.closest('.cp-result-item');
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
