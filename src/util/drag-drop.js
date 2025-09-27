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

  // This function now handles both files and directories, with a logging callback.
  const processEntries = async (entries, logCallback) => {
    let finalEntries = entries;

    const gitAtRoot = entries.some(entry => entry.isDirectory && entry.name === '.git');
    if (gitAtRoot) {
      const userChoice = await Modal.choice({
        title: '.git Directory Detected',
        message: `<p>The content you dropped contains a .git repository. This could unintentionally overwrite your garden's history.</p><p>How would you like to proceed?</p>`,
        choices: [
          { id: 'import_safe', text: 'Import Files (Ignore .git folder)' },
          { id: 'cancel', text: 'Cancel Import', class: 'destructive' }
        ]
      });
      
      if (!userChoice || userChoice === 'cancel') {
        logCallback('Import cancelled by user.', 'Import cancelled by user.');
        return; // Abort the entire operation
      }
      
      // If we are here, user chose 'import_safe'
      finalEntries = entries.filter(entry => !(entry.isDirectory && entry.name === '.git'));
      logCallback('Ignoring .git directory and proceeding with import.', 'Ignoring .git directory.');
    }


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

    logCallback('Scanning dropped items...', 'Scanning dropped items...');
    for (const entry of finalEntries) {
        await traverseFileTree(entry, '');
    }
    const scanMessage = `Found ${filesToProcess.length} file(s) and ${zipFiles.length} zip archive(s) to process.`;
    logCallback(scanMessage, scanMessage);


    const filePromises = filesToProcess.map(async ({ file, path }) => {
        let content;
        const extension = file.name.split('.').pop()?.toLowerCase();
        
        if (imageExtensions.includes(extension)) {
            content = await file.arrayBuffer();
        } else {
            const textContent = await file.text();
            const fileData = { content: textContent, lastModified: new Date().toISOString() };
            content = JSON.stringify(fileData, null, 2);
        }
        return gitClient.writeFile(path, content);
    });
    
    const results = await Promise.allSettled(filePromises);
    results.forEach((result, index) => {
      const filePath = filesToProcess[index].path;
      if (result.status === 'rejected') {
        const htmlMsg = `<span style="color: var(--color-text-destructive);">ERROR:</span> Failed to write "${filePath}": ${result.reason}`;
        const consoleMsg = `ERROR: Failed to write "${filePath}": ${result.reason}`;
        logCallback(htmlMsg, consoleMsg);
      } else {
        const htmlMsg = `<span style="color: var(--color-text-success);">OK:</span> Imported "${filePath}"`;
        const consoleMsg = `OK: Imported "${filePath}"`;
        logCallback(htmlMsg, consoleMsg);
      }
    });

    if (zipFiles.length > 0) {
        const zipMessage = 'Note: Zip archives must be imported via the DevTools > Data panel.';
        logCallback(zipMessage, zipMessage);
    }
  };

  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
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
    hideOverlay();
    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;
    
    const entries = Array.from(items)
      .map(item => item.webkitGetAsEntry())
      .filter(Boolean);

    if (entries.length > 0) {
      const importModal = new Modal({ title: 'Importing Files...' });
      const logContainer = document.createElement('div');
      logContainer.style.fontFamily = 'monospace';
      logContainer.style.maxHeight = '300px';
      logContainer.style.overflowY = 'auto';
      logContainer.style.fontSize = '12px';
      importModal.updateContent('');
      importModal.content.appendChild(logContainer);
      importModal.show();

      let logHTML = '';
      const logCallback = (htmlMessage, consoleMessage) => {
        // Use the plain message for the console, and the HTML for the modal
        console.log(`[Import Log] ${consoleMessage}`);
        logHTML += `<div>${htmlMessage}</div>`;
        logContainer.innerHTML = logHTML;
        logContainer.scrollTop = logContainer.scrollHeight;
      };

      try {
        await processEntries(entries, logCallback);
        logCallback('<strong>Import process complete.</strong>', 'Import process complete.');
      } catch (err) {
        const htmlMsg = `<strong style="color: var(--color-text-destructive);">A critical error occurred: ${err.message}</strong>`;
        const consoleMsg = `A critical error occurred: ${err.message}`;
        logCallback(htmlMsg, consoleMsg);
        console.error('[DragDrop] A critical error occurred during import:', err);
      } finally {
        importModal.addFooterButton('Close', () => importModal.destroy());
        await sidebar.refresh();
      }
    }
  });
}