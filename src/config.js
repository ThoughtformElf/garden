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

    const gardenGit = new Git(gardenName);
    try {
      await gardenGit.pfs.stat(`/${hookPath}`);
      return `${gardenName}#${hookPath}`;
    } catch (e) { /* File does not exist, continue */ }
    
    if (gardenName !== 'settings') {
        const settingsGit = new Git('settings');
        try {
          await settingsGit.pfs.stat(`/${hookPath}`);
          return `settings#${hookPath}`;
        } catch (e) { /* File does not exist */ }
    }

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