import git from 'isomorphic-git';

export const gitStateActions = {
  async stage(filepath) {
    const cleanPath = filepath.startsWith('/') ? filepath.substring(1) : filepath;
    await git.add({ fs: this.fs, dir: '/', filepath: cleanPath });
  },

  async unstage(filepath) {
    const cleanPath = filepath.startsWith('/') ? filepath.substring(1) : filepath;
    await git.remove({ fs: this.fs, dir: '/', filepath: cleanPath });
  },

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
  },

  async commit(message) {
    const sha = await git.commit({
      fs: this.fs,
      dir: '/',
      message,
      author: { name: 'User', email: 'user@thoughtform.garden' }
    });
    this.markGardenAsDirty(false);
    return sha;
  },

  async log() {
    try {
      return await git.log({ fs: this.fs, dir: '/', depth: 20 });
    } catch (e) {
      return [];
    }
  },

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
  },

  async readBlob(filepath) {
    return this.readBlobFromCommit('HEAD', filepath);
  },

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
  },

  async getStatuses() {
    return git.statusMatrix({ fs: this.fs, dir: '/' });
  }
};