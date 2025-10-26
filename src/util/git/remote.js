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
  }
};