import { Git } from './util/git-integration.js';
import { parse } from 'yaml';

class ConfigService {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Gets a configuration value, cascading through the correct context.
   * @param {string} file - The configuration file name (e.g., 'interface.yml').
   * @param {string} [key] - Optional specific key to retrieve from the file.
   * @param {object|string} [context] - The context for the request, either an editor instance or a garden name string.
   * @returns {Promise<{value: any, sourceGarden: string|null}>} The configuration value and its source garden.
   */
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

    if (!gardenName) {
      console.warn('[ConfigService] Could not determine a garden context for get().');
      return { value: undefined, sourceGarden: null };
    }
    
    const settingsFilePath = `settings/${file}`;

    // 1. Current Garden's settings folder (The Override)
    const { value: gardenValue, sourceGarden } = await this._readAndCache(gardenName, settingsFilePath, key);
    if (gardenValue !== undefined) return { value: gardenValue, sourceGarden };
    
    // 2. Global Settings Garden (The Base Layer)
    if (gardenName !== 'Settings') {
        const { value: globalValue, sourceGarden: globalSource } = await this._readAndCache('Settings', settingsFilePath, key);
        if (globalValue !== undefined) return { value: globalValue, sourceGarden: globalSource };
    }

    // 3. If not found anywhere, return undefined. There are no more hardcoded fallbacks.
    return { value: undefined, sourceGarden: null };
  }
  
  /**
   * Gets the correct, cascaded path for a hook script.
   * @param {string} hookFileName - The name of the hook file (e.g., 'create.js').
   * @param {object|string} [context] - The context for the request.
   * @returns {Promise<string|null>} The full, runnable path (e.g., 'MyGarden#settings/hooks/create.js') or null.
   */
  async getHook(hookFileName, context) {
    let gardenName;
    if (typeof context === 'string') {
      gardenName = context;
    } else if (context && context.gitClient) {
      gardenName = context.gitClient.gardenName;
    } else {
      const activeGitClient = await window.thoughtform.workspace.getActiveGitClient();
      gardenName = activeGitClient.gardenName;
    }

    const hookPath = `settings/hooks/${hookFileName}`;

    // 1. Check the context garden's settings
    const gardenGit = new Git(gardenName);
    try {
      await gardenGit.pfs.stat(`/${hookPath}`);
      return `${gardenName}#${hookPath}`;
    } catch (e) { /* File does not exist, continue */ }
    
    // 2. Check the global Settings garden (if different)
    if (gardenName !== 'Settings') {
        const settingsGit = new Git('Settings');
        try {
          await settingsGit.pfs.stat(`/${hookPath}`);
          return `Settings#${hookPath}`;
        } catch (e) { /* File does not exist */ }
    }

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
      
      // We must check if the file actually exists, as readFile can throw.
      // A stat call is a reliable way to confirm existence.
      try {
        await git.pfs.stat(fullPath);
      } catch (statError) {
        // This handles cases where readFile might succeed on a deleted but cached file.
        return { value: undefined, sourceGarden: null };
      }
      
      const parsedConfig = parse(content);
      this.cache.set(cacheKey, parsedConfig);
      const value = key ? parsedConfig?.[key] : parsedConfig;
      return { value, sourceGarden: gardenName };

    } catch (e) {
      // If reading fails (e.g., file not found), cache a 'null' to prevent re-reads
      // and return undefined.
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