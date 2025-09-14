import { ContextMenu } from './context-menu.js';

export class Sidebar {
  /**
   * @param {Object} options Configuration for the sidebar.
   * @param {string} options.target A CSS selector for the container element.
   * @param {Git} options.gitClient An instance of the Git client.
   * @param {Editor} options.editor The main editor instance.
   */
  constructor({ target, gitClient, editor }) {
    if (!gitClient) throw new Error('Sidebar requires a gitClient instance.');
    if (!editor) throw new Error('Sidebar requires an editor instance.');
    
    this.gitClient = gitClient;
    this.editor = editor;
    this.targetSelector = target;
    const container = document.querySelector(this.targetSelector);

    if (!container) {
      console.error(`Sidebar container not found: ${this.targetSelector}`);
      return;
    }
    this.container = container;
    
    this.tabsContainer = document.createElement('div');
    this.tabsContainer.className = 'sidebar-tabs';
    
    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'sidebar-content';

    this.container.appendChild(this.tabsContainer);
    this.container.appendChild(this.contentContainer);

    this.activeTab = sessionStorage.getItem('sidebarActiveTab') || 'Files';
  }

  async init() {
    console.log('Initializing sidebar...');
    this.renderTabs();
    await this.refresh();
    this.setupContextMenu();
    console.log('Sidebar initialized.');
  }

  setupContextMenu() {
    new ContextMenu({
      targetSelector: '.sidebar-content [data-filepath]',
      dataAttribute: 'data-filepath',
      items: [
        {
          label: 'Rename',
          action: (filepath) => this.handleRename(filepath)
        },
        {
          label: 'Duplicate',
          action: (filepath) => this.handleDuplicate(filepath)
        },
        {
          label: 'Delete',
          action: (filepath) => this.handleDelete(filepath)
        }
      ]
    });
  }

  renderTabs() {
    this.tabsContainer.innerHTML = `
      <button class="sidebar-tab" data-tab="Files">Files</button>
      <button class="sidebar-tab" data-tab="Gardens">Gardens</button>
    `;

    this.tabsContainer.querySelectorAll('.sidebar-tab').forEach(button => {
      button.addEventListener('click', (e) => {
        this.activeTab = e.target.dataset.tab;
        sessionStorage.setItem('sidebarActiveTab', this.activeTab);
        this.refresh();
      });
    });
  }

  async refresh() {
    this.tabsContainer.querySelectorAll('.sidebar-tab').forEach(button => {
      button.classList.toggle('active', button.dataset.tab === this.activeTab);
    });

    if (this.activeTab === 'Files') {
      await this.renderFiles();
    } else if (this.activeTab === 'Gardens') {
      this.renderGardens();
    }
  }

  async renderFiles() {
    try {
      const [files, statuses] = await Promise.all([
        this.listFiles('/'),
        this.gitClient.getStatuses()
      ]);
      
      const currentFile = decodeURIComponent(window.location.hash.substring(1));
      
      const fileListHTML = files.sort().map(file => {
        const href = `#${file}`;
        const status = statuses.get(file) || 'unmodified';
        const displayText = file.startsWith('/') ? file.substring(1) : file;
        
        const classes = [`status-${status}`];
        if (file === currentFile) {
          classes.push('active');
        }
        return `<li><a href="${href}" class="${classes.join(' ')}" data-filepath="${file}">${displayText}</a></li>`;
      }).join('');

      this.contentContainer.innerHTML = `<ul>${fileListHTML}</ul>`;
    } catch (e) {
      console.error('Error rendering file list:', e);
      this.contentContainer.innerHTML = `<p class="sidebar-error">Could not load files.</p>`;
    }
  }

