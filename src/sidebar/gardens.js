import { Git } from '../util/git-integration.js';

export const gardenActions = {
  async renderGardens() {
    try {
      const gardensRaw = localStorage.getItem('thoughtform_gardens');
      const gardens = gardensRaw ? JSON.parse(gardensRaw) : [];
      const dirtyGardensRaw = localStorage.getItem('dirty_gardens');
      const dirtyGardens = dirtyGardensRaw ? JSON.parse(dirtyGardensRaw) : new Set();
      
      const basePath = new URL(import.meta.url).pathname.split('/').slice(0, -2).join('/') || '';
      
      if (gardens.length === 0) {
        this.contentContainer.innerHTML = `<p class="sidebar-info">No gardens found. Create one!</p>`;
        return;
      }
      
      let gardenListHTML = '';
      for (const name of gardens.sort()) {
        const displayText = decodeURIComponent(name);
        const isDirty = dirtyGardens.includes(displayText);

        const href = `${basePath}/${name}`;
        const isActive = this.gitClient.gardenName === displayText;
        
        const classes = [];
        if (isActive) classes.push('active');
        if (isDirty) classes.push('status-modified');
        
        gardenListHTML += `<li><a href="${href}" class="${classes.join(' ')}" data-garden-name="${name}">${displayText}</a></li>`;
      }

      this.contentContainer.innerHTML = `<ul>${gardenListHTML}</ul>`;
      
      // Add a click listener to handle the tab switch
      this.contentContainer.querySelectorAll('[data-garden-name]').forEach(link => {
          link.addEventListener('click', (e) => {
              // Only act if we're switching to a new garden
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

  handleNewGarden() {
    const newName = prompt('Enter new garden name:');
    if (!newName || !newName.trim()) return;
    const gardensRaw = localStorage.getItem('thoughtform_gardens');
    const gardens = gardensRaw ? JSON.parse(gardensRaw) : [];
    if (gardens.includes(newName)) {
      alert(`Garden "${newName}" already exists.`);
      return;
    }
    
    // Set the next active tab to 'Files' before redirecting
    sessionStorage.setItem('sidebarActiveTab', 'Files');
    
    const basePath = new URL(import.meta.url).pathname.split('/').slice(0, -2).join('/') || '';
    window.location.href = `${basePath}/${newName}`;
  },

  async handleDuplicateGarden(sourceName) {
    if (!sourceName) return;
    
    const decodedSourceName = decodeURIComponent(sourceName);
    const defaultName = `${decodedSourceName} (copy)`;
    const newName = prompt('Enter name for new garden:', defaultName);

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
        
        // Set the next active tab to 'Files'
        sessionStorage.setItem('sidebarActiveTab', 'Files');
        
        this.contentContainer.innerHTML = `<p class="sidebar-info">Duplication complete. Redirecting...</p>`;

        setTimeout(() => {
          const basePath = new URL(import.meta.url).pathname.split('/').slice(0, -2).join('/') || '';
          const newUrl = `${window.location.origin}${basePath}/${newName}`;
          window.location.replace(newUrl);
        }, 500);

      } catch(e) {
        console.error('Error duplicating garden:', e);
        alert('Failed to duplicate garden. Check console for details.');
        this.contentContainer.innerHTML = originalContent;
      }
    }, 100);
  },
  
  async handleDeleteGarden(name) {
    if (!name) return;
    if (name === 'home') {
      alert('The default "home" garden cannot be deleted.');
      return;
    }
    if (!confirm(`ARE YOU SURE you want to permanently delete the garden "${name}"?\nThis cannot be undone.`)) return;

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
            alert("Could not delete the database because it's still in use. Please refresh the page and try again.");
            reject(new Error('Deletion blocked'));
        };
      });

      if (this.gitClient.gardenName === name) {
        // Ensure we switch to the files tab when redirecting to home
        sessionStorage.setItem('sidebarActiveTab', 'Files');
        const basePath = new URL(import.meta.url).pathname.split('/').slice(0, -2).join('/') || '';
        window.location.href = `${basePath}/home`;
      } else {
        await this.refresh();
      }

    } catch(e) {
      console.error('Error deleting garden:', e);
      alert('Failed to delete garden.');
    }
  }
};
