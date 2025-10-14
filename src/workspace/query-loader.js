import { executeFile } from './executor.js';

/**
 * Parses URL query parameters and executes corresponding scripts.
 * Looks for parameters without a value (e.g., ?test) and runs them as commands.
 */
export async function initializeQueryLoader() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.size === 0) return;

  const params = Object.fromEntries(urlParams.entries());

  const editor = window.thoughtform.workspace.getActiveEditor();
  const git = await window.thoughtform.workspace.getActiveGitClient();

  if (!editor || !git) {
    console.error('[QueryLoader] Could not get active editor or git client. Aborting script execution.');
    return;
  }

  const currentGardenName = git.gardenName;

  for (const key in params) {
    // We only execute scripts for parameters that are present without a value,
    // like '?test' instead of '?file=home'.
    if (params[key] === '') {
      const scriptPath = `/settings/query/${key}.js`;
      const fullPath = `${currentGardenName}#${scriptPath}`;
      
      // The executor already handles the fallback to the global 'Settings' garden.
      // We pass the full params object to every executed script.
      await executeFile(fullPath, editor, git, null, params);
    }
  }
}