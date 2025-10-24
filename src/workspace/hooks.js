import { executeFile } from './executor.js';

const eventToHookFileMap = {
  'app:load': 'load.js',
  'file:create': 'create.js',
  'file:delete': 'delete.js',
  'window:create': 'on-create-window.js',
  'window:close': 'on-close-window.js',
  'window:resize': 'on-resize-window.js',
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

    // For window events, the garden context is always the active main window's garden.
    // For file events, it comes from the event payload.
    const contextGarden = eventData?.gardenName || window.thoughtform.workspace.getActiveEditor()?.gitClient.gardenName;
    if (!contextGarden) {
      console.warn(`[HookRunner] Could not determine garden context for event: ${eventName}`);
      return;
    }

    const editor = window.thoughtform.workspace.getActiveEditor();
    const git = window.thoughtform.workspace.getActiveGitClient();
    if (!editor || !git) return;

    const hookPath = await this.config.getHook(hookFileName, contextGarden);
    
    if (hookPath) {
      executeFile(hookPath, editor, git, eventData);
    }
  }
}