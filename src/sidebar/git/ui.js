export class GitUI {
  constructor(sidebarContext) {
    this.sidebar = sidebarContext;
    this.editor = sidebarContext.editor;
    this.contentContainer = sidebarContext.contentContainer;
  }

  render(statusMatrix, commits, branchInfo) {
    const stagedFiles = new Map();
    const unstagedFiles = new Map();

    // --- DEFINITIVE FIX for status interpretation ---
    // This logic now correctly differentiates between staged, unstaged, and unmerged files,
    // mimicking the behavior of the standard `git status` command.
    for (const [filepath, head, workdir, stage] of statusMatrix) {
        const path = `/${filepath}`;

        // The key indicator from isomorphic-git for an unmerged path (a conflict) is stage === 0.
        const isConflict = stage === 0;

        // A file has STAGED changes if its index status differs from HEAD,
        // AND it is NOT in a conflict state.
        if (head !== stage && !isConflict) {
            stagedFiles.set(path, { filepath: path, status: 'staged', isConflict: false });
        }

        // A file has UNSTAGED changes if its workdir status differs from its index status.
        // This correctly includes conflicted files (where workdir is modified and stage is 0).
        if (workdir !== stage) {
            unstagedFiles.set(path, { filepath: path, status: 'unstaged', isConflict: isConflict });
        }
    }

    return `
      <div class="git-main-layout">
        <div class="git-left-column">
          ${this._renderRemotePanel()}
          ${this._renderBranchPanel(branchInfo)}
          ${this._renderCommitPanel()}
          ${this._renderChangesPanel('Staged Changes', Array.from(stagedFiles.values()), true)}
          ${this._renderChangesPanel('Changes', Array.from(unstagedFiles.values()), false)}
        </div>
        <div class="git-right-column">
          ${this._renderHistoryPanel(commits)}
          <div id="git-commit-details" class="git-panel">
            <h3 class="git-panel-header">Changed Files</h3>
            <div class="git-panel-content">
              <span class="no-changes">Select a commit to see details.</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _renderRemotePanel() {
    const config = this.sidebar.getRemoteConfig();
    return `
      <div class="git-panel">
        <h3 class="git-panel-header">Remote</h3>
        <div class="git-panel-content">
          <input type="text" id="git-remote-url" placeholder="Remote URL" value="${config.url}">
          <input type="password" id="git-remote-auth" placeholder="Username or Token" value="${config.auth}">
          <div class="git-remote-actions">
            <button id="git-pull-button">Pull</button>
            <button id="git-push-button">Push</button>
          </div>
          <div class="git-remote-log" id="git-remote-log">Ready</div>
        </div>
      </div>
    `;
  }
  
  _renderBranchPanel({ branches, currentBranch }) {
    const branchList = branches.map(branch => `
      <li class="git-branch-item ${branch === currentBranch ? 'active' : ''}" data-branch-name="${branch}">
        <span class="branch-name">${branch}</span>
      </li>
    `).join('');

    return `
      <div class="git-panel">
        <h3 class="git-panel-header">Branches</h3>
        <div class="git-panel-content">
          <ul class="git-branch-list">${branchList}</ul>
          <button id="git-new-branch-button" class="full-width" style="margin-top: 8px;">New Branch</button>
        </div>
      </div>
    `;
  }

  _renderCommitPanel() {
    return `
      <div class="git-panel">
        <div class="git-panel-content">
          <textarea id="git-commit-message" placeholder="Commit message..." rows="3"></textarea>
          <button id="git-commit-button" class="full-width" disabled>Commit</button>
        </div>
      </div>
    `;
  }
  
  _renderChangesPanel(title, files, isStaged) {
    const actionSymbol = isStaged ? '−' : '+';
    const actionClass = isStaged ? 'unstage' : 'stage';
    const actionTitle = isStaged ? 'Unstage' : 'Stage';
    const allAction = isStaged ? 'unstage-all' : 'stage-all';
    const allTitle = isStaged ? 'Unstage All' : 'Stage All';

    let fileListHTML = '';
    if (files.length > 0) {
      fileListHTML = files.map(file => {
        const displayText = file.filepath.substring(1);
        const isActive = this.editor.filePath === file.filepath;
        const isConflict = file.isConflict;
        return `
          <li class="git-file-item ${isActive ? 'active' : ''} ${isConflict ? 'is-conflict' : ''}" data-filepath="${file.filepath}">
            <span class="git-file-path">${displayText}</span>
            <button class="git-action-button discard" title="Discard Changes">⭯</button>
            <button class="git-action-button ${actionClass}" title="${actionTitle}">${actionSymbol}</button>
          </li>
        `;
      }).join('');
    } else {
      fileListHTML = `<li class="no-changes">No ${isStaged ? 'staged ' : ''}changes.</li>`;
    }

    return `
      <div class="git-panel">
        <h3 class="git-panel-header">
            ${title} (${files.length})
            <button class="git-action-button-all" data-action="${allAction}" title="${allTitle}" ${files.length === 0 ? 'disabled' : ''}>All</button>
        </h3>
        <ul class="git-file-list git-panel-content">
          ${fileListHTML}
        </ul>
      </div>
    `;
  }

  _renderHistoryPanel(commits) {
    let historyListHTML = '';
    if (commits.length > 0) {
        historyListHTML = commits.map(commit => {
            const message = commit.commit.message.split('\n')[0];
            const shortOid = commit.oid.substring(0, 7);
            const author = commit.commit.author.name;
            const date = new Date(commit.commit.author.timestamp * 1000).toLocaleDateString();
            return `
              <li class="git-history-item" data-oid="${commit.oid}" data-parent-oid="${commit.commit.parent[0] || ''}">
                <div class="commit-message">${message}</div>
                <div class="commit-meta">
                  <span class="commit-author">${author}</span>
                  <span class="commit-oid">${shortOid}</span>
                  <span class="commit-date">${date}</span>
                </div>
              </li>
            `;
        }).join('');
    } else {
        historyListHTML = '<li class="no-changes">No commit history.</li>';
    }
    return `
        <div class="git-panel git-history-panel">
            <h3 class="git-panel-header">History</h3>
            <ul class="git-history-list git-panel-content">
                ${historyListHTML}
            </ul>
        </div>
    `;
  }

  updateCommitButtonState() {
    const commitMessage = this.contentContainer.querySelector('#git-commit-message');
    const commitButton = this.contentContainer.querySelector('#git-commit-button');
    if (!commitMessage || !commitButton) return;
    
    const hasStagedFiles = !!this.contentContainer.querySelector('.git-file-item .unstage');
    const hasMessage = commitMessage.value.trim().length > 0;
    
    commitButton.disabled = !(hasStagedFiles && hasMessage);
  }
}