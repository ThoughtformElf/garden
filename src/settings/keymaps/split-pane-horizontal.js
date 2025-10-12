// This script splits the currently active pane horizontally.

const workspace = window.thoughtform.workspace;
if (workspace && workspace.activePaneId) {
  workspace.splitPane(workspace.activePaneId, 'horizontal');
}