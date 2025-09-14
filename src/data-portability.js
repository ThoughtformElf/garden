// src/data-portability.js
import JSZip from 'jszip';
import { Git } from './git-integration.js';

async function listAllFiles(gitClient, dir) {
  const pfs = gitClient.pfs;
  let fileList = [];
  try {
    const items = await pfs.readdir(dir);
    for (const item of items) {
      if (item === '.git') continue;
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

/**
 * Exports a specific list of gardens to a .zip file.
 * @param {string[]} gardensToExport - An array of garden names to export.
 * @param {function(string)} log - A function for progress logging.
 */
export async function exportGardens(gardensToExport, log) {
  log('Starting export...');
  const zip = new JSZip();

  if (!gardensToExport || gardensToExport.length === 0) {
    log('No gardens selected for export.');
    return;
  }

  for (const gardenName of gardensToExport) {
    log(`Processing garden: "${gardenName}"...`);
    const gardenFolder = zip.folder(gardenName);
    const gitClient = new Git(gardenName);
    const files = await listAllFiles(gitClient, '/');

    for (const filePath of files) {
      const content = await gitClient.readFile(filePath);
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
  
  log(`Export complete: ${filename}`);
}

/**
 * Scans a zip file and returns a list of top-level directories (gardens).
 * @param {File} file - The .zip file from an input element.
 * @returns {Promise<string[]>} - A unique list of garden names found.
 */
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

/**
 * Imports a selected list of gardens from a .zip file.
 * @param {File} file - The .zip file.
 * @param {string[]} gardensToImport - An array of garden names to import from the zip.
 * @param {function(string)} log - A function for progress logging.
 */
export async function importGardensFromZip(file, gardensToImport, log) {
  log(`Reading ${file.name}...`);
  const zip = await JSZip.loadAsync(file);
  log('Zip file loaded. Starting import of selected gardens...');

  const importPromises = [];

  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;

    const gardenName = relativePath.split('/')[0];
    
    // Only process the file if its garden is in the list to import
    if (gardensToImport.includes(gardenName)) {
      const filePath = `/${relativePath.substring(gardenName.length + 1)}`;

      const promise = zipEntry.async('string').then(async (content) => {
        log(`  Importing: ${gardenName}${filePath}`);
        const gitClient = new Git(gardenName);
        await gitClient.initRepo(); // Creates garden if it doesn't exist
        await gitClient.writeFile(filePath, content);
      });
      importPromises.push(promise);
    }
  });
  
  await Promise.all(importPromises);
  log('Import complete! Reloading page...');
  
  setTimeout(() => {
    window.location.reload();
  }, 1500);
}
