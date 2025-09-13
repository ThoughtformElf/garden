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
    this.container = document.querySelector(this.targetSelector);
    if (!this.container) {
      console.error(`Sidebar container not found: ${this.targetSelector}`);
      return;
    }
  }

  /**
   * Initializes the sidebar by listing and rendering repository files.
   */
  async init() {
    console.log('Initializing sidebar...');
    try {
      const files = await this.listFiles('/');
      this.render(files);
      console.log('Sidebar initialized.');
    } catch (e) {
      console.error('Error initializing sidebar:', e);
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
   * Renders the list of files as HTML links.
   * @param {string[]} files An array of file paths.
   */
  render(files) {
    const fileListHTML = files.sort().map(file => {
      // Create hash-based links.
      const href = `#${file}`;
      return `<li><a href="${href}">${file}</a></li>`;
    }).join('');
    this.container.innerHTML = `<ul>${fileListHTML}</ul>`;
  }
}
