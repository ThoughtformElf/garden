import { ContextMenu } from '../util/context-menu.js';
import { fileActions } from './files.js';
import { gardenActions } from './gardens.js';
import { gitActions } from './git.js';

export class Sidebar {
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

    Object.assign(this, fileActions);
    Object.assign(this, gardenActions);
    Object.assign(this, gitActions);
  }

  async init() {
    console.log('Initializing sidebar...');
    this.renderTabs();
    this.setupContextMenus();
    await this.refresh();
    console.log('Sidebar initialized.');
  }

  /**
   * Ensures a directory path exists by creating each segment.
   * @param {string} path - The full directory path to ensure.
   */
  async ensureDir(path) {
    const parts = path.split('/').filter(p => p);
    let currentPath = '';
    for (const part of parts) {
      currentPath += `/${part}`;
      try {
        await this.gitClient.pfs.stat(currentPath);
      } catch (e) {
        if (e.code === 'ENOENT') {
          try {
            await this.gitClient.pfs.mkdir(currentPath);
          } catch (mkdirError) {
            // Ignore EEXIST in case of a race condition
            if (mkdirError.code !== 'EEXIST') {
              throw mkdirError;
            }
          }
        } else {
          throw e;
        }
      }
    }
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
      <button class="sidebar-tab" data-tab="Git">Git</button>
    `;

    this.tabsContainer.querySelectorAll('.sidebar-tab').forEach(button => {
      button.addEventListener('click', (e) => {
        const newTab = e.target.dataset.tab;
        const oldTab = this.activeTab;
        this.activeTab = newTab;
        sessionStorage.setItem('sidebarActiveTab', this.activeTab);

        // If we are leaving the Git tab, restore the editor to the current file.
        if (oldTab === 'Git' && newTab !== 'Git') {
            const currentFile = this.editor.getFilePath(window.location.hash);
            this.editor.loadFile(currentFile);
        }

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
    this.contentContainer.classList.toggle('git-view', this.activeTab === 'Git');

    const statuses = await this.gitClient.getStatuses();

    if (this.activeTab === 'Files') {
      await this.renderFiles(statuses);
    } else if (this.activeTab === 'Gardens') {
      await this.renderGardens();
    } else if (this.activeTab === 'Git') {
      await this.renderGitView();
    }

    const isDirty = statuses.some(([, head, workdir]) => head !== workdir);
    this.tabsContainer.querySelector('[data-tab="Git"]').classList.toggle('dirty', isDirty);
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
}
