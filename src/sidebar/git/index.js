import { GitUI } from './ui.js';
import { GitEvents } from './events.js';

export const gitActions = {
  async renderGitView() {
    try {
      // The `this` context is the Sidebar instance itself.
      const [statusMatrix, commits] = await Promise.all([
        this.gitClient.getStatuses(),
        this.gitClient.log()
      ]);

      // Instantiate helpers with the sidebar context
      const gitUI = new GitUI(this);
      const gitEvents = new GitEvents(this);

      // Preserve the commit message across re-renders
      const oldMessage = this.contentContainer.querySelector('#git-commit-message')?.value || '';
      
      // Use the UI helper to generate the HTML
      this.contentContainer.innerHTML = gitUI.render(statusMatrix, commits);
      
      const newMessageInput = this.contentContainer.querySelector('#git-commit-message');
      if (newMessageInput) {
          newMessageInput.value = oldMessage;
      }

      // Use the events helper to attach all listeners
      gitEvents.addListeners();
      
      // Use the UI helper to set the initial button state
      this.updateCommitButtonState();

    } catch (e) {
      console.error('Error rendering Git view:', e);
      this.contentContainer.innerHTML = `<p class="sidebar-error">Could not load Git status.</p>`;
    }
  },

  // The methods below are now delegated to the helper classes but are kept on the
  // sidebar instance's API for convenience, as they are called by the event handlers.
  
  updateCommitButtonState() {
    new GitUI(this).updateCommitButtonState();
  },

  getRemoteConfig() {
    const key = `thoughtform_remote_config_${this.gitClient.gardenName}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error("Could not parse remote config from localStorage", e);
    }
    return { url: '', auth: '' };
  },

  saveRemoteConfig(url, auth) {
    const key = `thoughtform_remote_config_${this.gitClient.gardenName}`;
    const config = { url, auth };
    localStorage.setItem(key, JSON.stringify(config));
  },
};