import { Git } from './git-integration.js';

/**
 * A utility to list all files recursively in a garden.
 * @param {Git} gitClient - An instance of the Git client for a garden.
 * @param {string} dir - The directory to start from (usually '/').
 * @returns {Promise<string[]>} A list of full file paths.
 */
async function listAllFiles(gitClient, dir) {
  const pfs = gitClient.pfs;
  let fileList = [];
  try {
    const items = await pfs.readdir(dir);
    for (const item of items) {
      if (item === '.git') continue; // Skip the git directory
      const path = `${dir === '/' ? '' : dir}/${item}`;
      try {
        const stat = await pfs.stat(path);
        if (stat.isDirectory()) {
          fileList = fileList.concat(await listAllFiles(gitClient, path));
        } else {
          fileList.push(path);
        }
      } catch (e) {
        console.warn(`[Migration] Could not stat ${path}, skipping.`);
      }
    }
  } catch (e) {
    console.warn(`[Migration] Could not read directory: ${dir}.`);
  }
  return fileList;
}

/**
 * The main migration function. Iterates through all gardens and all files,
 * converting any files in the old JSON format to the new raw content format.
 */
export async function runMigration() {
  console.log('%cStarting Thoughtform data migration...', 'font-weight: bold; font-size: 1.2em;');
  console.log('This will convert all files from the old JSON format to raw content. This only needs to be run once.');

  const gardensRaw = localStorage.getItem('thoughtform_gardens');
  const gardens = gardensRaw ? JSON.parse(gardensRaw) : ['home'];

  if (gardens.length === 0) {
    console.log('No gardens found to migrate.');
    return;
  }

  let totalFilesChecked = 0;
  let totalFilesMigrated = 0;

  for (const gardenName of gardens) {
    console.log(`%cProcessing garden: "${gardenName}"`, 'font-weight: bold; color: blue;');
    const gitClient = new Git(gardenName);
    const files = await listAllFiles(gitClient, '/');
    
    if (files.length === 0) {
      console.log('No files found in this garden.');
      continue;
    }

    for (const filePath of files) {
      totalFilesChecked++;
      try {
        const rawContent = await gitClient.readFile(filePath);
        
        // Attempt to parse the file content as JSON
        let parsed;
        try {
          parsed = JSON.parse(rawContent);
        } catch (e) {
          // This is expected for binary files or already-migrated files.
          console.log(`- ${filePath} is not in JSON format, skipping.`);
          continue;
        }

        // Check if it's our specific old format
        if (parsed && typeof parsed.content !== 'undefined') {
          const pureContent = parsed.content;
          
          // Only write if the content is actually different, to be safe
          if (rawContent !== pureContent) {
            console.log(`%c  MIGRATING: ${filePath}`, 'color: green;');
            await gitClient.writeFile(filePath, pureContent);
            totalFilesMigrated++;
          } else {
             console.log(`- ${filePath} content is already raw, skipping.`);
          }
        } else {
          console.log(`- ${filePath} is valid JSON but not the old format, skipping.`);
        }
      } catch (e) {
        console.error(`%c  ERROR: Failed to process ${filePath}.`, 'color: red;', e);
      }
    }
  }

  console.log('%cMigration complete!', 'font-weight: bold; font-size: 1.2em;');
  console.log(`Checked ${totalFilesChecked} files across ${gardens.length} garden(s).`);
  console.log(`Migrated ${totalFilesMigrated} files.`);
  console.log('You should now refresh the page.');
}