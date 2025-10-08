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
    console.log('[ConfigService] Initializing...');
    
    // For now, we'll implement a simple "read on demand" with caching.
    // A full "scan all on startup" can be a future optimization.
    
    this.isInitialized = true;
    console.log('[ConfigService] Initialized.');
  }

  /**
   * Gets a configuration value from a YAML file.
   * Example: get('interface.yml', 'editingMode')
   * @param {string} file - The configuration file name (e.g., 'interface.yml').
   * @param {string} key - The specific key to retrieve from the file.
   * @returns {Promise<any>} The configuration value.
   */
  async get(file, key) {
    await this.initialize();

    const currentGarden = window.thoughtform.editor?.gitClient.gardenName;
    if (!currentGarden) return this._getHardcoded(file, key);

    // 1. Frontmatter (To be implemented in a future phase)

    // 2. Current Garden's settings/ folder
    if (currentGarden !== 'Settings') {
      const gardenSpecificPath = `settings/${file}`;
      const gardenValue = await this._readAndCache(currentGarden, gardenSpecificPath, key);
      if (gardenValue !== undefined) return gardenValue;
    }

    // 3. Global Settings Garden
    const globalValue = await this._readAndCache('Settings', file, key);
    if (globalValue !== undefined) return globalValue;

    // 4. Hardcoded Default
    return this._getHardcoded(file, key);
  }
  
  /**
   * Finds the correct hook script to run based on the cascade.
   * @param {string} hookFileName - e.g., 'load.js'
   * @returns {Promise<string|null>} The full, runnable path (e.g., 'Settings#hooks/load.js') or null.
   */
  async getHook(hookFileName) {
    const currentGarden = window.thoughtform.editor.gitClient.gardenName;
    const hookSubPath = `hooks/${hookFileName}`;

    // 1. Check Current Garden's settings/hooks/ folder
    if (currentGarden !== 'Settings') {
      const gardenSpecificPath = `settings/${hookSubPath}`;
      const gardenGit = new Git(currentGarden);
      try {
        await gardenGit.pfs.stat(`/${gardenSpecificPath}`);
        return `${currentGarden}#${gardenSpecificPath}`;
      } catch (e) { /* File does not exist, continue */ }
    }

    // 2. Check Global Settings/hooks/ folder
    const globalPath = hookSubPath;
    const settingsGit = new Git('Settings');
    try {
      await settingsGit.pfs.stat(`/${globalPath}`);
      return `Settings#${globalPath}`;
    } catch (e) { /* File does not exist */ }

    return null; // No hook found
  }

  async _readAndCache(gardenName, filePath, key) {
    const fullPath = `/${filePath}`;
    const cacheKey = `${gardenName}#${fullPath}`;

    if (this.cache.has(cacheKey)) {
      const cachedConfig = this.cache.get(cacheKey);
      return key ? cachedConfig?.[key] : cachedConfig;
    }

    try {
      const git = new Git(gardenName);
      const content = await git.readFile(fullPath);
      
      try {
        await git.pfs.stat(fullPath);
      } catch (statError) {
        return undefined;
      }
      
      const parsedConfig = parse(content);
      this.cache.set(cacheKey, parsedConfig);
      return key ? parsedConfig?.[key] : parsedConfig;

    } catch (e) {
      console.warn(`[ConfigService] Could not read or parse ${cacheKey}.`, e);
      this.cache.set(cacheKey, null);
      return undefined;
    }
  }

  _getHardcoded(file, key) {
    const defaultConfig = hardcodedDefaults[file];
    return key ? defaultConfig?.[key] : defaultConfig;
  }

  invalidate(gardenName, filePath) {
    const cacheKey = `${gardenName}#/${filePath}`;
    this.cache.delete(cacheKey);
    console.log(`[ConfigService] Invalidated cache for ${cacheKey}`);
  }
}

export function initializeConfigService() {
  return new ConfigService();
}