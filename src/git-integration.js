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
    this.fs = new FS(`garden-fs-${this.gardenName}`);
    this.pfs = this.fs.promises;
  }

  async initRepo() {
    try {
      await this.pfs.stat('/.git');
      console.log(`Garden "${this.gardenName}" already exists. Loading it.`);
      return;
    } catch (e) {
      // Not an existing repo, so initialize it.
    }

    console.log(`Initializing new garden: "${this.gardenName}"...`);
    try {
      await git.init({
        fs: this.fs,
        dir: '/',
        defaultBranch: 'main'
      });

      const defaultContent = `# Welcome to your new garden: ${this.gardenName}\n\nStart writing your thoughts here.`;
      await this.pfs.writeFile('/README', defaultContent, 'utf8');

      this.registerNewGarden();
      console.log('New garden initialized successfully.');
    } catch (e) {
      console.error('Error initializing repository:', e);
    }
  }
  
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

  async readFile(filepath) {
    try {
      const content = await this.pfs.readFile(filepath, 'utf8');
      return content;
    } catch (e) {
      console.warn(`File not found: ${filepath}`);
      return `// File not found: ${filepath}\n// Start typing to create it.`;
    }
  }

  async writeFile(filepath, content) {
    try {
      const dirname = filepath.substring(0, filepath.lastIndexOf('/'));
      if (dirname) {
        await this.pfs.mkdir(dirname, { recursive: true });
      }
      await this.pfs.writeFile(filepath, content, 'utf8');

      // FIX: Mark this garden as dirty in the global registry
      this.markGardenAsDirty(true);

    } catch (e) {
      console.error(`Error writing file ${filepath}:`, e);
    }
  }

  markGardenAsDirty(isDirty) {
    try {
      const dirtyRaw = localStorage.getItem('dirty_gardens');
      const dirtyGardens = dirtyRaw ? JSON.parse(dirtyRaw) : [];
      const gardenIndex = dirtyGardens.indexOf(this.gardenName);

      if (isDirty && gardenIndex === -1) {
        dirtyGardens.push(this.gardenName);
      } else if (!isDirty && gardenIndex !== -1) {
        dirtyGardens.splice(gardenIndex, 1);
      }
      
      localStorage.setItem('dirty_gardens', JSON.stringify(dirtyGardens));
    } catch (e) {
      console.error('Failed to update dirty garden registry:', e);
    }
  }

  async getStatuses() {
    const statusMatrix = await git.statusMatrix({ fs: this.fs, dir: '/' });
    const statuses = new Map();
    for (const [filepath, head, workdir, stage] of statusMatrix) {
      statuses.set(`/${filepath}`, workdir === 2 ? 'modified' : 'unmodified');
    }
    return statuses;
  }
}
