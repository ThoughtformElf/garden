const fs = require('fs/promises');
const path = require('path');

const GARDENS_DIR = path.join(__dirname, '..', 'src', 'gardens');

// A recursive function to read all files in a directory and return their
// content as a map of { relativePath: base64Content }.
async function readAllFiles(dir, rootDir) {
  const files = {};
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      // The path relative to the garden's root (e.g., '.git/config')
      const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        Object.assign(files, await readAllFiles(fullPath, rootDir));
      } else {
        // Read as a buffer and convert to base64 to handle all file types safely.
        const content = await fs.readFile(fullPath);
        files[relativePath] = content.toString('base64');
      }
    }
  } catch (e) {
    if (e.code !== 'ENOENT') console.error(`Error reading directory ${dir}:`, e);
  }
  return files;
}

async function main() {
  console.log('[PrepareGardens] Starting...');
  try {
    const gardenDirs = await fs.readdir(GARDENS_DIR, { withFileTypes: true });

    for (const dir of gardenDirs) {
      if (dir.isDirectory()) {
        const gardenName = dir.name;
        const gardenPath = path.join(GARDENS_DIR, gardenName);
        console.log(`[PrepareGardens] Bundling garden: "${gardenName}"...`);
        
        const files = await readAllFiles(gardenPath, gardenPath);
        
        // We will create the bundle in a place Vite can easily find it.
        const outputDir = path.join(__dirname, '..', 'src', 'workspace', 'bundles');
        await fs.mkdir(outputDir, { recursive: true });
        const outputPath = path.join(outputDir, `${gardenName}-bundle.json`);
        await fs.writeFile(outputPath, JSON.stringify(files)); // No pretty-printing for smaller size
        
        console.log(`[PrepareGardens] Created bundle for "${gardenName}" with ${Object.keys(files).length} files.`);
      }
    }
  } catch (e) {
    console.error('[PrepareGardens] A critical error occurred:', e);
  }
  console.log('[PrepareGardens] Finished.');
}

main().catch(console.error);