// src/sidebar/gardens.js
import { Git } from '../util/git-integration.js';
import { Modal } from '../util/modal.js';

export const gardenActions = {
  async renderGardens() {
    try {
      const gardensRaw = localStorage.getItem('thoughtform_gardens');
      const gardens = gardensRaw ? JSON.parse(gardensRaw) : [];
      const dirtyGardensRaw = localStorage.getItem('dirty_gardens');
      const dirtyGardens = dirtyGardensRaw ? new Set(JSON.parse(dirtyGardensRaw || '[]')) : new Set();
      
      if (gardens.length === 0) {
        this.contentContainer.innerHTML = `<p class="sidebar-info">No gardens found. Create one!</p>`;
        return;
      }
      
      let gardenListHTML = '';
      for (const name of gardens.sort()) {
        const displayText = decodeURIComponent(name);
        const isDirty = dirtyGardens.has(displayText);
        const href = `/${encodeURIComponent(name)}`;
        const isActive = this.gitClient.gardenName === displayText;
        
        const classes = [];
        if (isActive) classes.push('active');
        if (isDirty) classes.push('status-modified');
        
        gardenListHTML += `<li><a href="${href}" class="${classes.join(' ')}" data-garden-name="${name}">${displayText}</a></li>`;
      }

      this.contentContainer.innerHTML = `<ul>${gardenListHTML}</ul>`;
      
      this.contentContainer.querySelectorAll('[data-garden-name]').forEach(link => {
          link.addEventListener('click', (e) => {
              if (this.gitClient.gardenName !== e.target.dataset.gardenName) {
                  sessionStorage.setItem('sidebarActiveTab', 'Files');
              }
          });
      });

    } catch (e) {
      console.error('Error rendering garden list:', e);
      this.contentContainer.innerHTML = `<p class="sidebar-error">Could not load gardens.</p>`;
    }
  },

  async handleNewGarden() {
    const newName = await Modal.prompt({
        title: 'New Garden',
        label: 'Enter new garden name:'
    });
    if (!newName || !newName.trim()) return;

    const gardensRaw = localStorage.getItem('thoughtform_gardens');
    const gardens = gardensRaw ? JSON.parse(gardensRaw) : [];
    if (gardens.includes(newName)) {
      await this.showAlert({ title: 'Garden Exists', message: `Garden "${newName}" already exists.` });
      return;
    }
    
    sessionStorage.setItem('sidebarActiveTab', 'Files');
    window.location.pathname = `/${encodeURIComponent(newName)}`;
  },

  async handleDuplicateGarden(sourceName) {
    if (!sourceName) return;
    
    const decodedSourceName = decodeURIComponent(sourceName);
    const defaultName = `${decodedSourceName} (copy)`;
    const newName = await Modal.prompt({
        title: 'Duplicate Garden',
        label: 'Enter name for new garden:',
        defaultValue: defaultName
    });

    if (!newName || !newName.trim() || newName === sourceName) return;

    const originalContent = this.contentContainer.innerHTML;
    this.contentContainer.innerHTML = `<p class="sidebar-info">Preparing duplication...<br>(UI may be unresponsive)</p>`;

    setTimeout(async () => {
      try {
        const sourceGit = new Git(sourceName);
        const destGit = new Git(newName);
        await destGit.initRepo();

        const filesToCopy = await this.listFiles(sourceGit, '/');
        
        let count = 0;
        for (const file of filesToCopy) {
          count++;
          this.contentContainer.innerHTML = `<p class="sidebar-info">Copying file ${count} of ${filesToCopy.length}:<br>${file.substring(1)}</p>`;
          const content = await sourceGit.readFile(file);
          await destGit.writeFile(file, content);
        }
        
        sessionStorage.setItem('sidebarActiveTab', 'Files');
        this.contentContainer.innerHTML = `<p class="sidebar-info">Duplication complete. Redirecting...</p>`;
        
        setTimeout(() => {
          window.location.replace(`/${encodeURIComponent(newName)}`);
        }, 500);

      } catch(e) {
        console.error('Error duplicating garden:', e);
        await this.showAlert({ title: 'Error', message: 'Failed to duplicate garden. Check console for details.' });
        this.contentContainer.innerHTML = originalContent;
      }
    }, 100);
  },
  
  async handleDeleteGarden(name) {
    if (!name) return;
    if (name === 'home') {
      await this.showAlert({ title: 'Action Not Allowed', message: 'The default "home" garden cannot be deleted.' });
      return;
    }
    
    const confirmed = await this.showConfirm({
        title: 'Delete Garden',
        message: `ARE YOU SURE you want to permanently delete the garden "${name}"? This cannot be undone.`,
        okText: 'Delete',
        destructive: true
    });

    if (!confirmed) return;

    try {
      const gardensRaw = localStorage.getItem('thoughtform_gardens');
      let gardens = gardensRaw ? JSON.parse(gardensRaw) : [];
      gardens = gardens.filter(g => g !== name);
      localStorage.setItem('thoughtform_gardens', JSON.stringify(gardens));

      const dbName = `garden-fs-${name}`;
      await new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(dbName);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = (event) => reject(event.target.error);
        deleteRequest.onblocked = () => {
            this.showAlert({
                title: 'Deletion Blocked',
                message: "Could not delete the database because it's still in use. Please refresh the page and try again."
            });
            reject(new Error('Deletion blocked'));
        };
      });

      if (this.gitClient.gardenName === name) {
        sessionStorage.setItem('sidebarActiveTab', 'Files');
        window.location.pathname = '/home';
      } else {
        await this.refresh();
      }

    } catch(e) {
      console.error('Error deleting garden:', e);
      if (e.message !== 'Deletion blocked') {
        await this.showAlert({ title: 'Error', message: 'Failed to delete garden.' });
      }
    }
  }
};
