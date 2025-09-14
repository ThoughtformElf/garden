// src/sidebar-git.js

export const gitActions = {
  /**
   * This is the main function for the Git tab.
   * It fetches the status of all files and renders the UI for committing and staging.
   */
  async renderGitView() {
    try {
      const statusMatrix = await this.gitClient.getStatuses();
      const stagedFiles = [];
      const unstagedFiles = [];

      for (const [filepath, status] of statusMatrix.entries()) {
        if (status === 'modified') {
          unstagedFiles.push({ filepath, status });
        }
      }

      const commitAreaHTML = `
        <div class="git-commit-area">
          <textarea id="git-commit-message" placeholder="Commit message..." rows="3"></textarea>
          <button id="git-commit-button" disabled>Commit</button>
        </div>
      `;

      const unstagedFilesHTML = this.renderFileSection('Changes', unstagedFiles);
      const stagedFilesHTML = this.renderFileSection('Staged Changes', stagedFiles);

      this.contentContainer.innerHTML = `
        <div class="git-view-container">
          ${commitAreaHTML}
          ${stagedFilesHTML}
          ${unstagedFilesHTML}
        </div>
      `;

      // Add event listeners after the HTML is in the DOM
      this.addGitViewListeners();
    } catch (e) {
      console.error('Error rendering Git view:', e);
      this.contentContainer.innerHTML = `<p class="sidebar-error">Could not load Git status.</p>`;
    }
  },

  /**
   * Helper function to render a section of files (e.g., Staged or Unstaged).
   * @param {string} title - The title of the section.
   * @param {Array<{filepath: string, status: string}>} files - The list of files.
   * @returns {string} - The HTML string for the section.
   */
  renderFileSection(title, files) {
    let fileListHTML = '';
    if (files.length > 0) {
      fileListHTML = files.map(file => {
        const displayText = file.filepath.startsWith('/') ? file.filepath.substring(1) : file.filepath;
        return `
          <li class="git-file-item" data-filepath="${file.filepath}">
            <span class="git-file-path">${displayText}</span>
            <span class="git-file-actions">
              <button class="git-action-button" title="Discard Changes">⭯</button>
              <button class="git-action-button" title="Stage Changes">+</button>
            </span>
          </li>
        `;
      }).join('');
    } else {
      fileListHTML = '<li><span class="no-changes">No changes.</span></li>';
    }

    return `
      <div class="git-file-section">
        <h3 class="git-section-header">${title} (${files.length})</h3>
        <ul class="git-file-list">
          ${fileListHTML}
        </ul>
      </div>
    `;
  },

  /**
   * Adds event listeners for the elements in the Git view.
   */
  addGitViewListeners() {
    this.contentContainer.querySelectorAll('.git-file-path').forEach(el => {
      el.addEventListener('click', async (e) => {
        const filepath = e.currentTarget.closest('.git-file-item').dataset.filepath;
        
        // If the file is not already open, load it first.
        if (this.editor.getFilePath(window.location.hash) !== filepath) {
          await this.editor.loadFile(filepath);
        }
        
        // Now, show the diff for the (now open) file.
        this.editor.showDiff(filepath);
      });
    });
  }
};
