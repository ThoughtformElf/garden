import { Modal } from '../../util/modal.js';

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
    if (remoteUrlInput && remoteAuthInput) {
        const updateConfig = () => this.sidebar.saveRemoteConfig(remoteUrlInput.value, remoteAuthInput.value);
        remoteUrlInput.addEventListener('input', updateConfig);
        remoteAuthInput.addEventListener('input', updateConfig);
    }
    
    const viewContainer = this.contentContainer.querySelector('.git-main-layout');
    if (viewContainer && !viewContainer.dataset.listenerAttached) {
        viewContainer.dataset.listenerAttached = 'true';
        viewContainer.addEventListener('click', (e) => this._handleClick(e));
    }

    const commitMessage = this.contentContainer.querySelector('#git-commit-message');
    if (commitMessage && !commitMessage.dataset.listenerAttached) {
        commitMessage.dataset.listenerAttached = 'true';
        commitMessage.addEventListener('input', () => this.sidebar.updateCommitButtonState());
    }
  }

  async _handleClick(e) {
    const target = e.target;
    if (target.id === 'git-pull-button') await this._handleRemoteAction('pull');
    else if (target.id === 'git-push-button') await this._handleRemoteAction('push');
    else if (target.id === 'git-commit-button') await this._handleCommit();
    else if (target.id === 'git-new-branch-button') await this._handleNewBranch();
    
    const fileItem = target.closest('.git-file-item');
    if (fileItem) await this._handleFileItemClick(target, fileItem);

    const historyItem = target.closest('.git-history-item');
    if (historyItem) await this._handleHistoryItemClick(historyItem);
    
    const branchItem = target.closest('.git-branch-item');
    if (branchItem) await this._handleBranchItemClick(branchItem);
    
    const changesPanel = target.closest('.git-panel');
    if (changesPanel) {
        if (target.matches('[data-action="stage-all"]')) {
            const files = Array.from(changesPanel.querySelectorAll('.git-file-item .stage'))
                               .map(btn => btn.closest('.git-file-item').dataset.filepath);
            await this._stageAll(files);
        } else if (target.matches('[data-action="unstage-all"]')) {
            const files = Array.from(changesPanel.querySelectorAll('.git-file-item .unstage'))
                               .map(btn => btn.closest('.git-file-item').dataset.filepath);
            await this._unstageAll(files);
        }
    }
  }

  async _handleRemoteAction(action, force = false) {
    const remoteUrlInput = this.contentContainer.querySelector('#git-remote-url');
    const remoteAuthInput = this.contentContainer.querySelector('#git-remote-auth');
    const pushButton = this.contentContainer.querySelector('#git-push-button');
    const pullButton = this.contentContainer.querySelector('#git-pull-button');
    const logArea = this.contentContainer.querySelector('#git-remote-log');

    const url = remoteUrlInput.value.trim();
    if (!url) {
      logArea.textContent = 'Error: Remote URL is required.';
      return;
    }
    const token = remoteAuthInput.value.trim();
    
    pushButton.disabled = true;
    pullButton.disabled = true;
    const actionVerb = action.charAt(0).toUpperCase() + action.slice(1);
    logArea.textContent = `${actionVerb}ing...`;
    
    try {
      await this.gitClient[action](url, token, (msg) => logArea.textContent = msg, force);
      logArea.textContent = `${actionVerb} complete.`;
      
      await this.sidebar.refresh();
      if (action === 'pull') {
        await this.editor.loadFile(this.editor.filePath);
      }
    } catch (e) {
        console.error(`Git ${action} failed:`, e); // Full error to console
        logArea.textContent = `Error: ${e.message}`; // Clean message to UI
        
        if (e.name === 'MergeConflictError') {
            const conflictedFiles = e.data && Array.isArray(e.data.filepaths) ? e.data.filepaths : [];

            await this.sidebar.showAlert({
                title: 'Merge Conflict Detected',
                message: `Automatic merge failed. Your files have been updated with conflict markers (e.g., '<<<<<<< HEAD').<br><br>The conflicted files are now marked in the 'Changes' list. Please review them, resolve the conflicts, then stage and commit the result to finalize the merge.`
            });
            
            await this.sidebar.refresh(conflictedFiles);
            
            if (conflictedFiles.includes(this.editor.filePath.substring(1))) {
                await this.editor.loadFile(this.editor.filePath);
            }

        } else if (e.name === 'PushRejectedError') {
            const choice = await Modal.choice({
                title: 'Push Rejected',
                message: 'The push was rejected because the remote has changes you do not have. You must pull first. What would you like to do?',
                choices: [
                    { id: 'pull', text: 'Pull Latest Changes' },
                    { id: 'force-push', text: 'Force Push (Overwrite Remote)', class: 'destructive' },
                    { id: 'cancel', text: 'Cancel' }
                ]
            });
            if (choice === 'pull') await this._handleRemoteAction('pull', false);
            else if (choice === 'force-push') await this._handleRemoteAction('push', true);
            else logArea.textContent = 'Push cancelled by user.';
        } else if (e.name === 'MergeNotSupportedError') {
             const choice = await Modal.choice({
                title: 'Merge Conflict',
                message: 'Automatic merge failed. The remote history has diverged. How would you like to resolve this?',
                choices: [
                    { id: 'force-pull', text: 'Force Pull (Overwrite Browser)', class: 'destructive' },
                    { id: 'cancel', text: 'Cancel' }
                ]
            });
            if (choice === 'force-pull') await this._handleRemoteAction('pull', true);
            else logArea.textContent = 'Pull cancelled by user.';
        }
    } finally {
      pushButton.disabled = false;
      pullButton.disabled = false;
    }
  }

  async _handleCommit() {
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
        
        this.sidebar.conflictedFiles = [];
        await this.sidebar.refresh();
        
    } catch (err) {
        await this.sidebar.showAlert({ title: 'Commit Failed', message: 'See console for details.' });
    } finally {
        commitButton.textContent = 'Commit';
        this.sidebar.updateCommitButtonState();
    }
  }
  
  async _handleFileItemClick(target, fileItem) {
    const filepath = fileItem.dataset.filepath;
    const isConflict = fileItem.classList.contains('is-conflict');

    if (target.matches('.git-file-path')) {
        if (isConflict) {
            this.editor.hideDiff();
            await this.editor.loadFile(filepath);
        } else {
            await this.editor.loadFile(filepath);
            this.editor.showDiff(await this.gitClient.readBlob(filepath));
        }
    } else if (target.matches('.discard')) {
        const confirmed = await this.sidebar.showConfirm({
            title: 'Discard Changes',
            message: `Are you sure you want to discard all changes to "${filepath}"?`,
            okText: 'Discard',
            destructive: true
        });
        if (confirmed) {
            await this.gitClient.discard(filepath);
            if (this.editor.filePath === filepath) await this.editor.loadFile(filepath);
            await this.sidebar.refresh();
        }
    } else if (target.matches('.stage')) {
        await this.gitClient.stage(filepath);
        await this.sidebar.refresh(); 
    } else if (target.matches('.unstage')) {
        await this.gitClient.unstage(filepath);
        await this.sidebar.refresh(); 
    }
  }

  async _handleHistoryItemClick(historyItem) {
    this.contentContainer.querySelectorAll('.git-history-item.active').forEach(el => el.classList.remove('active'));
    historyItem.classList.add('active');

    const oid = historyItem.dataset.oid;
    const parentOid = historyItem.dataset.parentOid;
    const detailsPanel = this.contentContainer.querySelector('#git-commit-details .git-panel-content');
    detailsPanel.innerHTML = '<span class="no-changes">Loading...</span>';

    const changedFiles = await this.gitClient.getChangedFiles(oid);
    
    const filesHTML = changedFiles.map(path => {
      return `<li class="git-file-item" data-path="${path}" data-oid="${oid}" data-parent-oid="${parentOid}">
                <span class="git-file-path">${path.substring(1)}</span>
              </li>`;
    }).join('');

    detailsPanel.innerHTML = `<ul class="git-file-list">${filesHTML || '<li class="no-changes">No files in commit.</li>'}</ul>`;
    
    detailsPanel.querySelectorAll('.git-file-item').forEach(item => {
        item.addEventListener('click', async () => {
            const path = item.dataset.path;
            const itemOid = item.dataset.oid;
            const itemParentOid = item.dataset.parentOid;
            detailsPanel.querySelectorAll('.git-file-item.active').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            await this.editor.previewHistoricalFile(path, itemOid, itemParentOid);
        });
    });
  }
  
  async _handleNewBranch() {
    const branchName = await Modal.prompt({ title: 'Create New Branch', label: 'Enter branch name:' });
    if (!branchName || !branchName.trim()) return;
    try {
        await this.gitClient.branch(branchName.trim());
        await this.gitClient.checkout(branchName.trim());
        await this.sidebar.refresh();
    } catch (e) {
        await this.sidebar.showAlert({ title: 'Error', message: `Could not create branch: ${e.message}`});
    }
  }
  
  async _handleBranchItemClick(branchItem) {
    const branchName = branchItem.dataset.branchName;
    if (branchItem.classList.contains('active')) return;
    try {
      await this.gitClient.checkout(branchName);
      await this.sidebar.refresh();
      // Reload all open files in all panes to reflect the new branch state
      for (const pane of window.thoughtform.workspace.panes.values()) {
        if (pane.editor.gitClient.gardenName === this.gitClient.gardenName) {
            await pane.editor.loadFile(pane.editor.filePath);
        }
      }
    } catch (e) {
      await this.sidebar.showAlert({ title: 'Error', message: `Could not switch to branch: ${e.message}` });
    }
  }
  
  async _stageAll(files) {
    if (files.length === 0) return;
    await Promise.all(files.map(file => this.gitClient.stage(file)));
    await this.sidebar.refresh();
  }

  async _unstageAll(files) {
    if (files.length === 0) return;
    await Promise.all(files.map(file => this.gitClient.unstage(file)));
    await this.sidebar.refresh();
  }
}