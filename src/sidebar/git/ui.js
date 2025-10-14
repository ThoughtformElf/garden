export class GitUI {
  constructor(sidebarContext) {
    this.sidebar = sidebarContext;
    this.editor = sidebarContext.editor;
    this.contentContainer = sidebarContext.contentContainer;
  }

  render(statusMatrix, commits) {
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

    const remoteSectionHTML = this._renderRemoteSection();
    const commitAreaHTML = `
      <div class="git-commit-area">
        <textarea id="git-commit-message" placeholder="Commit message..." rows="3"></textarea>
        <button id="git-commit-button" disabled>Commit</button>
      </div>
    `;
    const unstagedFilesHTML = this._renderFileSection('Changes', unstagedFiles, false);
    const stagedFilesHTML = this._renderFileSection('Staged Changes', stagedFiles, true);
    const historyHTML = this._renderHistorySection(commits);

    return `
      <div class="git-view-container">
        ${remoteSectionHTML}
        ${commitAreaHTML}
        ${stagedFilesHTML}
        ${unstagedFilesHTML}
        ${historyHTML}
      </div>
    `;
  }

  _renderRemoteSection() {
    const config = this.sidebar.getRemoteConfig();
    return `
      <div class="git-remote-section">
        <h3>Remote</h3>
        <input type="text" id="git-remote-url" placeholder="Remote URL" value="${config.url}">
        <input type="password" id="git-remote-auth" placeholder="Username or Token" value="${config.auth}">
        <div class="git-remote-actions">
          <button id="git-pull-button">Pull</button>
          <button id="git-push-button">Push</button>
        </div>
        <div class="git-remote-log" id="git-remote-log">Ready</div>
      </div>
    `;
  }

  _renderFileSection(title, files, isStaged) {
    const actionButton = isStaged
      ? `<button class="git-action-button unstage" title="Unstage Changes">-</button>`
      : `<button class="git-action-button stage" title="Stage Changes">+</button>`;
      
    let fileListHTML = '';
    if (files.length > 0) {
      fileListHTML = files.map(file => {
        const displayText = file.filepath.startsWith('/') ? file.filepath.substring(1) : file.filepath;
        const isActive = this.editor.filePath === file.filepath;
        const activeClass = isActive ? 'active' : '';
        return `
          <li class="git-file-item ${activeClass}" data-filepath="${file.filepath}">
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
  }

  _renderHistorySection(commits) {
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
  }

  updateCommitButtonState() {
    const commitMessage = this.contentContainer.querySelector('#git-commit-message');
    const commitButton = this.contentContainer.querySelector('#git-commit-button');
    if (!commitMessage || !commitButton) return;
    const hasStagedFiles = this.contentContainer.querySelector('.git-staged-section .git-file-item') !== null;
    const hasMessage = commitMessage.value.trim().length > 0;
    
    commitButton.disabled = !(hasStagedFiles && hasMessage);
  }
}