  renderGardens() {
    try {
      const gardensRaw = localStorage.getItem('thoughtform_gardens');
      const gardens = gardensRaw ? JSON.parse(gardensRaw) : [];
      const basePath = new URL(import.meta.url).pathname.split('/').slice(0, -2).join('/');
      
      if (gardens.length === 0) {
        this.contentContainer.innerHTML = `<p class="sidebar-info">No other gardens found.</p>`;
        return;
      }
      
      const gardenListHTML = gardens.sort().map(name => {
        const href = `${basePath}/${name}`;
        const isActive = this.gitClient.gardenName === name;
        return `<li><a href="${href}" class="${isActive ? 'active' : ''}">${name}</a></li>`;
      }).join('');

      this.contentContainer.innerHTML = `<ul>${gardenListHTML}</ul>`;
    } catch (e) {
      console.error('Error rendering garden list:', e);
      this.contentContainer.innerHTML = `<p class="sidebar-error">Could not load gardens.</p>`;
    }
  }

  async listFiles(dir) {
    const pfs = this.gitClient.pfs;
    let fileList = [];
    try {
      const items = await pfs.readdir(dir);
      for (const item of items) {
        if (item === '.git') continue;
        const path = `${dir === '/' ? '' : dir}/${item}`;
        try {
          const stat = await pfs.stat(path);
          if (stat.isDirectory()) {
            fileList = fileList.concat(await this.listFiles(path));
          } else {
            fileList.push(path);
          }
        } catch (e) { console.warn(`Could not stat ${path}, skipping.`); }
      }
    } catch (e) { console.log(`Directory not found: ${dir}. No files to list.`); }
    return fileList;
  }

  // --- Context Menu Action Handlers ---

  async handleRename(oldPath) {
    const oldName = oldPath.substring(oldPath.lastIndexOf('/') + 1);
    const newName = prompt('Enter new file name:', oldName);

    if (!newName || newName === oldName) {
      return;
    }
    
    const dir = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = `${dir}/${newName}`;
    
    try {
      await this.gitClient.pfs.rename(oldPath, newPath);
      if (`#${oldPath}` === window.location.hash) {
        window.location.hash = `#${newPath}`;
      } else {
        await this.refresh();
      }
    } catch (e) {
      console.error(`Error renaming file:`, e);
      alert('Failed to rename file.');
    }
  }
  
  async handleDuplicate(filepath) {
    const directory = filepath.substring(0, filepath.lastIndexOf('/'));
    const originalFilename = filepath.substring(filepath.lastIndexOf('/') + 1);

    const lastDotIndex = originalFilename.lastIndexOf('.');
    const hasExtension = lastDotIndex > 0;
    
    let defaultName;
    if (hasExtension) {
        const base = originalFilename.substring(0, lastDotIndex);
        const ext = originalFilename.substring(lastDotIndex);
        defaultName = `${base} (copy)${ext}`;
    } else {
        defaultName = `${originalFilename} (copy)`;
    }

    const newFilename = prompt('Enter name for duplicated file:', defaultName);

    if (!newFilename) {
      return;
    }
    
    const newPath = `${directory}/${newFilename}`;

    try {
      const content = await this.gitClient.pfs.readFile(filepath, 'utf8');
      await this.gitClient.writeFile(newPath, content);
      await this.refresh();
    } catch (e) {
      console.error('Error duplicating file:', e);
      if (e.code === 'ENOENT') {
        alert(`Cannot duplicate. Original file not found: ${filepath}`);
      } else {
        alert('Failed to duplicate file.');
      }
    }
  }

  async handleDelete(filepath) {
    if (confirm(`Are you sure you want to delete "${filepath}"?`)) {
      try {
        const wasViewingDeletedFile = decodeURIComponent(window.location.hash) === `#${filepath}`;
        
        await this.gitClient.pfs.unlink(filepath);
        
        if (wasViewingDeletedFile) {
          // Explicitly set hash and then force a reload of the default file.
          window.location.hash = '#/README';
          await this.editor.loadFile('/README');
        } else {
          // If we weren't viewing the deleted file, a simple refresh is enough.
          await this.refresh();
        }

      } catch (e) {
        console.error(`Error deleting file:`, e);
        alert('Failed to delete file.');
      }
    }
  }
}
