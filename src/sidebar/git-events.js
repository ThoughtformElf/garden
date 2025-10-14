// src/sidebar/git-events.js

export class GitEvents {
  constructor(sidebarContext) {
    this.sidebar = sidebarContext;
    this.editor = sidebarContext.editor;
    this.gitClient = sidebarContext.gitClient;
    this.contentContainer = sidebarContext.contentContainer;
  }

  addListeners() {
    const remoteUrlInput = this.contentContainer.querySelector('#git-remote-url');
    const remoteAuthInput = this.contentContainer.querySelector('#git-remote-auth');
    const pushButton = this.contentContainer.querySelector('#git-push-button');
    const pullButton = this.contentContainer.querySelector('#git-pull-button');

    const updateConfig = () => {
        this.sidebar.saveRemoteConfig(remoteUrlInput.value, remoteAuthInput.value);
    };

    remoteUrlInput.addEventListener('input', updateConfig);
    remoteAuthInput.addEventListener('input', updateConfig);
    
    pushButton.addEventListener('click', () => this._handleRemoteAction('push'));
    pullButton.addEventListener('click', () => this._handleRemoteAction('pull'));
    
    const commitMessage = this.contentContainer.querySelector('#git-commit-message');
    if (commitMessage && !commitMessage.dataset.listenerAttached) {
        commitMessage.dataset.listenerAttached = 'true';
        commitMessage.addEventListener('input', () => this.sidebar.updateCommitButtonState());
    }
    
    const viewContainer = this.contentContainer.querySelector('.git-view-container');
    if (viewContainer && !viewContainer.dataset.listenerAttached) {
        viewContainer.dataset.listenerAttached = 'true';
        viewContainer.addEventListener('click', (e) => this._handleViewContainerClick(e));
    }

    const commitButton = this.contentContainer.querySelector('#git-commit-button');
    if (commitButton && !commitButton.dataset.listenerAttached) {
        commitButton.dataset.listenerAttached = 'true';
        commitButton.addEventListener('click', () => this._handleCommitClick());
    }
  }

  async _handleRemoteAction(action) {
    const remoteUrlInput = this.contentContainer.querySelector('#git-remote-url');
    const remoteAuthInput = this.contentContainer.querySelector('#git-remote-auth');
    const pushButton = this.contentContainer.querySelector('#git-push-button');
    const pullButton = this.contentContainer.querySelector('#git-pull-button');
    const logArea = this.contentContainer.querySelector('#git-remote-log');

    const url = remoteUrlInput.value.trim();
    const token = remoteAuthInput.value.trim();
    if (!url) {
      logArea.textContent = 'Error: Remote URL is required.';
      return;
    }
    
    pushButton.disabled = true;
    pullButton.disabled = true;
    const actionVerb = action === 'push' ? 'Pushing' : 'Pulling';
    logArea.textContent = `${actionVerb} to ${url}...`;
    
    try {
      const result = await this.gitClient[action](url, token, (msg) => {
        logArea.textContent = msg;
      });

      if (result.ok) {
        logArea.textContent = `${actionVerb} complete.`;
      } else {
        logArea.textContent = `Error: ${result.error || 'Unknown error'}`;
      }
      
      if (action === 'pull') {
          await this.sidebar.refresh();
          await this.editor.forceReloadFile(this.editor.filePath);
      }

    } catch (e) {
      console.error(`${actionVerb} failed:`, e);
      logArea.textContent = `Error: ${e.message || 'Check console for details.'}`;
    } finally {
      pushButton.disabled = false;
      pullButton.disabled = false;
    }
  }

  async _handleViewContainerClick(e) {
    const target = e.target;
    const fileItem = target.closest('.git-file-item');
    const historyItem = target.closest('.git-history-item');

    if (fileItem) {
      await this._handleFileItemClick(target, fileItem);
    } else if (historyItem && target.closest('.git-history-header')) {
      this._toggleHistoryDetails(historyItem);
    } else if (target.closest('.history-file-path')) {
      this._handleHistoryFileClick(target);
    }
  }

  async _handleFileItemClick(target, fileItem) {
    const filepath = fileItem.dataset.filepath;
    if (target.matches('.git-file-path')) {
        if (this.editor.filePath !== filepath) {
            await this.editor.loadFile(filepath);
        }
        this.editor.showDiff(await this.gitClient.readBlob(filepath));
    } else if (target.matches('.git-action-button')) {
        target.closest('.git-file-item').style.pointerEvents = 'none'; // Prevent double clicks
        if (target.classList.contains('discard')) {
            const confirmed = await this.sidebar.showConfirm({
                title: 'Discard Changes',
                message: `Are you sure you want to discard all changes to "${filepath}"? This cannot be undone.`,
                okText: 'Discard',
                destructive: true
            });
            if (confirmed) {
                await this.gitClient.discard(filepath);
                if (this.editor.filePath === filepath) {
                    await this.editor.forceReloadFile(filepath);
                }
                await this.sidebar.refresh();
            }
        } else if (target.classList.contains('stage')) {
            await this.gitClient.stage(filepath);
            await this.sidebar.renderGitView();
        } else if (target.classList.contains('unstage')) {
            await this.gitClient.unstage(filepath);
            await this.sidebar.renderGitView();
        }
    }
  }

  async _toggleHistoryDetails(historyItem) {
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
  }

  async _handleHistoryFileClick(target) {
    const viewContainer = this.contentContainer.querySelector('.git-view-container');
    viewContainer.querySelectorAll('.history-file-path.active').forEach(el => el.classList.remove('active'));
    target.classList.add('active');

    const historyItemForFile = target.closest('.git-history-item');
    const filepath = target.dataset.path;
    const oid = historyItemForFile.dataset.oid;
    const parentOid = historyItemForFile.dataset.parentOid;
    
    await this.editor.previewHistoricalFile(filepath, oid, parentOid);
  }

  async _handleCommitClick() {
    const commitButton = this.contentContainer.querySelector('#git-commit-button');
    const messageInput = this.contentContainer.querySelector('#git-commit-message');
    const message = messageInput.value.trim();
    if (!message) return;
    
    try {
        commitButton.disabled = true;
        commitButton.textContent = 'Committing...';
        await this.gitClient.commit(message);
        this.editor.hideDiff();
        messageInput.value = '';
        await this.sidebar.refresh();
    } catch (err) {
        console.error('Commit failed:', err);
        await this.sidebar.showAlert({ title: 'Commit Failed', message: 'The commit failed. Please see the console for more details.' });
        this.sidebar.updateCommitButtonState();
        commitButton.textContent = 'Commit';
    }
  }
}