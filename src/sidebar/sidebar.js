// src/sidebar/sidebar.js
import { ContextMenu } from '../util/context-menu.js';
import { fileActions } from './files.js';
import { gardenActions } from './gardens.js';
import { gitActions } from './git.js';
import { Modal } from '../util/modal.js';

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
    this.renderTabs();
    this.setupContextMenus();
    await this.refresh();
  }

  async showAlert({ title = 'Notice', message }) {
    return new Promise(resolve => {
        const modal = new Modal({ title });
        modal.updateContent(`<p>${message}</p>`);
        modal.addFooterButton('OK', () => {
            modal.destroy();
            resolve();
        });
        modal.show();
    });
  }
  
  async showConfirm({ title, message, okText = 'OK', destructive = false }) {
    return Modal.confirm({
      title,
      message,
      okText,
      destructive,
      cancelText: 'Cancel'
    });
  }

  setupContextMenus() {
    const commandPaletteItem = [
      { type: 'separator' },
      { label: 'Command Palette', action: () => window.thoughtform.commandPalette.open() }
    ];

    new ContextMenu({
      targetSelector: '.sidebar-content.files-view',
      itemSelector: '.file-tree-item', // Updated selector
      dataAttribute: 'data-path',     // Updated data attribute
      items: [
        { label: 'New File', action: () => this.handleNewFile() },
        { label: 'New Folder', action: () => this.handleNewFolder() },
        { label: 'Rename', action: (path) => this.handleRename(path) },
        { label: 'Duplicate', action: (path) => this.handleDuplicate(path) },
        { label: 'Delete', action: (path) => this.handleDelete(path) },
        ...commandPaletteItem
      ],
      containerItems: [
        { label: 'New File', action: () => this.handleNewFile() },
        { label: 'New Folder', action: () => this.handleNewFolder() },
        ...commandPaletteItem
      ]
    });

    new ContextMenu({
      targetSelector: '.sidebar-content.gardens-view',
      itemSelector: '[data-garden-name]',
      dataAttribute: 'data-garden-name',
      items: [
        { label: 'New Garden', action: () => this.handleNewGarden() },
        { label: 'Duplicate', action: (name) => this.handleDuplicateGarden(name) },
        { label: 'Delete', action: (name) => this.handleDeleteGarden(name) },
        ...commandPaletteItem
      ],
      containerItems: [
        { label: 'New Garden', action: () => this.handleNewGarden() },
        ...commandPaletteItem
      ]
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
    
    this.contentContainer.className = 'sidebar-content';
    this.contentContainer.classList.add(`${this.activeTab.toLowerCase()}-view`);

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

  /**
   * THIS IS THE BUGFIX.
   * This function now recursively finds ALL paths, including empty directories,
   * ensuring the sidebar is a true representation of the file system.
   */
  async listAllPaths(gitClient, dir) {
    const pfs = gitClient.pfs;
    let allPaths = [];
    try {
      const items = await pfs.readdir(dir);
      for (const item of items) {
        if (item === '.git') continue;
        const path = `${dir === '/' ? '' : dir}/${item}`;
        try {
          const stat = await pfs.stat(path);
          allPaths.push({ path, isDirectory: stat.isDirectory() });
          if (stat.isDirectory()) {
            const subPaths = await this.listAllPaths(gitClient, path);
            allPaths = allPaths.concat(subPaths);
          }
        } catch (e) { console.warn(`Could not stat ${path}, skipping.`); }
      }
    } catch (e) { console.log(`Directory not found: ${dir}. No items to list.`); }
    return allPaths;
  }
}