export class Sidebar {
  /**
   * @param {Object} options Configuration for the sidebar.
   * @param {string} options.target A CSS selector for the container element.
   * @param {Git} options.gitClient An instance of the Git client.
   */
  constructor({ target, gitClient }) {
    if (!gitClient) {
      throw new Error('Sidebar requires a gitClient instance.');
    }
    this.gitClient = gitClient;
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

    // Retrieve the last active tab from sessionStorage, defaulting to 'Files'
    this.activeTab = sessionStorage.getItem('sidebarActiveTab') || 'Files';
  }

  /**
   * Initializes the sidebar by rendering tabs and the default content.
   */
  async init() {
    console.log('Initializing sidebar...');
    this.renderTabs();
    await this.refresh();
    console.log('Sidebar initialized.');
  }

  /**
   * Renders the tab buttons and sets up their click handlers.
   */
  renderTabs() {
    this.tabsContainer.innerHTML = `
      <button class="sidebar-tab" data-tab="Files">Files</button>
      <button class="sidebar-tab" data-tab="Gardens">Gardens</button>
    `;

    this.tabsContainer.querySelectorAll('.sidebar-tab').forEach(button => {
      button.addEventListener('click', (e) => {
        this.activeTab = e.target.dataset.tab;
        // Save the active tab state to sessionStorage
        sessionStorage.setItem('sidebarActiveTab', this.activeTab);
        this.refresh();
      });
    });
  }

  /**
   * Refreshes the content of the active tab.
   */
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

  /**
   * Fetches and renders the file list for the current garden.
   */
  async renderFiles() {
    try {
      const [files, statuses] = await Promise.all([
        this.listFiles('/'),
        this.gitClient.getStatuses()
      ]);
      
      const currentFile = window.location.hash.substring(1);
      const fileListHTML = files.sort().map(file => {
        const href = `#${file}`;
        const status = statuses.get(file) || 'unmodified';
        // NEW: Remove leading slash for cleaner display text
        const displayText = file.startsWith('/') ? file.substring(1) : file;
        
        const classes = [`status-${status}`];
        if (file === currentFile) {
          classes.push('active');
        }
        return `<li><a href="${href}" class="${classes.join(' ')}">${displayText}</a></li>`;
      }).join('');

      this.contentContainer.innerHTML = `<ul>${fileListHTML}</ul>`;
    } catch (e) {
      console.error('Error rendering file list:', e);
      this.contentContainer.innerHTML = `<p class="sidebar-error">Could not load files.</p>`;
    }
  }

  /**
   * Fetches and renders the list of all available gardens from localStorage.
   */
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

  /**
   * Recursively lists all files in a directory, ignoring '.git'.
   * @param {string} dir The directory to start from.
   * @returns {Promise<string[]>} A list of file paths.
   */
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
        } catch (e) {
          console.warn(`Could not stat ${path}, skipping.`);
        }
      }
    } catch (e) {
        console.log(`Directory not found: ${dir}. No files to list.`);
    }
    return fileList;
  }
}
