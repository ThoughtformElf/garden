import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { diff3Merge } from 'node-diff3';

export const gitRemoteActions = {
  async push(url, onProgress, force = false) {
    return await git.push({
      fs: this.fs, http, dir: '/', url: url,
      force: force,
      onProgress: (e) => onProgress(`${e.phase}: ${e.loaded}/${e.total}`),
    });
  },

  async pull(url, onProgress, force = false) {
    const author = { name: 'User', email: 'user@thoughtform.garden' };
    
    onProgress('Fetching from remote...');
    const fetchResult = await git.fetch({
      fs: this.fs, http, dir: '/', url: url,
      ref: 'main',
      singleBranch: true,
      onProgress: (e) => onProgress(`Fetch: ${e.phase}`),
    });
    const theirOid = fetchResult.fetchHead;

    if (!theirOid) {
        onProgress('Already up-to-date.');
        return;
    }

    onProgress('Merging changes...');
    try {
      const mergeResult = await git.merge({
        fs: this.fs,
        dir: '/',
        ours: 'main',
        theirs: theirOid,
        author: author,
      });
    } catch (e) {
      if (e.name === 'MergeConflictError') {
        onProgress('Conflict detected. Writing markers to files...');
        const conflictedFiles = e.data.filepaths;

        const ourOid = await git.resolveRef({ fs: this.fs, dir: '/', ref: 'HEAD' });
        const baseOids = await git.findMergeBase({ fs: this.fs, dir: '/', oids: [ourOid, theirOid] });
        const baseOid = baseOids[0];

        if (!baseOid) {
          throw new Error("Could not find a common ancestor for merging.");
        }

        for (const filepath of conflictedFiles) {
          const [ours, base, theirs] = await Promise.all([
            git.readBlob({ fs: this.fs, dir: '/', oid: ourOid, filepath }),
            git.readBlob({ fs: this.fs, dir: '/', oid: baseOid, filepath }),
            git.readBlob({ fs: this.fs, dir: '/', oid: theirOid, filepath })
          ]);
          
          const oursContent = ours ? new TextDecoder().decode(ours.blob).split('\n') : [];
          const baseContent = base ? new TextDecoder().decode(base.blob).split('\n') : [];
          const theirsContent = theirs ? new TextDecoder().decode(theirs.blob).split('\n') : [];

          const result = diff3Merge(oursContent, baseContent, theirsContent);
          
          const finalLines = [];
          for (const chunk of result) {
            if (chunk.ok) {
              finalLines.push(...chunk.ok);
            } else if (chunk.conflict) {
              finalLines.push('<<<<<<< HEAD');
              finalLines.push(...chunk.conflict.a);
              finalLines.push('=======');
              finalLines.push(...chunk.conflict.b);
              finalLines.push(`>>>>>>> ${theirOid.slice(0, 7)}`);
            }
          }
          const mergedText = finalLines.join('\n');

          await this.pfs.writeFile(`/${filepath}`, mergedText, 'utf8');
        }
      }
      throw e;
    }
  },
  
  async clone(url, gardenName, onProgress) {
    onProgress(`Preparing to clone into garden: "${gardenName}"...`);
  
    const dbName = `garden-fs-${gardenName}`;
    await new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(dbName);
      deleteRequest.onsuccess = () => {
        onProgress(`Cleared existing database for "${gardenName}".`);
        resolve();
      };
      deleteRequest.onerror = (e) => {
        onProgress(`Error clearing database for "${gardenName}".`);
        reject(e.target.error);
      };
      deleteRequest.onblocked = () => {
        onProgress(`Clone blocked for "${gardenName}". Please refresh and try again.`);
        reject(new Error('Clone blocked'));
      };
    });
  
    // --- THIS IS THE FUCKING FIX ---
    // DO NOT call initRepo() before clone. The clone command initializes the repository.
    // Calling it beforehand creates a separate, conflicting repository history.
    
    const gitServerUrl = 'http://localhost:8081';
    const finalUrl = `${gitServerUrl}/${url}`;

    await git.clone({
      fs: this.fs,
      http,
      dir: '/',
      url: finalUrl,
      onProgress: (e) => onProgress(`${e.phase}: ${e.total ? Math.round((e.loaded / e.total) * 100) + '%' : e.loaded}`),
      singleBranch: true,
      depth: 50,
    });
    
    // After a successful clone, the .git directory is populated but the working
    // directory is empty. We must explicitly check out the files from the HEAD.
    onProgress('Checking out files...');
    await git.checkout({
      fs: this.fs,
      dir: '/',
      force: true,
    });
    // --- END OF FIX ---
  
    this.registerNewGarden();
    onProgress('Clone complete!');
  }
};