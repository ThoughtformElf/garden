/**
 * Generates a unique path for a new scratchpad file.
 * The format is /scratchpad/YYMMDD-HHMM.
 * If a file with that name already exists, it appends a counter (e.g., -1, -2).
 *
 * @param {Git} gitClient - The git client instance for the garden where the file will be created.
 * @returns {Promise<string>} A promise that resolves to the unique scratchpad file path.
 */
export async function generateUniqueScratchpadPath(gitClient) {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const baseName = `${year}${month}${day}-${hours}${minutes}`;
  const baseDir = '/scratchpad';
  
  await gitClient.ensureDir(baseDir);

  let finalPath = `${baseDir}/${baseName}`;
  let counter = 0;

  // Check for conflicts and append a counter if necessary
  while (true) {
    try {
      await gitClient.pfs.stat(finalPath);
      // If stat succeeds, the file exists. Increment counter and try again.
      counter++;
      finalPath = `${baseDir}/${baseName}-${counter}`;
    } catch (e) {
      // If stat fails with ENOENT, the file doesn't exist. This is the path we want.
      if (e.code === 'ENOENT') {
        break;
      }
      // If it's another error, re-throw it.
      throw e;
    }
  }

  return finalPath;
}