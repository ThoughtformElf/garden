import { Git } from '../util/git-integration.js';
import { Buffer } from 'buffer';

/**
 * Discovers and seeds core gardens if they do not already exist.
 * This function is designed to be robust and run on every application startup.
 */
export async function seedCoreGardens() {
  // Use Vite's glob to discover the JSON bundles created by the pre-build script.
  const gardenBundles = import.meta.glob('./bundles/*-bundle.json', { eager: true });

  for (const path in gardenBundles) {
    const gardenName = path.split('/').pop().replace('-bundle.json', '');
    const gitClient = new Git(gardenName);

    try {
      // Check for the existence of a core git file. A successful stat indicates
      // that the garden is already initialized and doesn't need to be seeded.
      await gitClient.pfs.stat('/.git/config');
      
      // Even if the DB exists, ensure the garden is registered in localStorage,
      // which can become inconsistent if manually cleared.
      gitClient.registerNewGarden();
      
      // The garden exists, so we can skip to the next one.
      continue;
    } catch (e) {
      // If the file doesn't exist (error code ENOENT), it means the garden is
      // missing or corrupted, and we must proceed with seeding.
      // Any other error type is unexpected and should be logged.
      if (e.code !== 'ENOENT') {
        console.error(`[Seeder] Unexpected error checking garden "${gardenName}":`, e);
        continue;
      }
    }

    console.log(`%c[Seeder] Core garden "${gardenName}" not found. Seeding now...`, 'font-weight: bold; color: #12ffbc;');
    
    // --- THIS IS THE FIX ---
    // Instead of wiping the entire filesystem, we now clear only the working
    // directory, which leaves the .git folder (if any) untouched. This is
    // safer and prepares for the bundled .git history to be written correctly.
    await gitClient.clearWorkdir();
    // --- END OF FIX ---

    const bundle = gardenBundles[path].default; // Get the content of the JSON file

    let fileCount = 0;
    for (const [relativePath, base64Content] of Object.entries(bundle)) {
      try {
        const contentBuffer = Buffer.from(base64Content, 'base64');
        await gitClient.writeFile(`/${relativePath}`, contentBuffer);
        fileCount++;
      } catch (error) {
        console.error(`[Seeder] Failed to write file "/${relativePath}" to garden "${gardenName}":`, error);
      }
    }
    
    console.log(`[Seeder] Wrote ${fileCount} files to "${gardenName}".`);
    gitClient.registerNewGarden();
  }
  
  // As this new logic is more robust, the old tracking key is no longer needed
  // and can be safely removed for cleanup.
  localStorage.removeItem('thoughtform_seeded_gardens');
}