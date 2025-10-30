import { Git } from './util/git-integration.js';
import { parse } from 'yaml';

class ConfigService {
  constructor() {
    this.cache = new Map();
  }

  async get(file, key, context) {
    let gardenName;
    if (typeof context === 'string') {
      gardenName = context;
    } else if (context && context.gitClient) {
      gardenName = context.gitClient.gardenName;
    } else {
      const activeGitClient = await window.thoughtform.workspace.getActiveGitClient();
      gardenName = activeGitClient.gardenName;
    }

    const settingsFilePath = `settings/${file}`;

    // 1. Read base and override configs
    const { value: baseConfig, sourceGarden: baseSource } = await this._readAndCache('settings', settingsFilePath);
    let overrideConfig, overrideSource;
    if (gardenName !== 'settings') {
      ({ value: overrideConfig, sourceGarden: overrideSource } = await this._readAndCache(gardenName, settingsFilePath));
    }

    // 2. Merge configurations
    let finalConfig;
    const isBaseArray = Array.isArray(baseConfig);
    const isOverrideArray = Array.isArray(overrideConfig);
    const isBaseObject = typeof baseConfig === 'object' && baseConfig !== null && !isBaseArray;
    const isOverrideObject = typeof overrideConfig === 'object' && overrideConfig !== null && !isOverrideArray;

    if (isBaseArray || isOverrideArray) {
        // Handle array merging (for keymaps.yml)
        const merged = new Map();
        if (isBaseArray) {
            baseConfig.forEach(item => item && item.key && merged.set(item.key, { ...item, sourceGarden: baseSource }));
        }
        if (isOverrideArray) {
            overrideConfig.forEach(item => item && item.key && merged.set(item.key, { ...item, sourceGarden: overrideSource }));
        }
        finalConfig = Array.from(merged.values());
    } else if (isBaseObject || isOverrideObject) {
        // Handle object merging (for interface.yml)
        finalConfig = { ...baseConfig, ...overrideConfig };
    } else {
        finalConfig = overrideConfig !== undefined ? overrideConfig : baseConfig;
    }
    
    const value = key && finalConfig ? finalConfig[key] : finalConfig;
    return { value, sourceGarden: overrideSource || baseSource };
  }
  
  /**
   * Finds an executable script, cascading from the current garden to the 'settings' garden.
   * @param {string} type - The type of executable ('hook', 'keymap', 'query').
   * @param {string} fileName - The name of the script file (e.g., 'load.js').
   * @param {object|string} context - The editor or git client context, or a garden name string.
   * @returns {Promise<string|null>} The full, executable path (e.g., 'garden#path') or null.
   */
  async getExecutable(type, fileName, context) {
    let gardenName;
    if (typeof context === 'string') {
      gardenName = context;
    } else if (context && context.gitClient) {
      gardenName = context.gitClient.gardenName;
    } else {
      const activeGitClient = await window.thoughtform.workspace.getActiveGitClient();
      gardenName = activeGitClient.gardenName;
    }

    // --- THIS IS THE FUCKING FIX ---
    // Handle the inconsistent pluralization of the settings directories.
    const folderName = type === 'query' ? 'query' : `${type}s`;
    const scriptPath = `/settings/${folderName}/${fileName}`;
    // --- END OF FIX ---

    // 1. Check in the current garden.
    const gardenGit = new Git(gardenName);
    try {
      await gardenGit.pfs.stat(scriptPath);
      return `${gardenName}#${scriptPath}`; // Found it.
    } catch (e) {
      // Not found, which is fine. Continue to fallback.
      if (e.code !== 'ENOENT') console.error(`[ConfigService] Error checking for executable in ${gardenName}:`, e);
    }
    
    // 2. If not in the current garden and the current garden isn't 'settings', check 'settings'.
    if (gardenName.toLowerCase() !== 'settings') {
        const settingsGit = new Git('settings');
        try {
          await settingsGit.pfs.stat(scriptPath);
          return `settings#${scriptPath}`; // Found it in the fallback.
        } catch (e) {
          // Not found in fallback either.
          if (e.code !== 'ENOENT') console.error('[ConfigService] Error checking for executable in settings:', e);
        }
    }

    // 3. Not found anywhere.
    return null;
  }

  async _readAndCache(gardenName, filePath) {
    const fullPath = `/${filePath}`;
    const cacheKey = `${gardenName}#${fullPath}`;

    if (this.cache.has(cacheKey)) {
      const cachedValue = this.cache.get(cacheKey);
      return { value: cachedValue, sourceGarden: cachedValue ? gardenName : null };
    }

    try {
      const git = new Git(gardenName);
      await git.pfs.stat(fullPath);
      const content = await git.readFile(fullPath);
      const parsedConfig = parse(content);
      
      this.cache.set(cacheKey, parsedConfig);
      return { value: parsedConfig, sourceGarden: gardenName };
    } catch (e) {
      if (e.code !== 'ENOENT' && !e.message.includes('does not exist')) {
        console.error(`[ConfigService] Error reading or parsing ${cacheKey}:`, e);
      }
      this.cache.set(cacheKey, null);
      return { value: undefined, sourceGarden: null };
    }
  }

  invalidate(gardenName, filePath) {
    const fullPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const cacheKey = `${gardenName}#${fullPath}`;
    this.cache.delete(cacheKey);
  }
}

export function initializeConfigService() {
  return new ConfigService();
}