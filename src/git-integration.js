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

  async stage(filepath) {
    const cleanPath = filepath.startsWith('/') ? filepath.substring(1) : filepath;
    await git.add({ fs: this.fs, dir: '/', filepath: cleanPath });
  }

  async unstage(filepath) {
    const cleanPath = filepath.startsWith('/') ? filepath.substring(1) : filepath;
    await git.remove({ fs: this.fs, dir: '/', filepath: cleanPath });
  }

  async discard(filepath) {
    const cleanPath = filepath.startsWith('/') ? filepath.substring(1) : filepath;
    await git.checkout({
      fs: this.fs,
      dir: '/',
      filepaths: [cleanPath]
    });
  }

  async commit(message) {
    const sha = await git.commit({
      fs: this.fs,
      dir: '/',
      message,
      author: {
        name: 'User',
        email: 'user@thoughtform.garden'
      }
    });
    // After committing, mark the garden as clean
    this.markGardenAsDirty(false);
    return sha;
  }

  async readBlob(filepath) {
    try {
      const headOid = await git.resolveRef({ fs: this.fs, dir: '/', ref: 'HEAD' });
      const { blob } = await git.readBlob({
        fs: this.fs,
        dir: '/',
        oid: headOid,
        filepath: filepath.startsWith('/') ? filepath.substring(1) : filepath
      });
      return new TextDecoder().decode(blob);
    } catch (e) {
      if (e.name === 'NotFoundError') {
        return '';
      }
      console.error(`Could not read blob for ${filepath} from HEAD:`, e);
      return null;
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
    return git.statusMatrix({ fs: this.fs, dir: '/' });
  }
}
