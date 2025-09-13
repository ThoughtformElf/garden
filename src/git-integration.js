import FS from '@isomorphic-git/lightning-fs';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';

/**
 * @class Git
 * @description Encapsulates all isomorphic-git and file system functionality.
 * This class can be instantiated once and shared across multiple editor instances.
 */
class Git {
  constructor() {
    this.REPO_URL = 'https://github.com/thoughtforms/garden';
    this.CORS_PROXY = 'https://cors.isomorphic-git.org';
    this.fs = new FS('garden-fs');
    this.pfs = this.fs.promises;
  }

  /**
   * Checks if the repository has already been cloned and clones it if not.
   */
  async cloneRepo() {
    let isCloned = false;
    try {
      await this.pfs.stat('/.git');
      isCloned = true;
    } catch (e) {
      isCloned = false;
    }

    if (isCloned) {
      console.log('Repository already cloned.');
      return;
    }

    console.log('Cloning repository...');
    try {
      await git.clone({
        fs: this.fs,
        http,
        dir: '/',
        url: this.REPO_URL,
        corsProxy: this.CORS_PROXY,
        singleBranch: true,
        depth: 10,
      });
      console.log('Clone complete.');
    } catch (e) {
      console.error('Error cloning repository:', e);
    }
  }

  /**
   * Reads the content of a file from the virtual file system.
   * @param {string} filepath The path to the file.
   * @returns {Promise<string>} The file content or a not-found message.
   */
  async readFile(filepath) {
    try {
      const content = await this.pfs.readFile(filepath, 'utf8');
      return content;
    } catch (e) {
      console.warn(`File not found: ${filepath}`);
      return `// File not found: ${filepath}`;
    }
  }

  /**
   * Writes content to a file in the virtual file system.
   * @param {string} filepath The path to the file.
   * @param {string} content The content to write.
   */
  async writeFile(filepath, content) {
    try {
      await this.pfs.writeFile(filepath, content, 'utf8');
    } catch (e) {
      console.error(`Error writing file ${filepath}:`, e);
    }
  }

  /**
   * Gets the git status for all files in the repository.
   * @returns {Promise<Map<string, string>>} A map of filepaths to their status.
   */
  async getStatuses() {
    const statusMatrix = await git.statusMatrix({ fs: this.fs, dir: '/' });
    const statuses = new Map();
    for (const [filepath, head, workdir, stage] of statusMatrix) {
      // For our purpose, we only care if the working directory is modified.
      // 1 means unmodified, 2 means modified.
      statuses.set(`/${filepath}`, workdir === 2 ? 'modified' : 'unmodified');
    }
    return statuses;
  }
}

// Create and export a single instance to be shared across modules
export const gitClient = new Git();
