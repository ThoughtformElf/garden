// src/sidebar-git.js

export const gitActions = {
  async renderGitView() {
    try {
      const statusMatrix = await this.gitClient.getStatuses();
      const stagedFiles = [];
      const unstagedFiles = [];

      for (const [filepath, head, workdir, stage] of statusMatrix) {
        const path = `/${filepath}`;
        if (head !== workdir || head !== stage) {
          if (workdir === stage) {
            stagedFiles.push({ filepath: path, status: 'staged' });
          } else {
            unstagedFiles.push({ filepath: path, status: 'unstaged' });
          }
        }
      }

      const commitAreaHTML = `
        <div class="git-commit-area">
          <textarea id="git-commit-message" placeholder="Commit message..." rows="3"></textarea>
          <button id="git-commit-button" disabled>Commit</button>
        </div>
      `;

      const stagedFilesHTML = this.renderFileSection('Staged Changes', stagedFiles, true);
      const unstagedFilesHTML = this.renderFileSection('Changes', unstagedFiles, false);

      const oldMessage = this.contentContainer.querySelector('#git-commit-message')?.value || '';

      this.contentContainer.innerHTML = `
        <div class="git-view-container">
          ${commitAreaHTML}
          ${stagedFilesHTML}
          ${unstagedFilesHTML}
        </div>
      `;
      
      const newMessageInput = this.contentContainer.querySelector('#git-commit-message');
      if (newMessageInput) {
          newMessageInput.value = oldMessage;
      }

      this.addGitViewListeners();
      this.updateCommitButtonState();
    } catch (e) {
      console.error('Error rendering Git view:', e);
      this.contentContainer.innerHTML = `<p class="sidebar-error">Could not load Git status.</p>`;
    }
  },

  renderFileSection(title, files, isStaged) {
    const actionButton = isStaged
      ? `<button class="git-action-button" title="Unstage Changes">-</button>`
      : `<button class="git-action-button" title="Stage Changes">+</button>`;
      
    let fileListHTML = '';
    if (files.length > 0) {
      fileListHTML = files.map(file => {
        const displayText = file.filepath.startsWith('/') ? file.filepath.substring(1) : file.filepath;
        return `
          <li class="git-file-item" data-filepath="${file.filepath}">
            <span class="git-file-path">${displayText}</span>
            <span class="git-file-actions">
              <button class="git-action-button discard" title="Discard Changes">⭯</button>
              ${actionButton}
            </span>
          </li>
        `;
      }).join('');
    } else {
      fileListHTML = `<li><span class="no-changes">No ${isStaged ? 'staged ' : ''}changes.</span></li>`;
    }
    
    // Add a specific class for the staged section for a more reliable query selector
    const sectionClass = isStaged ? 'git-staged-section' : '';

    return `
      <div class="git-file-section ${sectionClass}">
        <h3 class="git-section-header">${title} (${files.length})</h3>
        <ul class="git-file-list">
          ${fileListHTML}
        </ul>
      </div>
    `;
  },
  
  updateCommitButtonState() {
      const commitMessage = this.contentContainer.querySelector('#git-commit-message');
      const commitButton = this.contentContainer.querySelector('#git-commit-button');
      if (!commitMessage || !commitButton) return;

      // Use the specific class for a robust check.
      const hasStagedFiles = this.contentContainer.querySelector('.git-staged-section .git-file-item') !== null;
      const hasMessage = commitMessage.value.trim().length > 0;
      
      // The button should be enabled only when BOTH conditions are true.
      commitButton.disabled = !(hasStagedFiles && hasMessage);
  },

  addGitViewListeners() {
    const commitMessage = this.contentContainer.querySelector('#git-commit-message');
    if (commitMessage && !commitMessage.dataset.listenerAttached) {
        commitMessage.dataset.listenerAttached = 'true';
        commitMessage.addEventListener('input', () => this.updateCommitButtonState());
    }
    
    const viewContainer = this.contentContainer.querySelector('.git-view-container');
    if (viewContainer && !viewContainer.dataset.listenerAttached) {
        viewContainer.dataset.listenerAttached = 'true';
        viewContainer.addEventListener('click', async (e) => {
            const target = e.target;
            const fileItem = target.closest('.git-file-item');
            if (!fileItem) return;

            const filepath = fileItem.dataset.filepath;

            if (target.matches('.git-file-path')) {
                if (this.editor.getFilePath(window.location.hash) !== filepath) {
                    await this.editor.loadFile(filepath);
                }
                this.editor.showDiff(filepath);
            } else if (target.matches('.git-action-button')) {
                e.stopPropagation();
                if (target.classList.contains('discard')) {
                    if (confirm(`Are you sure you want to discard all changes to "${filepath}"?\nThis cannot be undone.`)) {
                        await this.gitClient.discard(filepath);
                        if (this.editor.getFilePath(window.location.hash) === filepath) {
                            await this.editor.loadFile(filepath);
                        }
                        await this.renderGitView();
                    }
                } else {
                    if (target.textContent === '+') {
                        await this.gitClient.stage(filepath);
                    } else {
                        await this.gitClient.unstage(filepath);
                    }
                    await this.renderGitView();
                }
            }
        });
    }

    const commitButton = this.contentContainer.querySelector('#git-commit-button');
    if (commitButton && !commitButton.dataset.listenerAttached) {
        commitButton.dataset.listenerAttached = 'true';
        commitButton.addEventListener('click', async () => {
            const messageInput = this.contentContainer.querySelector('#git-commit-message');
            const message = messageInput.value.trim();
            if (!message) return; // Should be disabled anyway, but as a safeguard.
            
            try {
                commitButton.disabled = true;
                commitButton.textContent = 'Committing...';
                await this.gitClient.commit(message);
                this.editor.hideDiff();
                await this.refresh();
            } catch (err) {
                console.error('Commit failed:', err);
                alert('Commit failed. See console for details.');
                this.updateCommitButtonState();
                commitButton.textContent = 'Commit';
            }
        });
    }
  }
};
