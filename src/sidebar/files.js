// src/sidebar/files.js
import { Modal } from '../util/modal.js';

/**
 * Helper to build a hierarchical tree from a flat list of file paths.
 * @param {object[]} paths - An array of objects with path and isDirectory properties.
 * @returns {object} A nested object representing the folder structure.
 */
function buildTree(paths) {
    const tree = {};
    paths.sort((a, b) => a.path.localeCompare(b.path));

    for (const { path, isDirectory } of paths) {
        const parts = path.substring(1).split('/');
        let currentNode = tree;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === parts.length - 1) {
                if (!currentNode[part]) {
                    currentNode[part] = isDirectory
                        ? { type: 'folder', path: path, children: {} }
                        : { type: 'file', path: path };
                }
            } else {
                if (!currentNode[part]) {
                    currentNode[part] = {
                        type: 'folder',
                        path: '/' + parts.slice(0, i + 1).join('/'),
                        children: {}
                    };
                }
                if (!currentNode[part].children) {
                    currentNode[part].children = {};
                }
                currentNode = currentNode[part].children;
            }
        }
    }
    return tree;
}

function renderTreeNodes(nodes, statuses, currentFile, expandedFolders, depth) {
    const sortedKeys = Object.keys(nodes).sort((a, b) => {
        const nodeA = nodes[a];
        const nodeB = nodes[b];
        if (nodeA.type === 'folder' && nodeB.type !== 'folder') return -1;
        if (nodeA.type !== 'folder' && nodeB.type === 'folder') return 1;
        return a.localeCompare(b, undefined, { numeric: true });
    });

    let html = '';
    for (const key of sortedKeys) {
        const node = nodes[key];
        const indentStyle = `padding-left: ${depth * 20}px;`;

        if (node.type === 'folder') {
            const isExpanded = expandedFolders.has(node.path);
            html += `
                <li class="file-tree-item is-folder ${isExpanded ? 'expanded' : ''}" data-path="${node.path}" style="${indentStyle}" draggable="true">
                    <span class="folder-name">${key}</span>
                </li>
                <ul class="nested-list ${isExpanded ? 'active' : ''}">
                    ${renderTreeNodes(node.children, statuses, currentFile, expandedFolders, depth + 1)}
                </ul>
            `;
        } else {
            const status = statuses.get(node.path) || 'unmodified';
            const classes = [];
            if (node.path === currentFile) {
                classes.push('active');
            }
            html += `
                <li class="file-tree-item is-file ${classes.join(' ')}" data-path="${node.path}" style="${indentStyle}" draggable="true">
                    <a href="#${node.path}" class="status-${status}" data-filepath="${node.path}">${key}</a>
                </li>
            `;
        }
    }
    return html;
}

