// src/util/drag-drop.js
import JSZip from 'jszip';
import { Modal } from './modal.js';

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

  // Helper to save a single file to the git client
  const importFile = async (file) => {
    const content = await file.text();
    const filepath = `/${file.name}`;
    console.log(`[DragDrop] Writing file: ${filepath}`);
    await gitClient.writeFile(filepath, content);
  };

  // Helper to extract and save files from a zip archive
  const extractZip = async (file) => {
    const zip = await JSZip.loadAsync(file);
    const promises = [];
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        const promise = zipEntry.async('string').then(content => {
          const filepath = `/${relativePath}`;
          console.log(`[DragDrop] Extracting: ${filepath}`);
          return gitClient.writeFile(filepath, content);
        });
        promises.push(promise);
      }
    });
    await Promise.all(promises);
  };

  // This function now handles both files and directories
  const processEntries = async (entries) => {
    const filesToProcess = [];
    const zipFiles = [];
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif'];
    
    const traverseFileTree = async (entry, path) => {
      if (entry.isFile) {
        const file = await new Promise((resolve) => entry.file(resolve));
        const fullPath = `${path}/${file.name}`;
        
        if (file.name.toLowerCase().endsWith('.zip')) {
          zipFiles.push(file);
        } else {
          filesToProcess.push({ file, path: fullPath });
        }
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const subEntries = await new Promise((resolve) => dirReader.readEntries(resolve));
        for (const subEntry of subEntries) {
          await traverseFileTree(subEntry, `${path}/${entry.name}`);
        }
      }
    };

    for (const entry of entries) {
        await traverseFileTree(entry, '');
    }

    // Only show the "Importing..." overlay if there are no zip files to prompt for.
    if (filesToProcess.length > 0 && zipFiles.length === 0) {
        showOverlay(`Importing ${filesToProcess.length} file(s)...`);
    }

    // Process all non-zip files first
    const filePromises = filesToProcess.map(async ({ file, path }) => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        let content;

        if (imageExtensions.includes(extension)) {
            // --- FIX: Read images as an ArrayBuffer to preserve binary data ---
            console.log(`[DragDrop] Reading binary file: ${path}`);
            content = await file.arrayBuffer();
        } else {
            // --- For text files, read as text and wrap in the standard JSON structure ---
            console.log(`[DragDrop] Reading text file: ${path}`);
            const textContent = await file.text();
            const fileData = {
              content: textContent,
              lastModified: new Date().toISOString()
            };
            content = JSON.stringify(fileData, null, 2);
        }

        console.log(`[DragDrop] Writing file to git: ${path}`);
        // The writeFile method will now be able to handle both strings and ArrayBuffers
        return gitClient.writeFile(path, content);
    });
    
    await Promise.all(filePromises);

    // Then, handle each zip file with a modal
    for (const zipFile of zipFiles) {
        await handleZipFile(zipFile);
    }
  };

  const handleZipFile = (file) => {
    return new Promise((resolve) => {
      const modal = new Modal({ title: `Import Zip File: ${file.name}` });
      modal.updateContent(
        `<p>How would you like to import this .zip file?</p>`
      );
      
      modal.addFooterButton('Extract Files to Garden', async () => {
        modal.updateContent('<p>Extracting files...</p>');
        modal.clearFooter();
        try {
          await extractZip(file);
        } catch (e) {
            console.error('Zip extraction failed', e);
            modal.updateContent('<p>Error during extraction. Check console.</p>');
        }
        modal.destroy();
        resolve();
      });
      modal.addFooterButton('Import as Single .zip File', async () => {
        modal.updateContent('<p>Importing file...</p>');
        modal.clearFooter();
        try {
            await importFile(file);
        } catch (e) {
            console.error('Zip import failed', e);
            modal.updateContent('<p>Error during import. Check console.</p>');
        }
        modal.destroy();
        resolve();
      });
      modal.addFooterButton('Cancel', () => {
        modal.destroy();
        resolve();
      });

      modal.show();
    });
  };

  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      // Use the default message
      showOverlay('Drop files or folders to add them to the garden');
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
    hideOverlay(); // Immediately hide the drop zone overlay.
    const items = e.dataTransfer.items;
    if (!items || items.length === 0) {
      return;
    }
    const entries = Array.from(items)
      .map(item => item.webkitGetAsEntry())
      .filter(Boolean);

    if (entries.length > 0) {
      console.log(`[DragDrop] Processing ${entries.length} dropped item(s).`);
      
      try {
        await processEntries(entries);
        console.log('[DragDrop] All items processed.');
      } catch (err) {
        console.error('[DragDrop] An error occurred during import:', err);
        await sidebar.showAlert({ title: 'Import Error', message: 'An error occurred while importing. Please check the console.' });
      } finally {
        // Refresh sidebar and hide any remaining overlay
        await sidebar.refresh();
        setTimeout(() => {
          hideOverlay();
        }, 500);
      }
    }
  });
}