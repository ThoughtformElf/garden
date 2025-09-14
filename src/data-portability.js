// src/data-portability.js
import JSZip from 'jszip';
import { Git } from './git-integration.js';

/**
 * Recursively lists all files for a given garden.
 * @param {object} gitClient - An instance of the Git class.
 * @param {string} dir - The directory to start from.
 * @returns {Promise<string[]>} A list of file paths.
 */
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
    console.log(`Directory not found: ${dir}. No files to list.`);
  }
  return fileList;
}

/**
 * Exports all gardens to a single .zip file and triggers a download.
 * @param {function(string)} log - A function to log progress messages to the UI.
 */
export async function exportAllGardens(log) {
  log('Starting export...');
  const zip = new JSZip();
  const gardensRaw = localStorage.getItem('thoughtform_gardens');
  const gardens = gardensRaw ? JSON.parse(gardensRaw) : ['home'];

  if (gardens.length === 0) {
    log('No gardens found to export.');
    return;
  }

  for (const gardenName of gardens) {
    log(`Processing garden: "${gardenName}"...`);
    const gardenFolder = zip.folder(gardenName);
    const gitClient = new Git(gardenName);
    const files = await listAllFiles(gitClient, '/');

    for (const filePath of files) {
      const content = await gitClient.readFile(filePath);
      // Remove leading slash for correct zip path
      const zipPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
      gardenFolder.file(zipPath, content);
    }
  }

  log('Generating zip file...');
  try {
    const content = await zip.generateAsync({ type: 'blob' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `thoughtform-gardens-backup-${timestamp}.zip`;
    
    // Create a link and trigger the download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    log(`Export complete: ${filename}`);
  } catch (e) {
    log(`Error during zip generation: ${e.message}`);
    console.error(e);
  }
}

/**
 * Imports gardens from a selected .zip file.
 * @param {File} file - The .zip file from the input element.
 * @param {function(string)} log - A function to log progress messages to the UI.
 * @returns {Promise<void>}
 */
export async function importFromZip(file, log) {
  log(`Reading ${file.name}...`);
  const reader = new FileReader();

  reader.onload = async (event) => {
    try {
      const zip = await JSZip.loadAsync(event.target.result);
      log('Zip file loaded. Starting import...');

      const importPromises = [];

      zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return;

        const pathParts = relativePath.split('/');
        const gardenName = pathParts.shift();
        const filePath = `/${pathParts.join('/')}`;

        const promise = zipEntry.async('string').then(async (content) => {
          log(`  Importing: ${gardenName}${filePath}`);
          const gitClient = new Git(gardenName);
          // initRepo is smart and will only create if it doesn't exist.
          // It also handles adding the garden to localStorage.
          await gitClient.initRepo();
          await gitClient.writeFile(filePath, content);
        });
        importPromises.push(promise);
      });
      
      await Promise.all(importPromises);
      log('Import complete! Refreshing page to apply changes...');
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (e) {
      log(`Error processing zip file: ${e.message}`);
      console.error(e);
    }
  };

  reader.onerror = (e) => {
    log('Failed to read the file.');
    console.error(e);
  };
  
  reader.readAsArrayBuffer(file);
}