export const fileActions = {
  async renderFiles(statusMatrix) {
    try {
      const allPaths = await this.listAllPaths(this.gitClient, '/');
      const statuses = new Map();
      for (const [filepath, head, workdir] of statusMatrix) {
          if (head !== workdir) {
              statuses.set(`/${filepath}`, 'modified');
          }
      }

      const currentFile = decodeURIComponent(window.location.hash.substring(1));
      const fileTree = buildTree(allPaths);
      const expandedFoldersRaw = sessionStorage.getItem(`expanded_folders_${this.gitClient.gardenName}`);
      const expandedFolders = new Set(expandedFoldersRaw ? JSON.parse(expandedFoldersRaw) : []);
      
      if (currentFile) {
        const parts = currentFile.split('/').filter(p => p);
        let currentPath = '';
        for (let i = 0; i < parts.length - 1; i++) {
          currentPath += `/${parts[i]}`;
          expandedFolders.add(currentPath);
        }
      }

      this.contentContainer.innerHTML = `<ul class="file-tree-root">${renderTreeNodes(fileTree, statuses, currentFile, expandedFolders, 0)}</ul>`;
      
      this.contentContainer.querySelectorAll('.is-folder').forEach(folderEl => {
        folderEl.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            const path = folderEl.dataset.path;
            const nestedList = folderEl.nextElementSibling;
            const currentExpandedRaw = sessionStorage.getItem(`expanded_folders_${this.gitClient.gardenName}`);
            const currentExpanded = new Set(currentExpandedRaw ? JSON.parse(currentExpandedRaw) : []);
            folderEl.classList.toggle('expanded');
            nestedList.classList.toggle('active');
            if (folderEl.classList.contains('expanded')) {
                currentExpanded.add(path);
            } else {
                currentExpanded.delete(path);
            }
            sessionStorage.setItem(`expanded_folders_${this.gitClient.gardenName}`, JSON.stringify(Array.from(currentExpanded)));
        });
      });

      let draggedElement = null;
      const self = this;
      this.contentContainer.addEventListener('dragstart', (e) => {
          const target = e.target.closest('.file-tree-item');
          if (target) {
              draggedElement = target;
              e.dataTransfer.setData('text/plain', target.dataset.path);
              e.dataTransfer.effectAllowed = 'move';
              setTimeout(() => target.classList.add('is-dragging'), 0);
          }
      });
      this.contentContainer.addEventListener('dragend', () => {
          if (draggedElement) draggedElement.classList.remove('is-dragging');
          draggedElement = null;
          this.contentContainer.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
      });
      this.contentContainer.addEventListener('dragover', (e) => {
          e.preventDefault();
          this.contentContainer.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
          const folderTarget = e.target.closest('.file-tree-item.is-folder');
          if (folderTarget && folderTarget !== draggedElement && !folderTarget.dataset.path.startsWith(draggedElement.dataset.path + '/')) {
              folderTarget.classList.add('drop-target');
          } else if (!folderTarget) {
              const rootTarget = e.target.closest('.file-tree-root');
              if (rootTarget) rootTarget.classList.add('drop-target');
          }
      });
      this.contentContainer.addEventListener('dragleave', (e) => e.target.closest('.drop-target')?.classList.remove('drop-target'));
      this.contentContainer.addEventListener('drop', async (e) => {
          e.preventDefault();
          const sourcePath = e.dataTransfer.getData('text/plain');
          const dropTarget = e.target.closest('.drop-target');
          this.contentContainer.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
          if (dropTarget && draggedElement) {
              const destFolderPath = dropTarget.classList.contains('file-tree-root') ? '/' : dropTarget.dataset.path;
              await self.handleFileMove(sourcePath, destFolderPath);
          }
      });
    } catch (e) {
      console.error('Error rendering file list:', e);
      this.contentContainer.innerHTML = `<p class="sidebar-error">Could not load files.</p>`;
    }
  },

  async handleFileMove(sourcePath, destFolderPath) {
    const sourceFilename = sourcePath.split('/').pop();
    const newPath = destFolderPath === '/' ? `/${sourceFilename}` : `${destFolderPath}/${sourceFilename}`;
    const sourceParent = sourcePath.substring(0, sourcePath.lastIndexOf('/')) || '/';
    if (sourceParent === destFolderPath) return;
    if (destFolderPath.startsWith(sourcePath + '/')) {
      await this.showAlert({ title: 'Invalid Move', message: 'Cannot move a folder into one of its own sub-folders.' });
      return;
    }
    try {
      await this.gitClient.pfs.stat(newPath);
      await this.showAlert({ title: 'Move Failed', message: `An item named "${sourceFilename}" already exists in the destination folder.` });
      return;
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    const confirmed = await this.showConfirm({
        title: 'Move Item?',
        message: `This will move the item to the new location. <br><br><strong>Warning:</strong> This will NOT automatically update wikilinks, which may cause them to break.`,
        okText: 'Move Item',
    });
    if (confirmed) {
        try {
            await this.gitClient.pfs.rename(sourcePath, newPath);
            if (decodeURIComponent(window.location.hash) === `#${sourcePath}`) {
                window.location.hash = `#${newPath}`;
            }
            await this.refresh();
        } catch(e) {
            console.error('Error moving file:', e);
            await this.showAlert({ title: 'Error', message: 'Failed to move the item. Check the console for details.' });
        }
    }
  },

  async handleNewFile() {
    const newName = await Modal.prompt({
      title: 'New File',
      label: 'Enter new file name (including folders, e.g., "projects/new-idea"):',
    });
    if (!newName) return;
    const newPath = `/${newName}`;
    
    try {
      const stat = await this.gitClient.pfs.stat(newPath);
      const itemType = stat.isDirectory() ? 'folder' : 'file';
      await this.showAlert({ title: 'Creation Failed', message: `A ${itemType} named "${newName}" already exists.` });
      return;
    } catch (e) {
      if (e.code !== 'ENOENT') {
        console.error('Error checking for file:', e);
        await this.showAlert({ title: 'Error', message: 'An unexpected error occurred.' });
        return;
      }
    }

    try {
        await this.gitClient.writeFile(newPath, '');
        window.location.hash = `#${newPath}`;
    } catch (writeError) {
        console.error('Error creating file:', writeError);
        await this.showAlert({ title: 'Error', message: `Could not create file: ${writeError.message}` });
    }
  },

  async handleRename(oldPath) {
    const stat = await this.gitClient.pfs.stat(oldPath);
    const itemType = stat.isDirectory() ? 'Folder' : 'File';

    const newName = await Modal.prompt({
        title: `Rename ${itemType}`,
        label: `Enter new name for ${oldPath.substring(1)}:`,
        defaultValue: oldPath.substring(1)
    });
    if (!newName || newName === oldPath.substring(1)) return;

    const newPath = `/${newName}`;
    
    try {
      const existingStat = await this.gitClient.pfs.stat(newPath);
      const existingItemType = existingStat.isDirectory() ? 'folder' : 'file';
      await this.showAlert({ title: 'Rename Failed', message: `A ${existingItemType} named "${newName}" already exists.` });
      return;
    } catch (e) {
      if (e.code !== 'ENOENT') {
        console.error('Error checking for file:', e);
        await this.showAlert({ title: 'Error', message: 'An unexpected error occurred.' });
        return;
      }
    }

    const tempPath = oldPath + `.__rename__.${Date.now()}`;
    
    try {
      await this.gitClient.pfs.rename(oldPath, tempPath);
      try {
        const dirname = newPath.substring(0, newPath.lastIndexOf('/'));
        if (dirname) {
          await this.gitClient.ensureDir(dirname);
        }
        await this.gitClient.pfs.rename(tempPath, newPath);
      } catch (e) {
        console.error(`Error during rename phase 2/3 for ${newPath}:`, e);
        await this.gitClient.pfs.rename(tempPath, oldPath);
        throw e;
      }
      if (decodeURIComponent(window.location.hash) === `#${oldPath}`) {
        window.location.hash = `#${newPath}`;
      } else {
        await this.refresh();
      }
    } catch (e) {
      console.error(`Error renaming file:`, e);
      await this.showAlert({ title: 'Error', message: `Failed to rename file: ${e.message}` });
      await this.refresh();
    }
  },
  
  async handleDuplicate(path) {
    const stat = await this.gitClient.pfs.stat(path);
    if (stat.isDirectory()) {
        await this.showAlert({ title: 'Action Not Supported', message: 'Duplicating folders is not yet supported.' });
        return;
    }

    const directory = path.substring(0, path.lastIndexOf('/'));
    const originalFilename = path.substring(path.lastIndexOf('/') + 1);
    const defaultName = `${originalFilename.split('.').slice(0, -1).join('.') || originalFilename} (copy)${originalFilename.includes('.') ? '.' + originalFilename.split('.').pop() : ''}`;
    
    const newFilename = await Modal.prompt({
        title: 'Duplicate File',
        label: 'Enter name for duplicated file:',
        defaultValue: defaultName
    });
    if (!newFilename) return;

    const newPath = `${directory}/${newFilename}`;
    try {
      const rawContent = await this.gitClient.readFile(path);
      await this.gitClient.writeFile(newPath, rawContent);
      await this.refresh();
    } catch (e) {
      console.error('Error duplicating file:', e);
      await this.showAlert({ title: 'Error', message: `Failed to duplicate file: ${e.message}` });
    }
  },

  async handleDelete(path) {
    const stat = await this.gitClient.pfs.stat(path);
    const itemType = stat.isDirectory() ? 'folder' : 'file';

    const confirmed = await this.showConfirm({
      title: `Delete ${itemType}`,
      message: `Are you sure you want to permanently delete the ${itemType} "${path}"? This cannot be undone.`,
      okText: 'Delete',
      destructive: true
    });

    if (confirmed) {
      try {
        const wasViewingDeletedFile = decodeURIComponent(window.location.hash).startsWith(`#${path}`);
        
        // Use the robust rmrf that handles both files and folders
        await this.gitClient.rmrf(path);

        if (wasViewingDeletedFile) {
          window.location.hash = '#/home';
        } else {
          await this.refresh();
        }
      } catch (e) {
        console.error(`Error deleting ${itemType}:`, e);
        await this.showAlert({ title: 'Error', message: `Failed to delete ${itemType}.` });
      }
    }
  }
};