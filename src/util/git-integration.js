import FS from '@isomorphic-git/lightning-fs';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { defaultFiles } from '../settings/defaults.js';

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

      if (this.gardenName === 'Settings') {
        await this.populateDefaultSettings();
      } else {
        const defaultContent = `# Welcome to your new garden: ${this.gardenName}\n\nStart writing your thoughts here.`;
        await this.pfs.writeFile('/home', defaultContent, 'utf8');
      }

      this.registerNewGarden();
      console.log('New garden initialized successfully.');
    } catch (e) {
      console.error('Error initializing repository:', e);
    }
  }
  
  async populateDefaultSettings() {
    console.log('[Git] Populating "Settings" garden with default files...');
    // The writeFile method now handles creating directories automatically,
    // so explicit ensureDir calls here were redundant and a source of bugs.
    // They have been removed for simplicity and correctness.
    
    for (const [path, content] of defaultFiles) {
      try {
        await this.writeFile(path, content, 'utf8');
      } catch (error) {
        console.error(`[Git] Failed to write default setting file: ${path}`, error);
      }
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
                await this.rmrf(`${path}/${entry}`);
            }
            await this.pfs.rmdir(path);
        } else {
            await this.pfs.unlink(path);
        }
    } catch (e) {
        if (e.code !== 'ENOENT') { // Ignore if file/dir doesn't exist
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

  async stage(filepath) {
    const cleanPath = filepath.startsWith('/') ? filepath.substring(1) : filepath;
    const matrix = await this.getStatuses();
    const statusEntry = matrix.find(row => row[0] === cleanPath);

    if (!statusEntry) {
      console.error(`Could not find status for "${cleanPath}". Cannot stage.`);
      return;
    }

    const workdirStatus = statusEntry[2];

    if (workdirStatus === 0) {
      await git.remove({ fs: this.fs, dir: '/', filepath: cleanPath });
    } else {
      await git.add({ fs: this.fs, dir: '/', filepath: cleanPath });
    }
  }

  async unstage(filepath) {
    const cleanPath = filepath.startsWith('/') ? filepath.substring(1) : filepath;
    await git.remove({ fs: this.fs, dir: '/', filepath: cleanPath });
  }

  async discard(filepath) {
    const cleanPath = filepath.startsWith('/') ? filepath.substring(1) : filepath;
    try {
        const statusMatrix = await this.getStatuses();
        const statusEntry = statusMatrix.find(entry => entry[0] === cleanPath);
        if (!statusEntry) return;
        const headStatus = statusEntry[1];
        if (headStatus === 0) {
            await this.pfs.unlink(filepath);
            window.thoughtform.events.publish('file:delete', { path: filepath, isDirectory: false, gardenName: this.gardenName });
        } else {
            await git.checkout({ fs: this.fs, dir: '/', filepaths: [cleanPath], force: true });
        }
    } catch (error) {
        console.error(`[discard] An error occurred for ${filepath}:`, error);
    }
  }

  async commit(message) {
    const sha = await git.commit({
      fs: this.fs,
      dir: '/',
      message,
      author: { name: 'User', email: 'user@thoughtform.garden' }
    });
    this.markGardenAsDirty(false);
    return sha;
  }
  
  async push(url, token, onProgress) {
    return await git.push({
      fs: this.fs, http, dir: '/', url: url,
      onProgress: (e) => onProgress(`${e.phase}: ${e.loaded}/${e.total}`),
      onAuth: () => ({ username: token }),
    });
  }

  async pull(url, token, onProgress) {
    return await git.pull({
      fs: this.fs, http, dir: '/', url: url,
      onProgress: (e) => onProgress(`${e.phase}: ${e.loaded}/${e.total}`),
      onAuth: () => ({ username: token }),
      author: { name: 'User', email: 'user@thoughtform.garden' },
      singleBranch: true, fastForward: true,
    });
  }

  async log() {
    try {
      return await git.log({ fs: this.fs, dir: '/', depth: 20 });
    } catch (e) {
      return [];
    }
  }

  async getChangedFiles(oid) {
    try {
      const { commit } = await git.readCommit({ fs: this.fs, dir: '/', oid });
      const parentOid = commit.parent[0];
      if (!parentOid) return (await git.listFiles({ fs: this.fs, dir: '/', ref: oid })).map(f => `/${f}`);
      const files = [];
      await git.walk({
        fs: this.fs, dir: '/', trees: [git.TREE({ ref: parentOid }), git.TREE({ ref: oid })],
        map: async (filepath, [A, B]) => {
          if (filepath === '.') return;
          const aOid = A && await A.oid();
          const bOid = B && await B.oid();
          if (aOid === bOid) return;
          const type = B ? await B.type() : await A.type();
          if (type === 'blob') files.push(`/${filepath}`);
        }
      });
      return files;
    } catch (e) {
      console.error(`Error getting changed files for commit ${oid}:`, e);
      return [];
    }
  }

  async readBlob(filepath) {
    return this.readBlobFromCommit('HEAD', filepath);
  }

  async readBlobFromCommit(oid, filepath) {
    const cleanPath = filepath.startsWith('/') ? filepath.substring(1) : filepath;
    if (!oid) return '';
    try {
      const commitOid = oid === 'HEAD' ? await git.resolveRef({ fs: this.fs, dir: '/', ref: 'HEAD' }) : oid;
      const { blob } = await git.readBlob({ fs: this.fs, dir: '/', oid: commitOid, filepath: cleanPath });
      return new TextDecoder().decode(blob);
    } catch (e) {
      if (e.name === 'NotFoundError') return '';
      return null;
    }
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

  async getStatuses() {
    return git.statusMatrix({ fs: this.fs, dir: '/' });
  }
}