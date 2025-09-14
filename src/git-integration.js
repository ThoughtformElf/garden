import FS from '@isomorphic-git/lightning-fs';
import git from 'isomorphic-git';

/**
 * @class Git
 * @description Encapsulates all isomorphic-git and file system functionality
 * for a SINGLE garden.
 */
export class Git {
  /**
   * @param {string} gardenName The unique name for this garden/database.
   */
  constructor(gardenName) {
    if (!gardenName) {
      throw new Error('A garden name is required to initialize the Git client.');
    }
    this.gardenName = gardenName;
    // The FS name is now dynamic, creating a separate DB for each garden
    this.fs = new FS(`garden-fs-${this.gardenName}`);
    this.pfs = this.fs.promises;
  }

  /**
   * Initializes a new git repository in the filesystem if one doesn't exist.
   * This replaces the old cloneRepo method.
   */
  async initRepo() {
    let isInitialized = false;
    try {
      // Check for the .git directory to see if it's an existing repo
      await this.pfs.stat('/.git');
      isInitialized = true;
      console.log(`Garden "${this.gardenName}" already exists. Loading it.`);
    } catch (e) {
      isInitialized = false;
    }

    if (isInitialized) {
      return; // Nothing more to do
    }

    // If not initialized, create a new repository from scratch
    console.log(`Initializing new garden: "${this.gardenName}"...`);
    try {
      await git.init({
        fs: this.fs,
        dir: '/',
        defaultBranch: 'main' // Use 'main' as the modern default
      });

      // Create a default README for the new garden
      const defaultContent = `# Welcome to your new garden: ${this.gardenName}\n\nStart writing your thoughts here.`;
      await this.pfs.writeFile('/README', defaultContent, 'utf8');

      // Add the new garden to our central registry in localStorage
      this.registerNewGarden();
      
      console.log('New garden initialized successfully.');
    } catch (e) {
      console.error('Error initializing repository:', e);
    }
  }
  
  /**
   * Adds the current garden's name to the registry in localStorage.
   */
  registerNewGarden() {
    try {
      const gardensRaw = localStorage.getItem('thoughtform_gardens');
      const gardens = gardensRaw ? JSON.parse(gardensRaw) : [];
      if (!gardens.includes(this.gardenName)) {
        gardens.push(this.gardenName);
        localStorage.setItem('thoughtform_gardens', JSON.stringify(gardens));
      }
    } catch (e) {
      console.error('Failed to update garden registry:', e);
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
      return `// File not found: ${filepath}\n// Start typing to create it.`;
    }
  }

  /**
   * Writes content to a file in the virtual file system.
   * @param {string} filepath The path to the file.
   * @param {string} content The content to write.
   */
  async writeFile(filepath, content) {
    try {
      // Ensure directory exists
      const dirname = filepath.substring(0, filepath.lastIndexOf('/'));
      if (dirname) {
        await this.pfs.mkdir(dirname, { recursive: true });
      }
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
