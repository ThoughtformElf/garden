import { Git } from '../util/git-integration.js';

// Define the list of core gardens that should be seeded from the source.
const CORE_GARDENS = ['Settings'];

// Use the modern, recommended Vite glob syntax.
const coreGardenFiles = import.meta.glob('/src/gardens/**/*', { 
  query: '?raw', 
  import: 'default', 
  eager: true 
});

/**
 * Checks for and seeds core gardens on the user's first launch.
 * This ensures that default settings, tools, and configurations are available.
 */
export async function seedCoreGardens() {
  const discoveredFiles = Object.keys(coreGardenFiles);
  if (discoveredFiles.length === 0) {
    return;
  }

  const seededGardensRaw = localStorage.getItem('thoughtform_seeded_gardens');
  const seededGardens = new Set(seededGardensRaw ? JSON.parse(seededGardensRaw) : []);

  for (const gardenName of CORE_GARDENS) {
    if (seededGardens.has(gardenName)) {
      continue;
    }

    console.log(`%c[Seeder] Seeding new core garden: "${gardenName}"...`, 'font-weight: bold; color: #12ffbc;');
    const git = new Git(gardenName);
    await git.initRepo();
    
    // --- THIS IS THE FIX ---
    // Before populating, ensure the garden's working directory is completely empty.
    // This removes the default "/home" file that initRepo might have created.
    await git.clearWorkdir();
    // --- END OF FIX ---

    let fileCount = 0;
    const pathPrefix = `/src/gardens/${gardenName}/`.toLowerCase();

    for (const path in coreGardenFiles) {
      if (path.toLowerCase().startsWith(pathPrefix)) {
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
      console.warn(`[Seeder] No files from the source directory were matched for the core garden "${gardenName}". The garden will be empty.`);
    }

    seededGardens.add(gardenName);
  }

  localStorage.setItem('thoughtform_seeded_gardens', JSON.stringify(Array.from(seededGardens)));
}