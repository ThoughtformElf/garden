import git from 'isomorphic-git';

export const gitBranchingActions = {
  async listBranches() {
    try {
      const branches = await git.listBranches({ fs: this.fs, dir: '/' });
      const currentBranch = await git.currentBranch({ fs: this.fs, dir: '/', fullname: false });
      return { branches, currentBranch };
    } catch (e) {
      console.error("Error listing branches:", e);
      return { branches: [], currentBranch: null };
    }
  },

  async branch(branchName) {
    return git.branch({ fs: this.fs, dir: '/', ref: branchName });
  },

  async checkout(branchName) {
    return git.checkout({ fs: this.fs, dir: '/', ref: branchName });
  }
};