// src/sidebar-git.js

export const gitActions = {
  async renderGitView() {
    try {
      const [statusMatrix, commits] = await Promise.all([
        this.gitClient.getStatuses(),
        this.gitClient.log()
      ]);

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

      const unstagedFilesHTML = this.renderFileSection('Changes', unstagedFiles, false);
      const stagedFilesHTML = this.renderFileSection('Staged Changes', stagedFiles, true);
      const historyHTML = this.renderHistorySection(commits);

      const oldMessage = this.contentContainer.querySelector('#git-commit-message')?.value || '';

      this.contentContainer.innerHTML = `
        <div class="git-view-container">
          ${commitAreaHTML}
          ${stagedFilesHTML}
          ${unstagedFilesHTML}
          ${historyHTML}
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
      ? `<button class="git-action-button unstage" title="Unstage Changes">-</button>`
      : `<button class="git-action-button stage" title="Stage Changes">+</button>`;
      
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
  
  renderHistorySection(commits) {
    let historyListHTML = '';
    if (commits.length > 0) {
        historyListHTML = commits.map(commit => {
            const message = commit.commit.message.split('\n')[0];
            const shortOid = commit.oid.substring(0, 7);
            const author = commit.commit.author.name;
            const date = new Date(commit.commit.author.timestamp * 1000).toLocaleString();
            const parentOid = commit.commit.parent[0] || '';

            return `
              <li class="git-history-item" data-oid="${commit.oid}" data-parent-oid="${parentOid}" data-author="${author}" data-date="${date}">
                <div class="git-history-header">
                  <span class="git-history-message">${message}</span>
                  <span class="git-history-oid">${shortOid}</span>
                </div>
                <div class="git-history-details" style="display: none;"></div>
              </li>
            `;
        }).join('');
    } else {
        historyListHTML = '<li><span class="no-changes">No commit history.</span></li>';
    }

    return `
        <div class="git-history-section">
            <h3 class="git-section-header">History</h3>
            <ul class="git-history-list">
                ${historyListHTML}
            </ul>
        </div>
    `;
  },
  
  updateCommitButtonState() {
      const commitMessage = this.contentContainer.querySelector('#git-commit-message');
      const commitButton = this.contentContainer.querySelector('#git-commit-button');
      if (!commitMessage || !commitButton) return;

      const hasStagedFiles = this.contentContainer.querySelector('.git-staged-section .git-file-item') !== null;
      const hasMessage = commitMessage.value.trim().length > 0;
      
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
            const historyItem = target.closest('.git-history-item');

            if (fileItem) {
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
                              await this.editor.forceReloadFile(filepath);
                          }
                          await this.refresh();
                      }
                  } else if (target.classList.contains('stage')) {
                      await this.gitClient.stage(filepath);
                      await this.renderGitView();
                  } else if (target.classList.contains('unstage')) {
                      await this.gitClient.unstage(filepath);
                      await this.renderGitView();
                  }
              }
            } else if (historyItem && target.closest('.git-history-header')) {
              const detailsPanel = historyItem.querySelector('.git-history-details');
              const isVisible = detailsPanel.style.display !== 'none';
              
              if (isVisible) {
                detailsPanel.style.display = 'none';
              } else {
                detailsPanel.style.display = 'block';
                if (!detailsPanel.dataset.loaded) {
                  detailsPanel.innerHTML = '<span class="no-changes">Loading...</span>';
                  const oid = historyItem.dataset.oid;
                  const changedFiles = await this.gitClient.getChangedFiles(oid);
                  
                  const author = historyItem.dataset.author;
                  const date = historyItem.dataset.date;

                  const filesHTML = changedFiles.map(file => {
                    const path = typeof file === 'string' ? file : file.path;
                    return `<div class="history-file-path" data-path="${path}">${path.substring(1)}</div>`;
                  }).join('');
                  
                  detailsPanel.innerHTML = `
                    <div class="commit-meta">
                      <div><strong>Author:</strong> ${author}</div>
                      <div><strong>Date:</strong> ${date}</div>
                    </div>
                    <div class="history-file-list">${filesHTML || '<span class="no-changes">No files changed.</span>'}</div>
                  `;
                  detailsPanel.dataset.loaded = 'true';
                }
              }
            } else if (target.closest('.history-file-path')) {
                const historyItemForFile = target.closest('.git-history-item');
                const filepath = target.dataset.path;
                const oid = historyItemForFile.dataset.oid;
                const parentOid = historyItemForFile.dataset.parentOid;
                
                await this.editor.previewHistoricalFile(filepath, oid, parentOid);
            }
        });
    }

    const commitButton = this.contentContainer.querySelector('#git-commit-button');
    if (commitButton && !commitButton.dataset.listenerAttached) {
        commitButton.dataset.listenerAttached = 'true';
        commitButton.addEventListener('click', async () => {
            const messageInput = this.contentContainer.querySelector('#git-commit-message');
            const message = messageInput.value.trim();
            if (!message) return;
            
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
