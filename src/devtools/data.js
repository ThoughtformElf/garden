import JSZip from 'jszip';
import { Git } from '../util/git-integration.js';
import { Modal } from '../util/modal.js';

async function listAllFiles(gitClient, dir) {
  const pfs = gitClient.pfs;
  let fileList = [];
  try {
    const items = await pfs.readdir(dir);
    for (const item of items) {
      const path = `${dir === '/' ? '' : dir}/${item}`;
      try {
        const stat = await pfs.stat(path);
        if (stat.isDirectory()) {
          fileList = fileList.concat(await listAllFiles(gitClient, path));
        } else {
          fileList.push(path);
        }
      } catch (e) {
        console.warn(`Could not stat ${path}, skipping.`);
      }
    }
  } catch (e) {
    console.log(`Could not read directory: ${dir}.`);
  }
  return fileList;
}

// A recursive, forceful remove utility for directories.
async function rmrf(pfs, path) {
    try {
        const stat = await pfs.stat(path);
        if (stat.isDirectory()) {
            const entries = await pfs.readdir(path);
            for (const entry of entries) {
                await rmrf(pfs, `${path}/${entry}`);
            }
            await pfs.rmdir(path);
        } else {
            await pfs.unlink(path);
        }
    } catch (e) {
        if (e.code !== 'ENOENT') { // Ignore if file/dir doesn't exist
            console.error(`Error during rmrf for ${path}:`, e);
            throw e;
        }
    }
}


export async function exportGardens(gardensToExport, log) {
  log('Starting export...');
  const zip = new JSZip();

  if (!gardensToExport || gardensToExport.length === 0) {
    throw new Error('No gardens were selected for export.');
  }

  for (const gardenName of gardensToExport) {
    log(`Processing garden: "${gardenName}"...`);
    const gardenFolder = zip.folder(gardenName);
    const gitClient = new Git(gardenName);
    const files = await listAllFiles(gitClient, '/');

    for (const filePath of files) {
      // For git files and other non-text files, read as a buffer
      const content = await gitClient.pfs.readFile(filePath);
      const zipPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
      gardenFolder.file(zipPath, content);
    }
  }

  log('Generating zip file...');
  const content = await zip.generateAsync({ type: 'blob' });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `thoughtform-gardens-backup-${timestamp}.zip`;
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  log(`Export process initiated: ${filename}`);
}

export async function getGardensFromZip(file) {
    const zip = await JSZip.loadAsync(file);
    const gardenSet = new Set();
    zip.forEach((relativePath) => {
        if (relativePath.includes('/')) {
            const gardenName = relativePath.split('/')[0];
            gardenSet.add(gardenName);
        }
    });
    return Array.from(gardenSet).sort();
}

