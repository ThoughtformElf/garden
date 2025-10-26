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
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Could not parse remote config from localStorage", e);
    }
    // Default configuration with the specified CORS proxy
    return { 
      url: '', 
      auth: '', 
      corsProxy: 'http://localhost:8081' 
    };
  },

  saveRemoteConfig(url, auth, corsProxy) {
    const key = `thoughtform_remote_config_${this.gitClient.gardenName}`;
    const config = { url, auth, corsProxy };
    localStorage.setItem(key, JSON.stringify(config));
  },
};