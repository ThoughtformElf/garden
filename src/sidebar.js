import { gitClient } from './git-integration.js';
/**
 * @class Sidebar
 * @description Manages the file listing sidebar.
 */
export class Sidebar {
  /**
   * @param {Object} options Configuration for the sidebar.
   * @param {string} options.target A CSS selector for the container element.
   */
  constructor({ target }) {
    this.targetSelector = target;
    const container = document.querySelector(this.targetSelector);
    if (!container) {
      console.error(`Sidebar container not found: ${this.targetSelector}`);
      return;
    }
    this.container = container;
    // Create a dedicated element for the file list to avoid overwriting other controls.
    this.listContainer = document.createElement('div');
    this.container.appendChild(this.listContainer);
  }
  /**
   * Initializes the sidebar by listing and rendering repository files.
   */
  async init() {
    console.log('Initializing sidebar...');
    await this.refresh();
    console.log('Sidebar initialized.');
  }
  /**
   * Re-fetches files and statuses and re-renders the sidebar.
   */
  async refresh() {
    try {
      const [files, statuses] = await Promise.all([
        this.listFiles('/'),
        gitClient.getStatuses()
      ]);
      this.render(files, statuses);
    } catch (e) {
      console.error('Error refreshing sidebar:', e);
    }
  }
  /**
   * Recursively lists all files in a directory, ignoring '.git'.
   * @param {string} dir The directory to start from.
   * @returns {Promise<string[]>} A list of file paths.
   */
  async listFiles(dir) {
    const pfs = gitClient.pfs;
    let fileList = [];
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
        // Ignore errors for symlinks or other unstat-able files
        console.warn(`Could not stat ${path}, skipping.`);
      }
    }
    return fileList;
  }
  /**
   * Renders the list of files as HTML links with status and active classes.
   * @param {string[]} files An array of file paths.
   * @param {Map<string, string>} statuses A map of filepaths to their git status.
   */
  render(files, statuses) {
    const currentFile = window.location.hash.substring(1); // Get file from hash (e.g., /README.md)
    const fileListHTML = files.sort().map(file => {
      const href = `#${file}`;
      const status = statuses.get(file) || 'unmodified';
      
      const classes = [`status-${status}`];
      if (file === currentFile) {
        classes.push('active');
      }
      return `<li><a href="${href}" class="${classes.join(' ')}">${file}</a></li>`;
    }).join('');
    this.listContainer.innerHTML = `<ul>${fileListHTML}</ul>`;
  }
}
