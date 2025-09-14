import { ContextMenu } from './context-menu.js';
import { Git } from './git-integration.js';

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
    this.setupContextMenus();
    await this.refresh();
    console.log('Sidebar initialized.');
  }

  setupContextMenus() {
    new ContextMenu({
      targetSelector: '.sidebar-content.files-view',
      itemSelector: '[data-filepath]',
      dataAttribute: 'data-filepath',
      items: [
        { label: 'New File', action: () => this.handleNewFile() },
        { label: 'Rename', action: (filepath) => this.handleRename(filepath) },
        { label: 'Duplicate', action: (filepath) => this.handleDuplicate(filepath) },
        { label: 'Delete', action: (filepath) => this.handleDelete(filepath) }
      ],
      containerItems: [{ label: 'New File', action: () => this.handleNewFile() }]
    });

    new ContextMenu({
      targetSelector: '.sidebar-content.gardens-view',
      itemSelector: '[data-garden-name]',
      dataAttribute: 'data-garden-name',
      items: [
        { label: 'New Garden', action: () => this.handleNewGarden() },
        { label: 'Duplicate', action: (name) => this.handleDuplicateGarden(name) },
        { label: 'Delete', action: (name) => this.handleDeleteGarden(name) }
      ],
      containerItems: [{ label: 'New Garden', action: () => this.handleNewGarden() }]
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
    
    this.contentContainer.classList.toggle('files-view', this.activeTab === 'Files');
    this.contentContainer.classList.toggle('gardens-view', this.activeTab === 'Gardens');

    if (this.activeTab === 'Files') {
      await this.renderFiles();
    } else if (this.activeTab === 'Gardens') {
      this.renderGardens();
    }
  }

  async renderFiles() {
    try {
      const [files, statuses] = await Promise.all([
        this.listFiles(this.gitClient, '/'),
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
      const basePath = new URL(import.meta.url).pathname.split('/').slice(0, -2).join('/') || '';
      
      if (gardens.length === 0) {
        this.contentContainer.innerHTML = `<p class="sidebar-info">No gardens found. Create one!</p>`;
        return;
      }
      
      const gardenListHTML = gardens.sort().map(name => {
        const href = `${basePath}/${name}`;
        // FIX: Always decode the name for display to handle legacy encoded names.
        const displayText = decodeURIComponent(name);
        const isActive = this.gitClient.gardenName === displayText;
        return `<li><a href="${href}" class="${isActive ? 'active' : ''}" data-garden-name="${name}">${displayText}</a></li>`;
      }).join('');

      this.contentContainer.innerHTML = `<ul>${gardenListHTML}</ul>`;
    } catch (e) {
      console.error('Error rendering garden list:', e);
      this.contentContainer.innerHTML = `<p class="sidebar-error">Could not load gardens.</p>`;
    }
  }

  async listFiles(gitClient, dir) {
    const pfs = gitClient.pfs;
    let fileList = [];
    try {
      const items = await pfs.readdir(dir);
      for (const item of items) {
        if (item === '.git') continue;
        const path = `${dir === '/' ? '' : dir}/${item}`;
        try {
          const stat = await pfs.stat(path);
          if (stat.isDirectory()) {
            fileList = fileList.concat(await this.listFiles(gitClient, path));
          } else {
            fileList.push(path);
          }
        } catch (e) { console.warn(`Could not stat ${path}, skipping.`); }
      }
    } catch (e) { console.log(`Directory not found: ${dir}. No files to list.`); }
    return fileList;
  }

  // --- File Action Handlers ---
  async handleNewFile() {
    const newName = prompt('Enter new file name:');
    if (!newName) return;
    const newPath = `/${newName}`;
    try {
      await this.gitClient.pfs.stat(newPath);
      alert(`File "${newName}" already exists.`);
    } catch (e) {
      if (e.code === 'ENOENT') {
        await this.gitClient.writeFile(newPath, '');
        window.location.hash = `#${newPath}`;
      } else {
        console.error('Error checking for file:', e);
        alert('An error occurred while creating the file.');
      }
    }
  }
  async handleRename(oldPath) {
    const oldName = oldPath.substring(oldPath.lastIndexOf('/') + 1);
    const newName = prompt('Enter new file name:', oldName);
    if (!newName || newName === oldName) return;
    const dir = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = `${dir}/${newName}`;
    try {
      await this.gitClient.pfs.rename(oldPath, newPath);
      if (decodeURIComponent(window.location.hash) === `#${oldPath}`) {
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
    if (!newFilename) return;
    const newPath = `${directory}/${newFilename}`;
    try {
      const content = await this.gitClient.pfs.readFile(filepath, 'utf8');
      await this.gitClient.writeFile(newPath, content);
      await this.refresh();
    } catch (e) {
      console.error('Error duplicating file:', e);
      alert('Failed to duplicate file.');
    }
  }
  async handleDelete(filepath) {
    if (confirm(`Are you sure you want to delete "${filepath}"?`)) {
      try {
        const wasViewingDeletedFile = decodeURIComponent(window.location.hash) === `#${filepath}`;
        await this.gitClient.pfs.unlink(filepath);
        if (wasViewingDeletedFile) {
          window.location.hash = '#/README';
          await this.editor.loadFile('/README');
        } else {
          await this.refresh();
        }
      } catch (e) {
        console.error(`Error deleting file:`, e);
        alert('Failed to delete file.');
      }
    }
  }

  // --- Garden Action Handlers ---
  handleNewGarden() {
    const newName = prompt('Enter new garden name:');
    if (!newName || !newName.trim()) return;
    const gardensRaw = localStorage.getItem('thoughtform_gardens');
    const gardens = gardensRaw ? JSON.parse(gardensRaw) : [];
    if (gardens.includes(newName)) {
      alert(`Garden "${newName}" already exists.`);
      return;
    }
    const basePath = new URL(import.meta.url).pathname.split('/').slice(0, -2).join('/') || '';
    window.location.href = `${basePath}/${newName}`;
  }

  async handleDuplicateGarden(sourceName) {
    if (!sourceName) return;
    
    const decodedSourceName = decodeURIComponent(sourceName);
    const defaultName = `${decodedSourceName} (copy)`;
    const newName = prompt('Enter name for new garden:', defaultName);

    if (!newName || !newName.trim() || newName === sourceName) return;

    const originalContent = this.contentContainer.innerHTML;
    this.contentContainer.innerHTML = `<p class="sidebar-info">Preparing duplication...<br>(UI may be unresponsive)</p>`;

    setTimeout(async () => {
      try {
        const sourceGit = new Git(sourceName);
        const destGit = new Git(newName);
        await destGit.initRepo();

        const filesToCopy = await this.listFiles(sourceGit, '/');
        
        let count = 0;
        for (const file of filesToCopy) {
          count++;
          this.contentContainer.innerHTML = `<p class="sidebar-info">Copying file ${count} of ${filesToCopy.length}:<br>${file.substring(1)}</p>`;
          const content = await sourceGit.readFile(file);
          await destGit.writeFile(file, content);
        }
        
        this.contentContainer.innerHTML = `<p class="sidebar-info">Duplication complete. Redirecting...</p>`;

        setTimeout(() => {
          const basePath = new URL(import.meta.url).pathname.split('/').slice(0, -2).join('/') || '';
          const newUrl = `${window.location.origin}${basePath}/${newName}`;
          window.location.replace(newUrl);
        }, 500);

      } catch(e) {
        console.error('Error duplicating garden:', e);
        alert('Failed to duplicate garden. Check console for details.');
        this.contentContainer.innerHTML = originalContent;
      }
    }, 100);
  }
  
  async handleDeleteGarden(name) {
    if (!name) return;
    if (name === 'home') {
      alert('The default "home" garden cannot be deleted.');
      return;
    }
    if (!confirm(`ARE YOU SURE you want to permanently delete the garden "${name}"?\nThis cannot be undone.`)) return;

    try {
      const gardensRaw = localStorage.getItem('thoughtform_gardens');
      let gardens = gardensRaw ? JSON.parse(gardensRaw) : [];
      gardens = gardens.filter(g => g !== name);
      localStorage.setItem('thoughtform_gardens', JSON.stringify(gardens));

      const dbName = `garden-fs-${name}`;
      await new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(dbName);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = (event) => reject(event.target.error);
        deleteRequest.onblocked = () => {
            alert("Could not delete the database because it's still in use. Please refresh the page and try again.");
            reject(new Error('Deletion blocked'));
        };
      });

      if (this.gitClient.gardenName === name) {
        const basePath = new URL(import.meta.url).pathname.split('/').slice(0, -2).join('/') || '';
        window.location.href = `${basePath}/home`;
      } else {
        await this.refresh();
      }

    } catch(e) {
      console.error('Error deleting garden:', e);
      alert('Failed to delete garden.');
    }
  }
}
