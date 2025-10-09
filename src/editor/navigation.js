// src/editor/navigation.js
import { StateField } from '@codemirror/state';

/**
 * A StateField to hold application context (gitClient, sidebar, editor)
 * so that editor plugins and keymaps can access it.
 */
export const appContextField = StateField.define({
  create: () => ({ gitClient: null, sidebar: null, editor: null }),
  update: (value, tr) => value,
});

/**
 * Finds a file in the garden, ignoring case
 * @param {string} targetPath - The page name from the wikilink (e.g., "chores").
 * @param {object} appContext - Contains gitClient and sidebar instances.
 * @returns {string|null} The correctly cased, full file path if found, otherwise null.
 */
export async function findFileCaseInsensitive(targetPath, appContext) {
  if (!appContext.sidebar || !appContext.gitClient) return null;

  const allPaths = await appContext.sidebar.listAllPaths(appContext.gitClient, '/');
  
  const normalizedTargetPath = targetPath.toLowerCase()

  for (const { path, isDirectory } of allPaths) {
    if (isDirectory) continue;

    const filePath = path;
    const normalizedFilePath = (filePath.startsWith('/') ? filePath.substring(1) : filePath).toLowerCase();
    if (normalizedFilePath === normalizedTargetPath) {
      return filePath;
    }
  }

  return null;
}