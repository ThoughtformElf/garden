// src/sidebar/files.js
import { Modal } from '../util/modal.js';

export const fileActions = {
  async renderFiles(statusMatrix) {
    try {
      const files = await this.listFiles(this.gitClient, '/');
      const statuses = new Map();
      for (const [filepath, head, workdir] of statusMatrix) {
          if (head !== workdir) {
              statuses.set(`/${filepath}`, 'modified');
          }
      }

      const currentFile = decodeURIComponent(window.location.hash.substring(1));
      
      const fileListHTML = files.sort().map(file => {
        const href = `#${file}`;
        const status = statuses.get(file) || 'unmodified';
        const displayText = file.startsWith('/') ? file.substring(1) : file;
        
        const classes = [`status-${status}`];
        if (file === currentFile) {
          classes.push('active');
        }
        return `<li><a href="${href}" class="${classes.join(' ')}" data-filepath="${file}">${displayText}</a></li>`;
      }).join('');

      this.contentContainer.innerHTML = `<ul>${fileListHTML}</ul>`;
    } catch (e) {
      console.error('Error rendering file list:', e);
      this.contentContainer.innerHTML = `<p class="sidebar-error">Could not load files.</p>`;
    }
  },

  async handleNewFile() {
    const newName = await Modal.prompt({
      title: 'New File',
      label: 'Enter new file name:',
    });
    if (!newName) return;
    const newPath = `/${newName}`;
    try {
      await this.gitClient.pfs.stat(newPath);
      await this.showAlert({ title: 'File Exists', message: `File "${newName}" already exists.` });
    } catch (e) {
      if (e.code === 'ENOENT') {
        // THE FIX: Create an empty file with no wrapper.
        await this.gitClient.writeFile(newPath, '');
        window.location.hash = `#${newPath}`;
      } else {
        console.error('Error checking for file:', e);
        await this.showAlert({ title: 'Error', message: 'An error occurred while creating the file.' });
      }
    }
  },

  async handleRename(oldPath) {
    const newName = await Modal.prompt({
        title: 'Rename File',
        label: `Enter new name for ${oldPath.substring(1)}:`,
        defaultValue: oldPath.substring(1)
    });
    if (!newName || newName === oldPath.substring(1)) return;

    const newPath = `/${newName}`;
    
    try {
      const dirname = newPath.substring(0, newPath.lastIndexOf('/'));
      if (dirname) {
        await this.ensureDir(dirname);
      }
      await this.gitClient.pfs.rename(oldPath, newPath);
      
      if (decodeURIComponent(window.location.hash) === `#${oldPath}`) {
        window.location.hash = `#${newPath}`;
      } else {
        await this.refresh();
      }
    } catch (e) {
      console.error(`Error renaming file:`, e);
      await this.showAlert({ title: 'Error', message: 'Failed to rename file. Check console for details.' });
    }
  },
  
  async handleDuplicate(filepath) {
    const directory = filepath.substring(0, filepath.lastIndexOf('/'));
    const originalFilename = filepath.substring(filepath.lastIndexOf('/') + 1);
    const lastDotIndex = originalFilename.lastIndexOf('.');
    const hasExtension = lastDotIndex > 0;
    let defaultName;
    if (hasExtension) {
        const base = originalFilename.substring(0, lastDotIndex);
        const ext = originalFilename.substring(lastDotIndex);
        defaultName = `${base} (copy)${ext}`;
    } else {
        defaultName = `${originalFilename} (copy)`;
    }
    
    const newFilename = await Modal.prompt({
        title: 'Duplicate File',
        label: 'Enter name for duplicated file:',
        defaultValue: defaultName
    });
    if (!newFilename) return;
    const newPath = `${directory}/${newFilename}`;
    try {
      // THE FIX: Read the raw content and write the raw content. No wrappers.
      const rawContent = await this.gitClient.readFile(filepath);
      await this.gitClient.writeFile(newPath, rawContent);
      await this.refresh();
    } catch (e) {
      console.error('Error duplicating file:', e);
      await this.showAlert({ title: 'Error', message: 'Failed to duplicate file.' });
    }
  },

  async handleDelete(filepath) {
    const confirmed = await this.showConfirm({
      title: 'Delete File',
      message: `Are you sure you want to permanently delete "${filepath}"? This cannot be undone.`,
      okText: 'Delete',
      destructive: true
    });
    if (confirmed) {
      try {
        const wasViewingDeletedFile = decodeURIComponent(window.location.hash) === `#${filepath}`;
        await this.gitClient.pfs.unlink(filepath);
        if (wasViewingDeletedFile) {
          window.location.hash = '#/home';
        } else {
          await this.refresh();
        }
      } catch (e) {
        console.error(`Error deleting file:`, e);
        await this.showAlert({ title: 'Error', message: 'Failed to delete file.' });
      }
    }
  }
};