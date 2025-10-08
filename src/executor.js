// src/executor.js
import { Git } from './util/git-integration.js';

/**
 * The Universal Executor for Thoughtform.Garden.
 * Takes a file path, reads it, and executes it within a scoped, sandboxed context.
 *
 * @param {string} path - The path to the script to execute (e.g., 'Settings#keymaps/prompt.js').
 * @param {object} editor - The global editor instance.
 * @param {object} git - The git client for the CURRENTLY active garden.
 * @param {object|null} event - Optional event data from a hook.
 */
export async function executeFile(path, editor, git, event = null) {
  try {
    let gardenName = git.gardenName;
    let filePath = path;

    // Handle cross-garden paths like "Settings#/scripts/..."
    if (path.includes('#')) {
      [gardenName, filePath] = path.split('#');
    }

    if (!filePath.startsWith('/')) {
      filePath = `/${filePath}`;
    }

    const gitClientToUse = (gardenName !== git.gardenName) ? new Git(gardenName) : git;

    console.log(`[Executor] Running file: ${filePath} from garden: ${gardenName}`);
    const fileContent = await gitClientToUse.readFile(filePath);

    // This is the sandboxing. We wrap the user's raw script text in an IIFE.
    const sandboxedScript = `(function(editor, git, event) {
      try {
        ${fileContent}
      } catch (e) {
        console.error('[Executor] Error executing script "${path}":', e);
        // We could add a UI notification here in the future.
      }
    })(...arguments);`;

    const executable = new Function(sandboxedScript);

    // Execute the function with the provided context.
    await executable(editor, gitClientToUse, event);

  } catch (error) {
    console.error(`[Executor] Failed to load or execute ${path}:`, error);
    window.thoughtform.ui.toggleDevtools?.(true, 'console');
  }
}