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

    // The context for finding the hook comes from the event payload itself.
    const contextGarden = eventData?.gardenName || window.thoughtform.workspace.getActiveEditor()?.gitClient.gardenName;
    if (!contextGarden) {
      console.warn(`[HookRunner] Could not determine garden context for event: ${eventName}`);
      return;
    }

    // The context for executing the hook is the active editor.
    const editor = window.thoughtform.workspace.getActiveEditor();
    const git = window.thoughtform.workspace.getActiveGitClient();
    if (!editor || !git) return;

    // Ask the ConfigService for the correct hook script path using the event's garden context.
    const hookPath = await this.config.getHook(hookFileName, contextGarden);
    
    if (hookPath) {
      // Execute the found hook with the active editor's context.
      executeFile(hookPath, editor, git, eventData);
    }
  }
}