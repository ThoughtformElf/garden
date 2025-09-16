// src/util/command-palette.js

/**
 * A lightweight, dependency-free command palette for file navigation.
 */
export class CommandPalette {
  constructor({ gitClient, editor }) {
    if (!gitClient || !editor) {
      throw new Error('CommandPalette requires a gitClient and editor instance.');
    }
    this.gitClient = gitClient;
    this.editor = editor; // We need this to get the full file list

    this.isOpen = false;
    this.query = '';
    this.allFiles = [];
    this.results = [];
    this.selectedIndex = 0;

    // Bind methods to ensure `this` is correct in event listeners
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
    // Stop clicks inside the container from closing the overlay
    this.container.addEventListener('click', e => e.stopPropagation());

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'cp-input';
    this.input.placeholder = 'Find file...';
    this.input.addEventListener('input', this.handleInput);

    this.resultsList = document.createElement('ul');
    this.resultsList.className = 'cp-results-list';
    this.resultsList.addEventListener('click', this.handleResultClick);

    this.container.appendChild(this.input);
    this.container.appendChild(this.resultsList);
    this.overlay.appendChild(this.container);
    document.body.appendChild(this.overlay);
  }

  async open() {
    if (this.isOpen) return;
    this.isOpen = true;

    // Fetch all files from the current garden
    this.allFiles = await this.editor.sidebar.listFiles(this.gitClient, '/');

    this.overlay.classList.remove('hidden');
    this.input.focus();
    
    document.addEventListener('keydown', this.handleKeyDown);

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
      this.results = this.allFiles.slice(0, 100); // Limit initial display
    } else {
      // Simple but effective fuzzy search
      this.results = this.allFiles.filter(file => {
        const lowerFile = file.toLowerCase();
        let queryIndex = 0;
        let fileIndex = 0;
        while (queryIndex < this.query.length && fileIndex < lowerFile.length) {
          if (this.query[queryIndex] === lowerFile[fileIndex]) {
            queryIndex++;
          }
          fileIndex++;
        }
        return queryIndex === this.query.length;
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
      li.textContent = file.startsWith('/') ? file.substring(1) : file;

      if (index === this.selectedIndex) {
        li.classList.add('active');
        li.scrollIntoView({ block: 'nearest' });
      }

      this.resultsList.appendChild(li);
    });
  }

  selectItem(index) {
    if (index < 0 || index >= this.results.length) return;

    const filePath = this.results[index];
    window.location.hash = `#${filePath}`;
    
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
        this.selectItem(this.selectedIndex);
        break;
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
    }
  }
}
