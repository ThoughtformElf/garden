import { Git } from '../util/git-integration.js';

/**
 * Reads a script file, with built-in fallback to the 'Settings' garden.
 * @param {string} gardenName - The primary garden to check.
 * @param {string} filePath - The path to the script within the garden (e.g., 'settings/keymaps/script.js').
 * @returns {Promise<string|null>} The content of the script file, or null if not found in any garden.
 * @throws {Error} for file system errors other than 'not found'.
 */
async function readScriptWithFallback(gardenName, filePath) {
    const primaryGit = new Git(gardenName);
    try {
        return await primaryGit.readFile(filePath);
    } catch (e) {
        // If the file is not found in the primary garden, and it's not the Settings garden itself,
        // try fetching from the Settings garden as a fallback.
        if (e.message.includes('does not exist') && gardenName !== 'Settings') {
            const fallbackGit = new Git('Settings');
            try {
                return await fallbackGit.readFile(filePath);
            } catch (fallbackError) {
                // If it's not found in the fallback either, that's okay. Return null.
                if (fallbackError.message.includes('does not exist')) {
                    return null;
                }
                // For other errors (e.g., permissions), re-throw.
                throw fallbackError;
            }
        }
        // If the initial error was 'not found' but we were already in the Settings garden, return null.
        if (e.message.includes('does not exist')) {
            return null;
        }
        // If the error was something else, re-throw.
        throw e;
    }
}

/**
 * The Universal Executor for Thoughtform.Garden.
 * Takes a file path, reads it (with fallback), and executes it within a scoped context.
 * Silently fails if the script does not exist.
 *
 * @param {string} path - The path to the script to execute (e.g., 'MyGarden#settings/keymaps/script.js').
 * @param {object} editor - The editor instance context for this execution.
 * @param {object} git - The git client context for this execution.
 * @param {object|null} event - Optional event data from a hook.
 * @param {object|null} params - Optional query params from the URL.
 */
export async function executeFile(path, editor, git, event = null, params = null) {
  try {
    let [gardenName, filePath] = path.split('#');

    if (!filePath.startsWith('/')) {
      filePath = `/${filePath}`;
    }

    const fileContent = await readScriptWithFallback(gardenName, filePath);
    
    // If the script wasn't found in either garden, just exit silently.
    if (fileContent === null) {
        console.warn(`[Executor] Could not find script to execute for path: "${path}"`);
        return;
    }

    const sandboxedScript = `(function(editor, git, event, params) {
      try {
        ${fileContent}
      } catch (e) {
        console.error(
          'EXECUTION FAILED in script: "${path}"\\n' +
          '--------------------------------------------------\\n' +
          'This error was caught and did not crash the application. Please check the script for errors.\\n\\n',
          e
        );
      }
    })(...arguments);`;

    const executable = new Function(sandboxedScript);

    // The script is always executed with the context of the pane that triggered it.
    await executable(editor, git, event, params);

  } catch (error) {
    // This will now only catch unexpected errors, not 'file not found' errors.
    console.error(`[Executor] Failed to process script for path "${path}":`, error);
    window.thoughtform.ui.toggleDevtools?.(true, 'console');
  }
}