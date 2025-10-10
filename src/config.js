// src/config.js
import { Git } from './util/git-integration.js';
import { parse } from 'yaml';

// --- Vite Raw Imports for Hardcoded Defaults ---
import defaultInterface from './settings/interface.yml?raw';
import defaultKeymaps from './settings/keymaps.yml?raw';
// We will add more here as we create more default hooks and configs.

const hardcodedDefaults = {
  'interface.yml': parse(defaultInterface),
  'keymaps.yml': parse(defaultKeymaps)
};

class ConfigService {
  constructor() {
    this.cache = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
  }

  /**
   * Gets a configuration value and its source.
   * @param {string} file - The configuration file name (e.g., 'interface.yml').
   * @param {string} [key] - Optional specific key to retrieve from the file.
   * @returns {Promise<{value: any, sourceGarden: string|null}>} The configuration value and its source garden.
   */
  async get(file, key) {
    await this.initialize();

    const currentGarden = window.thoughtform.editor?.gitClient.gardenName;
    if (!currentGarden) return { value: this._getHardcoded(file, key), sourceGarden: null };

    // 1. Frontmatter (To be implemented in a future phase)

    // 2. Current Garden's settings/ folder
    if (currentGarden !== 'Settings') {
      const gardenSpecificPath = `settings/${file}`;
      const { value: gardenValue, sourceGarden } = await this._readAndCache(currentGarden, gardenSpecificPath, key);
      if (gardenValue !== undefined) return { value: gardenValue, sourceGarden };
    }

    // 3. Global Settings Garden
    const { value: globalValue, sourceGarden: globalSource } = await this._readAndCache('Settings', file, key);
    if (globalValue !== undefined) return { value: globalValue, sourceGarden: globalSource };

    // 4. Hardcoded Default
    return { value: this._getHardcoded(file, key), sourceGarden: null };
  }
  
  async getHook(hookFileName) {
    const currentGarden = window.thoughtform.editor.gitClient.gardenName;
    const hookSubPath = `hooks/${hookFileName}`;

    if (currentGarden !== 'Settings') {
      const gardenSpecificPath = `settings/${hookSubPath}`;
      const gardenGit = new Git(currentGarden);
      try {
        await gardenGit.pfs.stat(`/${gardenSpecificPath}`);
        return `${currentGarden}#${gardenSpecificPath}`;
      } catch (e) { /* File does not exist, continue */ }
    }

    const globalPath = hookSubPath;
    const settingsGit = new Git('Settings');
    try {
      await settingsGit.pfs.stat(`/${globalPath}`);
      return `Settings#${globalPath}`;
    } catch (e) { /* File does not exist */ }

    return null;
  }

  async _readAndCache(gardenName, filePath, key) {
    const fullPath = `/${filePath}`;
    const cacheKey = `${gardenName}#${fullPath}`;

    if (this.cache.has(cacheKey)) {
      const cachedConfig = this.cache.get(cacheKey);
      const value = key ? cachedConfig?.[key] : cachedConfig;
      return { value, sourceGarden: gardenName };
    }

    try {
      const git = new Git(gardenName);
      const content = await git.readFile(fullPath);
      
      try {
        await git.pfs.stat(fullPath);
      } catch (statError) {
        return { value: undefined, sourceGarden: null };
      }
      
      const parsedConfig = parse(content);
      this.cache.set(cacheKey, parsedConfig);
      const value = key ? parsedConfig?.[key] : parsedConfig;
      return { value, sourceGarden: gardenName };

    } catch (e) {
      console.warn(`[ConfigService] Could not read or parse ${cacheKey}.`, e);
      this.cache.set(cacheKey, null);
      return { value: undefined, sourceGarden: null };
    }
  }

  _getHardcoded(file, key) {
    const defaultConfig = hardcodedDefaults[file];
    return key ? defaultConfig?.[key] : defaultConfig;
  }

  invalidate(gardenName, filePath) {
    const cacheKey = `${gardenName}#/${filePath}`;
    this.cache.delete(cacheKey);
  }
}

export function initializeConfigService() {
  return new ConfigService();
}