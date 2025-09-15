// src/drag-drop.js

/**
 * Initializes drag-and-drop functionality for the entire application.
 * @param {Git} gitClient - The Git client for the current garden.
 * @param {Sidebar} sidebar - The main sidebar instance to refresh after import.
 */
export function initializeDragAndDrop(gitClient, sidebar) {
  const overlay = document.createElement('div');
  overlay.id = 'drag-overlay';
  overlay.innerHTML = '<p>Drop files or folders to add them to the garden</p>';
  document.body.appendChild(overlay);

  const showOverlay = (message) => {
    if (message) {
      overlay.innerHTML = `<p>${message}</p>`;
    }
    overlay.classList.add('visible');
  };

  const hideOverlay = () => {
    overlay.classList.remove('visible');
  };

  // A function to read a File object and return its content as text.
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  // Processes an array of FileSystemEntry objects
  const processEntries = async (entries) => {
    const importPromises = [];

    const traverseFileTree = async (entry, path) => {
      if (entry.isFile) {
        const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
        const content = await readFileAsText(file);
        const filepath = `${path}/${file.name}`;
        console.log(`[DragDrop] Writing file: ${filepath}`);
        importPromises.push(gitClient.writeFile(filepath, content));
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const entries = await new Promise((resolve) => dirReader.readEntries(resolve));
        for (const subEntry of entries) {
          await traverseFileTree(subEntry, `${path}/${entry.name}`);
        }
      }
    };

    for (const entry of entries) {
      await traverseFileTree(entry, '');
    }

    return Promise.all(importPromises);
  };

  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      showOverlay();
    }
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  window.addEventListener('dragleave', (e) => {
    if (e.clientX === 0 && e.clientY === 0) {
      hideOverlay();
    }
  });

  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    hideOverlay();

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) {
      return;
    }

    const entries = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) {
        entries.push(entry);
      }
    }

    if (entries.length > 0) {
      console.log(`[DragDrop] Processing ${entries.length} dropped item(s).`);
      showOverlay(`Importing ${entries.length} item(s)...`);

      try {
        await processEntries(entries);
        console.log('[DragDrop] All items imported successfully.');
        await sidebar.refresh();
      } catch (err) {
        console.error('[DragDrop] An error occurred during import:', err);
        alert('An error occurred while importing. Please check the console.');
      } finally {
        setTimeout(() => {
          hideOverlay();
          overlay.innerHTML = '<p>Drop files or folders to add them to the garden</p>';
        }, 1500);
      }
    }
  });
}
