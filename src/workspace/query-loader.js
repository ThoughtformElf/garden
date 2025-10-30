import { executeFile } from './executor.js';

/**
 * Reads sticky session parameters and executes any corresponding autoloader scripts.
 */
export async function initializeQueryLoader() {
  // Get the session params from the now-centralized UrlManager.
  const sessionParamsRaw = sessionStorage.getItem('thoughtform_session_params');
  if (!sessionParamsRaw) return;

  const params = JSON.parse(sessionParamsRaw);
  if (Object.keys(params).length === 0) return;

  const editor = window.thoughtform.workspace.getActiveEditor();
  const git = await window.thoughtform.workspace.getActiveGitClient();

  if (!editor || !git) {
    console.warn('[QueryLoader] Could not get active editor or git client for script execution.');
    return;
  }

  for (const key in params) {
    // THIS IS THE FIX: Use the centralized, cascading getExecutable function.
    const scriptFullPath = await window.thoughtform.config.getExecutable('query', `${key}.js`, git);
    
    if (scriptFullPath) {
      await executeFile(scriptFullPath, editor, git, null, params);
    } else {
      console.warn(`[QueryLoader] No script found for query parameter: "${key}"`);
    }
  }
}