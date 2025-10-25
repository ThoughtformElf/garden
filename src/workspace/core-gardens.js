import { Git } from '../util/git-integration.js';

// Use the modern, recommended Vite glob syntax.
const coreGardenFiles = import.meta.glob('/src/gardens/**/*', { 
  query: '?raw', 
  import: 'default', 
  eager: true 
});

/**
 * Discovers and seeds core gardens from the /src/gardens directory on first launch.
 */
export async function seedCoreGardens() {
  const discoveredFiles = Object.keys(coreGardenFiles);
  if (discoveredFiles.length === 0) {
    // No submodules found, nothing to do.
    return;
  }

  // --- THIS IS THE FIX: DYNAMICALLY DISCOVER GARDEN NAMES ---
  // Instead of a hardcoded array, we derive the garden names from the file paths.
  const discoveredGardenNames = new Set();
  for (const path of discoveredFiles) {
    // Path example: /src/gardens/settings/settings/interface.yml
    const parts = path.split('/');
    const gardensIndex = parts.indexOf('gardens');
    if (gardensIndex !== -1 && parts.length > gardensIndex + 1) {
      const gardenName = parts[gardensIndex + 1]; // This is the folder name (e.g., "settings")
      discoveredGardenNames.add(gardenName);
    }
  }

  if (discoveredGardenNames.size === 0) return;
  console.log('[Seeder] Discovered core garden directories:', Array.from(discoveredGardenNames));
  // --- END OF FIX ---


  const seededGardensRaw = localStorage.getItem('thoughtform_seeded_gardens');
  const seededGardens = new Set(seededGardensRaw ? JSON.parse(seededGardensRaw) : []);

  // Now, iterate over the gardens we actually found.
  for (const gardenName of discoveredGardenNames) {
    if (seededGardens.has(gardenName)) {
      continue; // This garden is already seeded, skip it.
    }

    console.log(`%c[Seeder] Seeding new core garden: "${gardenName}"...`, 'font-weight: bold; color: #12ffbc;');
    const git = new Git(gardenName);
    await git.initRepo();
    await git.clearWorkdir(); // Ensure the garden is empty before populating.

    let fileCount = 0;
    // The prefix is now built from the dynamically discovered garden name.
    const pathPrefix = `/src/gardens/${gardenName}/`;

    for (const path in coreGardenFiles) {
      // The check is now case-sensitive and correct because gardenName comes from the actual folder.
      if (path.startsWith(pathPrefix)) {
        const filePathInGarden = path.substring(pathPrefix.length);
        const content = coreGardenFiles[path];
        
        try {
          const finalPath = `/${filePathInGarden}`;
          await git.writeFile(finalPath, content);
          fileCount++;
        } catch (error) {
          console.error(`[Seeder] Failed to write file "/${filePathInGarden}" to garden "${gardenName}":`, error);
        }
      }
    }
    
    if (fileCount > 0) {
      await git.commit(`Initial commit: Seed core garden "${gardenName}"`);
      console.log(`[Seeder] Wrote ${fileCount} files to "${gardenName}" and created initial commit.`);
    } else {
      console.warn(`[Seeder] No files were matched for the core garden "${gardenName}". The garden will be empty.`);
    }

    seededGardens.add(gardenName);
  }

  localStorage.setItem('thoughtform_seeded_gardens', JSON.stringify(Array.from(seededGardens)));
}