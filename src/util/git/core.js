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
      this.registerNewGarden();
      return;
    } catch (e) {
      // Not an existing repo, so initialize it
    }

    console.log(`Initializing new garden: "${this.gardenName}"...`);
    try {
      await git.init({
        fs: this.fs,
        dir: '/',
        defaultBranch: 'main'
      });

      const defaultContent = `# Welcome to your new garden: ${this.gardenName}\n\nStart writing your thoughts here.`;
      await this.pfs.writeFile('/home', defaultContent, 'utf8');

      // --- THIS IS THE FIX ---
      // Stage the initial 'home' file.
      await git.add({ fs: this.fs, dir: '/', filepath: 'home' });

      // Create the very first commit for the repository.
      await git.commit({
        fs: this.fs,
        dir: '/',
        message: 'Initial commit',
        author: { name: 'Thoughtform Garden', email: 'system@thoughtform.garden' }
      });
      // --- END OF FIX ---

      this.registerNewGarden();
      console.log('New garden initialized successfully with initial commit.');
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

  async rmrf(path) {
    try {
        const stat = await this.pfs.stat(path);
        if (stat.isDirectory()) {
            const entries = await this.pfs.readdir(path);
            for (const entry of entries) {
                // Ensure correct path joining, especially for root
                const entryPath = path === '/' ? `/${entry}` : `${path}/${entry}`;
                await this.rmrf(entryPath);
            }
            // Do not attempt to remove the root directory itself.
            if (path !== '/') {
              await this.pfs.rmdir(path);
            }
        } else {
            await this.pfs.unlink(path);
        }
    } catch (e) {
        if (e.code !== 'ENOENT') { 
            console.error(`Error during rmrf for ${path}:`, e);
            throw e;
        }
    }
  }

  async clearWorkdir() {
    const entries = await this.pfs.readdir('/');
    for (const entry of entries) {
      if (entry !== '.git') {
        await this.rmrf(`/${entry}`);
      }
    }
  }

  async ensureDir(dirPath) {
    const parts = dirPath.split('/').filter(p => p);
    let currentPath = '';
    for (const part of parts) {
      currentPath += `/${part}`;
      try {
        const stat = await this.pfs.stat(currentPath);
        if (!stat.isDirectory()) {
          throw new Error(`A file exists at '${currentPath}' which conflicts with the desired directory structure.`);
        }
      } catch (e) {
        if (e.code === 'ENOENT') {
          try {
            await this.pfs.mkdir(currentPath);
          } catch (mkdirError) {
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

  async listAllFilesForClone(dir = '/') {
    let fileList = [];
    const items = await this.pfs.readdir(dir);
    for (const item of items) {
      const path = `${dir === '/' ? '' : dir}/${item}`;
      const stat = await this.pfs.stat(path);
      if (stat.isDirectory()) {
        fileList = fileList.concat(await this.listAllFilesForClone(path));
      } else {
        fileList.push(path);
      }
    }
    return fileList;
  }
  
  async readFile(filepath) {
    const absolutePath = filepath.startsWith('/') ? filepath : `/${filepath}`;
    try {
      return await this.pfs.readFile(absolutePath, 'utf8');
    } catch (e) {
        if (e.code === 'ENOENT') {
            throw new Error(`File "${absolutePath.substring(1)}" does not exist.`);
        }
        throw e;
    }
  }
  
  async readFileAsBuffer(filepath) {
    const absolutePath = filepath.startsWith('/') ? filepath : `/${filepath}`;
    try {
      return await this.pfs.readFile(absolutePath);
    } catch (e) {
      return null;
    }
  }

  async writeFile(filepath, content) {
    const absolutePath = filepath.startsWith('/') ? filepath : `/${filepath}`;
    const options = typeof content === 'string' ? 'utf8' : undefined;
    try {
      const dirname = absolutePath.substring(0, absolutePath.lastIndexOf('/'));
      if (dirname) {
        await this.ensureDir(dirname);
      }
      await this.pfs.writeFile(absolutePath, content, options);
      this.markGardenAsDirty(true);
    } catch (e) {
      console.error(`[Git.writeFile] Failed to write to ${absolutePath}:`, e);
      throw e;
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
}