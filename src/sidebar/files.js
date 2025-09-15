export const fileActions = {
  // FIX: This function now correctly receives the full status matrix as an argument.
  async renderFiles(statusMatrix) {
    try {
      const files = await this.listFiles(this.gitClient, '/');
      const statuses = new Map();
      // Create a simple map of filepath -> status for easy lookup
      for (const [filepath, head, workdir] of statusMatrix) {
          if (head !== workdir) {
              statuses.set(`/${filepath}`, 'modified');
          }
      }

      const currentFile = decodeURIComponent(window.location.hash.substring(1));
      
      const fileListHTML = files.sort().map(file => {
        const href = `#${file}`;
        const status = statuses.get(file) || 'unmodified'; // This will now work.
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
    const newName = prompt('Enter new file name:');
    if (!newName) return;
    const newPath = `/${newName}`;
    try {
      await this.gitClient.pfs.stat(newPath);
      alert(`File "${newName}" already exists.`);
    } catch (e) {
      if (e.code === 'ENOENT') {
        await this.gitClient.writeFile(newPath, '');
        window.location.hash = `#${newPath}`;
      } else {
        console.error('Error checking for file:', e);
        alert('An error occurred while creating the file.');
      }
    }
  },

  async handleRename(oldPath) {
    const oldName = oldPath.substring(oldPath.lastIndexOf('/') + 1);
    const newName = prompt('Enter new file name:', oldPath.substring(1)); // Suggest the full path
    if (!newName || newName === oldPath.substring(1)) return;

    const newPath = `/${newName}`;
    
    try {
      // Ensure the destination directory exists before renaming
      const dirname = newPath.substring(0, newPath.lastIndexOf('/'));
      if (dirname) {
        await this.ensureDir(dirname);
      }

      await this.gitClient.pfs.rename(oldPath, newPath);
      
      // If we were viewing the renamed file, update the URL hash
      if (decodeURIComponent(window.location.hash) === `#${oldPath}`) {
        window.location.hash = `#${newPath}`;
      } else {
        await this.refresh();
      }
    } catch (e) {
      console.error(`Error renaming file:`, e);
      alert('Failed to rename file. Check console for details.');
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
    const newFilename = prompt('Enter name for duplicated file:', defaultName);
    if (!newFilename) return;
    const newPath = `${directory}/${newFilename}`;
    try {
      const content = await this.gitClient.pfs.readFile(filepath, 'utf8');
      await this.gitClient.writeFile(newPath, content);
      await this.refresh();
    } catch (e) {
      console.error('Error duplicating file:', e);
      alert('Failed to duplicate file.');
    }
  },

  async handleDelete(filepath) {
    if (confirm(`Are you sure you want to delete "${filepath}"?`)) {
      try {
        const wasViewingDeletedFile = decodeURIComponent(window.location.hash) === `#${filepath}`;
        await this.gitClient.pfs.unlink(filepath);
        if (wasViewingDeletedFile) {
          window.location.hash = '#/README';
          await this.editor.loadFile('/README');
        } else {
          await this.refresh();
        }
      } catch (e) {
        console.error(`Error deleting file:`, e);
        alert('Failed to delete file.');
      }
    }
  }
};
