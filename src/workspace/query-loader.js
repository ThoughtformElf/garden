import { executeFile } from './executor.js';

/**
 * Reads sticky session parameters and executes any corresponding autoloader scripts.
 */
export async function initializeQueryLoader() {
  // Get the session params from the now-centralized UrlManager.
  const sessionParamsRaw = sessionStorage.getItem('thoughtform_session_params');
  if (!sessionParamsRaw) return;

  const params = Object.fromEntries(new URLSearchParams(sessionParamsRaw).entries());
  if (Object.keys(params).length === 0) return;

  const editor = window.thoughtform.workspace.getActiveEditor();
  const git = await window.thoughtform.workspace.getActiveGitClient();

  if (!editor || !git) {
    console.warn('[QueryLoader] Could not get active editor or git client for script execution.');
    return;
  }

  const currentGardenName = git.gardenName;

  for (const key in params) {
    const scriptPath = `/settings/query/${key}.js`;
    const fullPath = `${currentGardenName}#${scriptPath}`;
    await executeFile(fullPath, editor, git, null, params);
  }
}