import { Git } from '../util/git-integration.js';

/**
 * Reads a script file, with built-in fallback to the 'Settings' garden.
 * @param {string} gardenName - The primary garden to check.
 * @param {string} filePath - The path to the script within the garden (e.g., 'settings/keymaps/script.js').
 * @returns {Promise<string>} The content of the script file.
 * @throws {Error} if the script is not found in either the primary garden or the Settings fallback.
 */
async function readScriptWithFallback(gardenName, filePath) {
    const primaryGit = new Git(gardenName);
    try {
        return await primaryGit.readFile(filePath);
    } catch (e) {
        // If the file is not found in the primary garden, and it's not the Settings garden itself,
        // try fetching from the Settings garden as a fallback.
        if (e.message.includes('does not exist') && gardenName !== 'Settings') {
            console.log(`[Executor] Script not found in "${gardenName}", falling back to "Settings" for ${filePath}`);
            const fallbackGit = new Git('Settings');
            try {
                return await fallbackGit.readFile(filePath);
            } catch (fallbackError) {
                throw new Error(`Script "${filePath}" not found in either "${gardenName}" or the "Settings" garden.`);
            }
        }
        // If the error was something else, or if we were already in the Settings garden, re-throw.
        throw e;
    }
}

/**
 * The Universal Executor for Thoughtform.Garden.
 * Takes a file path, reads it (with fallback), and executes it within a scoped context.
 *
 * @param {string} path - The path to the script to execute (e.g., 'MyGarden#settings/keymaps/script.js').
 * @param {object} editor - The editor instance context for this execution.
 * @param {object} git - The git client context for this execution.
 * @param {object|null} event - Optional event data from a hook.
 */
export async function executeFile(path, editor, git, event = null) {
  try {
    let [gardenName, filePath] = path.split('#');

    if (!filePath.startsWith('/')) {
      filePath = `/${filePath}`;
    }

    const fileContent = await readScriptWithFallback(gardenName, filePath);

    const sandboxedScript = `(function(editor, git, event) {
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
    await executable(editor, git, event);

  } catch (error) {
    console.error(`[Executor] Failed to load and execute script for path "${path}":`, error);
    window.thoughtform.ui.toggleDevtools?.(true, 'console');
  }
}