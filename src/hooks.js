// src/hooks.js
import { executeFile } from './executor.js';

const eventToHookFileMap = {
  'app:load': 'load.js',
  'file:create': 'create.js',
};

export class HookRunner {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.git = window.thoughtform.editor.gitClient;
    this.config = window.thoughtform.config;
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

    // Ask the ConfigService for the correct hook script path
    const hookPath = await this.config.getHook(hookFileName);
    
    if (hookPath) {
      console.log(`[HookRunner] Found hook for "${eventName}". Executing: ${hookPath}`);
      executeFile(hookPath, window.thoughtform.editor, this.git, eventData);
    }
  }
}