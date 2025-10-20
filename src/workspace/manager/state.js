export class WorkspaceStateManager {
  constructor(workspace) {
    this.workspace = workspace;
  }

  loadState() {
    try {
      const saved = sessionStorage.getItem('thoughtform_workspace_layout');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load or parse workspace state from sessionStorage:", e);
      sessionStorage.removeItem('thoughtform_workspace_layout');
    }
    return null;
  }

  saveState() {
    if (!this.workspace.paneTree) return;

    const editorStates = {};
    this.workspace.panes.forEach((pane, paneId) => {
      if (pane.editor) {
        editorStates[paneId] = pane.editor.getCurrentState();
      }
    });
    
    const stateToSave = {
      paneTree: this.workspace.paneTree,
      activePaneId: this.workspace.activePaneId,
      editorStates: editorStates,
      isMaximized: this.workspace._paneManager.isMaximized,
    };

    try {
      sessionStorage.setItem('thoughtform_workspace_layout', JSON.stringify(stateToSave));
    } catch (e) {
      console.error("Failed to save workspace state to sessionStorage:", e);
    }
  }
}