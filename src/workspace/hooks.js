import { executeFile } from './executor.js';

const eventToHookFileMap = {
  'app:load': 'load.js',
  'file:create': 'create.js',
  'file:delete': 'delete.js',
};

export class HookRunner {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.config = window.thoughtform.config;
  }

  initialize() {
    for (const eventName in eventToHookFileMap) {
      this.eventBus.subscribe(eventName, (eventData) => {
        this.handleEvent(eventName, eventData);
      });
    }
  }

  async handleEvent(eventName, eventData) {
    const hookFileName = eventToHookFileMap[eventName];
    if (!hookFileName) return;

    const editor = window.thoughtform.workspace.getActiveEditor();
    const git = window.thoughtform.workspace.getActiveGitClient();

    if (!editor || !git) return;

    // Ask the ConfigService for the correct hook script path
    const hookPath = await this.config.getHook(hookFileName);
    
    if (hookPath) {
      executeFile(hookPath, editor, git, eventData);
    }
  }
}