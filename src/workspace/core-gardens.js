import { Git } from '../util/git-integration.js';
import { Buffer } from 'buffer';

/**
 * Discovers and seeds core gardens by unpacking pre-built JSON bundles.
 */
export async function seedCoreGardens() {
  // Use Vite's glob to discover the JSON bundles created by the pre-build script.
  const gardenBundles = import.meta.glob('./bundles/*-bundle.json', { eager: true });

  const seededGardensRaw = localStorage.getItem('thoughtform_seeded_gardens');
  const seededGardens = new Set(seededGardensRaw ? JSON.parse(seededGardensRaw) : []);

  for (const path in gardenBundles) {
    const gardenName = path.split('/').pop().replace('-bundle.json', '');
    if (seededGardens.has(gardenName)) {
      continue;
    }

    console.log(`%c[Seeder] Unpacking and seeding core garden: "${gardenName}"...`, 'font-weight: bold; color: #12ffbc;');
    const gitClient = new Git(gardenName);
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
    
    console.log(`[Seeder] Wrote ${fileCount} files to "${gardenName}", force-seeding the complete repository state.`);
    gitClient.registerNewGarden();
    seededGardens.add(gardenName);
  }

  localStorage.setItem('thoughtform_seeded_gardens', JSON.stringify(Array.from(seededGardens)));
}