export async function importGardensFromZip(file, gardensToImport, log) {
  if (!gardensToImport || gardensToImport.length === 0) {
    throw new Error('No gardens were selected for import.');
  }

  log(`Reading ${file.name}...`);
  const zip = await JSZip.loadAsync(file);
  log('Zip file loaded. Analyzing backup contents...');

  let importStrategy = 'merge'; // Default strategy
  const gardensWithHistoryConflict = [];

  for (const gardenName of gardensToImport) {
    const gitClient = new Git(gardenName);
    let hasLocalHistory = false;
    try {
      await gitClient.pfs.stat('/.git');
      hasLocalHistory = true;
    } catch (e) { /* No local history, which is fine */ }
    
    const hasBackupHistory = Object.keys(zip.files).some(filePath => filePath.startsWith(`${gardenName}/.git/`));

    if (hasLocalHistory && hasBackupHistory) {
      gardensWithHistoryConflict.push(gardenName);
    }
  }

  if (gardensWithHistoryConflict.length > 0) {
    const gardenList = `<ul>${gardensWithHistoryConflict.map(g => `<li><strong>${g}</strong></li>`).join('')}</ul>`;
    const userChoice = await Modal.choice({
      title: 'Replace Garden History?',
      message: `<p>The backup contains a git history for the following existing garden(s):</p>
                ${gardenList}
                <p>Replacing history is a destructive action. How should we proceed?</p>`,
      choices: [
        { id: 'replace', text: 'Replace History', class: 'destructive' },
        { id: 'merge', text: 'Merge Files, Keep Local History' },
        { id: 'cancel', text: 'Cancel Import' }
      ]
    });

    if (!userChoice || userChoice === 'cancel') {
      log('Import cancelled by user.');
      return;
    }
    importStrategy = userChoice;
  }

  if (importStrategy === 'replace') {
    log('Strategy: Replacing history for conflicting gardens.');
    for (const gardenName of gardensWithHistoryConflict) {
      log(`  Deleting existing .git directory for "${gardenName}"...`);
      const gitClient = new Git(gardenName);
      await rmrf(gitClient.pfs, '/.git');
      log(`  Done deleting for "${gardenName}".`);
    }
  } else {
    log('Strategy: Merging files and keeping local history where conflicts exist.');
  }

  const gitClients = new Map();
  log('Initializing target gardens...');
  for (const gardenName of gardensToImport) {
    const gitClient = new Git(gardenName);
    await gitClient.initRepo();
    gitClients.set(gardenName, gitClient);
  }

  log('Initialization complete. Starting file writes...');
  const importPromises = [];
  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;

    const gardenName = relativePath.split('/')[0];
    if (!gardensToImport.includes(gardenName)) return;

    // --- STRATEGY LOGIC ---
    // --- FINAL FIX: Correctly check for '.git' with the leading period ---
    const isGitFile = relativePath.substring(gardenName.length + 1).startsWith('.git/');
    if (isGitFile && importStrategy === 'merge' && gardensWithHistoryConflict.includes(gardenName)) {
        // Skip this git file because we're keeping local history for this garden.
        return;
    }

    const filePath = `/${relativePath.substring(gardenName.length + 1)}`;
    const promise = zipEntry.async('uint8array').then(async (content) => {
      const gitClient = gitClients.get(gardenName);
      await gitClient.writeFile(filePath, content);
    });
    importPromises.push(promise);
  });
  
  const totalFiles = importPromises.length;
  let completedFiles = 0;
  importPromises.forEach(p => p.then(() => {
    completedFiles++;
    if (completedFiles % 100 === 0 || completedFiles === totalFiles) {
        log(`Writing files... (${completedFiles}/${totalFiles})`);
    }
  }));

  await Promise.all(importPromises);
  log('Import complete! Reloading page...');
  
  setTimeout(() => window.location.reload(), 1500);
}

/**
 * Deletes a list of specified gardens.
 * @param {string[]} gardensToDelete - An array of garden names.
 * @param {function(string)} log - A logging callback for progress.
 */
export async function deleteGardens(gardensToDelete, log) {
  if (!gardensToDelete || gardensToDelete.length === 0) {
    throw new Error('No gardens were selected for deletion.');
  }

  log('Starting deletion process...');
  const gardensRaw = localStorage.getItem('thoughtform_gardens');
  let allGardens = gardensRaw ? JSON.parse(gardensRaw) : [];

  for (const gardenName of gardensToDelete) {
    log(`Deleting garden: "${gardenName}"...`);
    
    // Remove from localStorage registry
    allGardens = allGardens.filter(g => g !== gardenName);
    
    // Delete the IndexedDB database
    const dbName = `garden-fs-${gardenName}`;
    await new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(dbName);
      deleteRequest.onsuccess = () => {
        log(`  Successfully deleted database: ${dbName}`);
        resolve();
      };
      deleteRequest.onerror = (e) => {
        log(`  Error deleting database: ${dbName}`);
        reject(e.target.error);
      };
      deleteRequest.onblocked = () => {
        log(`  Deletion blocked for ${dbName}. Please refresh and try again.`);
        reject(new Error('Deletion blocked'));
      };
    });
  }

  localStorage.setItem('thoughtform_gardens', JSON.stringify(allGardens));
  log('Updated garden registry in localStorage.');
  log('Deletion complete. Reloading...');

  setTimeout(() => {
    const currentGarden = decodeURIComponent(window.location.pathname.split('/').pop() || 'home');
    if (gardensToDelete.includes(currentGarden) || allGardens.length === 0) {
        const fullPath = new URL(import.meta.url).pathname;
        const srcIndex = fullPath.lastIndexOf('/src/');
        const basePath = srcIndex > -1 ? fullPath.substring(0, srcIndex) : '';
        window.location.href = `${window.location.origin}${basePath}/home`;
    } else {
        window.location.reload();
    }
  }, 2000);
}