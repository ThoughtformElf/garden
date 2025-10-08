// src/hooks.js
import { Git } from './util/git-integration.js';
import { executeFile } from './executor.js';

const eventToHookFileMap = {
  'app:load': 'load.js',
  'file:create': 'create.js',
  // Future events will be mapped here
};

export class HookRunner {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.git = window.thoughtform.editor.gitClient;
  }

  initialize() {
    console.log('[HookRunner] Initializing and subscribing to events...');
    for (const eventName in eventToHookFileMap) {
      this.eventBus.subscribe(eventName, (eventData) => {
        this.handleEvent(eventName, eventData);
      });
    }
  }

  async handleEvent(eventName, eventData) {
    const hookFileName = eventToHookFileMap[eventName];
    if (!hookFileName) return;

    const hookPath = await this._findHookScript(hookFileName);
    if (hookPath) {
      console.log(`[HookRunner] Found hook for "${eventName}". Executing: ${hookPath}`);
      executeFile(hookPath, window.thoughtform.editor, this.git, eventData);
    }
  }

  /**
   * Finds the correct hook script to run based on the cascade.
   * @param {string} hookFileName - e.g., 'load.js'
   * @returns {Promise<string|null>} The full, runnable path (e.g., 'Settings#hooks/load.js') or null.
   */
  async _findHookScript(hookFileName) {
    const currentGarden = this.git.gardenName;
    const hookSubPath = `hooks/${hookFileName}`;

    // 1. Check Current Garden's settings/hooks/ folder
    if (currentGarden !== 'Settings') {
      const gardenSpecificPath = `settings/${hookSubPath}`;
      const gardenGit = new Git(currentGarden);
      try {
        await gardenGit.pfs.stat(`/${gardenSpecificPath}`);
        // If stat doesn't throw, the file exists
        return `${currentGarden}#${gardenSpecificPath}`;
      } catch (e) {
        // File does not exist, continue to next level
      }
    }

    // 2. Check Global Settings/hooks/ folder
    const globalPath = hookSubPath;
    const settingsGit = new Git('Settings');
    try {
      await settingsGit.pfs.stat(`/${globalPath}`);
      return `Settings#${globalPath}`;
    } catch (e) {
      // File does not exist, no hook to run
    }

    return null;
  }
}