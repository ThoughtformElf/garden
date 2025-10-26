import { GitUI } from './ui.js';
import { GitEvents } from './events.js';

export const gitActions = {
  async renderGitView(conflictedFiles = []) {
    try {
      const [statusMatrix, commits, branchInfo] = await Promise.all([
        this.gitClient.getStatuses(),
        this.gitClient.log(),
        this.gitClient.listBranches()
      ]);

      const gitUI = new GitUI(this);
      const gitEvents = new GitEvents(this);

      const oldMessage = this.contentContainer.querySelector('#git-commit-message')?.value || '';
      
      // THIS IS THE FIX (Part 3)
      this.contentContainer.innerHTML = gitUI.render(statusMatrix, commits, branchInfo, conflictedFiles);
      
      const newMessageInput = this.contentContainer.querySelector('#git-commit-message');
      if (newMessageInput) {
          newMessageInput.value = oldMessage;
      }

      gitEvents.addListeners();
      this.updateCommitButtonState();

    } catch (e) {
      console.error('Error rendering Git view:', e);
      this.contentContainer.innerHTML = `<p class="sidebar-error">Could not load Git status.</p>`;
    }
  },
  
  updateCommitButtonState() {
    new GitUI(this).updateCommitButtonState();
  },

  getRemoteConfig() {
    const key = `thoughtform_remote_config_${this.gitClient.gardenName}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.url) return parsed;
      }
    } catch (e) {
      console.error("Could not parse remote config from localStorage", e);
    }
    return { url: `http://localhost:8081/${this.gitClient.gardenName}` };
  },

  saveRemoteConfig(url) {
    const key = `thoughtform_remote_config_${this.gitClient.gardenName}`;
    const config = { url };
    localStorage.setItem(key, JSON.stringify(config));
  },
};