// This script splits the currently active pane vertically.

const workspace = window.thoughtform.workspace;
if (workspace && workspace.activePaneId) {
  workspace.splitPane(workspace.activePaneId, 'vertical');
}