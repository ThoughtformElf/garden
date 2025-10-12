// src/workspace.js

/**
 * Manages the state of the entire application's UI, including panes,
 * workspaces, and active contexts. In Phase 0, it manages a single pane.
 */
export class WorkspaceManager {
  constructor() {
    this.editor = null; // This will hold the single, global editor instance for now.
    // In the future, this will be a map of pane IDs to editor instances.
  }

  /**
   * Registers the main editor instance during application startup.
   * @param {Editor} editorInstance - The main editor instance.
   */
  registerEditor(editorInstance) {
    this.editor = editorInstance;
  }

  /**
   * Returns the currently active editor instance.
   * In Phase 0, this is always the single main editor.
   * @returns {Editor|null}
   */
  getActiveEditor() {
    return this.editor;
  }

  /**
   * Returns the gitClient associated with the currently active editor/pane.
   * @returns {Git|null}
   */
  getActiveGitClient() {
    return this.editor ? this.editor.gitClient : null;
  }
}

export function initializeWorkspaceManager() {
  return new WorkspaceManager();
}