// src/git-integration.js

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
      await this.pfs.writeFile('/README.md', defaultContent, 'utf8');

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
    console.log(`[discard] Starting discard for: ${filepath}`);
    const cleanPath = filepath.startsWith('/') ? filepath.substring(1) : filepath;
    
    try {
        const statusMatrix = await this.getStatuses();
        const statusEntry = statusMatrix.find(entry => entry[0] === cleanPath);

        if (!statusEntry) {
            console.warn(`[discard] Could not find status for "${cleanPath}".`);
            return;
        }

        const headStatus = statusEntry[1];
        
        if (headStatus === 0) {
            console.log(`[discard] File is untracked. Deleting: ${filepath}`);
            await this.pfs.unlink(filepath);
            console.log(`[discard] Successfully unlinked ${filepath}.`);
        } else {
            console.log(`[discard] File is tracked. Force checking out from HEAD: ${cleanPath}`);
            await git.checkout({
                fs: this.fs,
                dir: '/',
                filepaths: [cleanPath],
                force: true
            });
            console.log(`[discard] Successfully checked out ${cleanPath}.`);
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
      author: {
        name: 'User',
        email: 'user@thoughtform.garden'
      }
    });
    this.markGardenAsDirty(false);
    return sha;
  }

  async log() {
    try {
      return await git.log({
        fs: this.fs,
        dir: '/',
        depth: 20
      });
    } catch (e) {
      console.log('No commit history found.');
      return [];
    }
  }

  async getChangedFiles(oid) {
    try {
      const commit = await git.readCommit({ fs: this.fs, dir: '/', oid });
      const parentOid = commit.commit.parent[0];
      
      if (!parentOid) {
        // For the initial commit, list all files (which are guaranteed to be blobs)
        const files = await git.listFiles({ fs: this.fs, dir: '/', ref: oid });
        return files.map(f => `/${f}`);
      }

      const files = [];
      await git.walk({
        fs: this.fs,
        dir: '/',
        trees: [git.TREE({ ref: parentOid }), git.TREE({ ref: oid })],
        map: async function(filepath, [A, B]) {
          if (filepath === '.') return;

          const aOid = A ? await A.oid() : null;
          const bOid = B ? await B.oid() : null;
          
          if (aOid === bOid) return; // Unchanged, ignore.

          // THE FIX:
          // Determine the type of the entry. If B exists, use its type. 
          // If B doesn't exist (deletion), use A's type.
          const type = B ? await B.type() : (A ? await A.type() : null);

          // Only include blobs (files) in the final list. Ignore trees (directories).
          if (type === 'blob') {
            files.push(`/${filepath}`);
          }
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
    // This is the critical fix: always remove leading slashes.
    const cleanPath = filepath.startsWith('/') ? filepath.substring(1) : filepath;
    if (!oid) return ''; // A commit with no parent has no content to read.
    
    try {
      const commitOid = oid === 'HEAD' ? await git.resolveRef({ fs: this.fs, dir: '/', ref: 'HEAD' }) : oid;
      
      const { blob } = await git.readBlob({
        fs: this.fs,
        dir: '/',
        oid: commitOid,
        filepath: cleanPath
      });
      return new TextDecoder().decode(blob);
    } catch (e) {
      if (e.name === 'NotFoundError') {
        return '';
      }
      console.error(`Could not read blob for ${cleanPath} from commit ${oid}:`, e);
      return null;
    }
  }

  async readFile(filepath) {
    try {
      const content = await this.pfs.readFile(filepath, 'utf8');
      return content;
    } catch (e) {
      console.warn(`File not found: ${filepath}`);
      return `// "${filepath}" does not exist yet, type anywhere to create it.`;
    }
  }

  /**
   * Writes content to a file, creating parent directories if needed.
   * @param {string} filepath The path to the file (e.g., '/prompt/youtube-summary.md').
   * @param {string} content The content to write.
   */
  async writeFile(filepath, content) {
    try {
      await this.pfs.writeFile(filepath, content, 'utf8');
      this.markGardenAsDirty(true);
    } catch (e) {
      // If the error is that the file's parent directory doesn't exist, create it and retry.
      if (e.code === 'ENOENT') {
        try {
          const dirname = filepath.substring(0, filepath.lastIndexOf('/'));
          if (dirname && dirname !== '/') {
            // --- MORE ROBUST DIRECTORY CREATION ---
            try {
              // Attempt to create the directory recursively.
              // This should handle existing directories gracefully with { recursive: true }.
              await this.pfs.mkdir(dirname, { recursive: true });
            } catch (mkdirError) {
              // If mkdir fails for any reason (including unexpected EEXIST),
              // log it, but don't necessarily stop. The subsequent writeFile might still work
              // if the directory actually exists, or it will fail with a clearer error.
              console.warn(`Warning: Could not ensure directory exists for ${filepath} (Tried to create ${dirname}):`, mkdirError.message || mkdirError);
              // Optionally, re-throw if you want the write to fail immediately:
              // throw mkdirError;
            }
            // --- END MORE ROBUST DIRECTORY CREATION ---

            // Retry writing the file after attempting directory creation.
            // If the directory still doesn't exist or isn't writable, this will fail appropriately.
            await this.pfs.writeFile(filepath, content, 'utf8');
            this.markGardenAsDirty(true);
          } else {
             // dirname was empty or just '/', which shouldn't trigger ENOENT for writeFile
             // Re-throw the original error as it's unexpected
             console.error(`Unexpected ENOENT error for filepath '${filepath}' where dirname is '${dirname}':`, e);
             throw e;
          }
        } catch (retryError) {
          // If retrying (creating dir or writing again) fails, log both errors and throw the retry error
          // as it's likely more specific to the current attempt.
          console.error(`Error after retrying write for ${filepath}. Original error:`, e.message || e);
          console.error(`Retry error:`, retryError.message || retryError);
          throw retryError;
        }
      } else {
        // Re-throw any error that wasn't related to a missing parent directory.
        console.error(`Error writing file ${filepath}:`, e);
        throw e;
      }
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
