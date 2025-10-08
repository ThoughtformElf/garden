// src/editor/navigation.js
import { StateField } from '@codemirror/state';
import { keymap } from '@codemirror/view';

/**
 * A StateField to hold application context (gitClient, sidebar)
 * so that editor plugins and keymaps can access it.
 */
export const appContextField = StateField.define({
  create: () => ({ gitClient: null, sidebar: null }),
  update: (value, tr) => value, // This context doesn't change with transactions
});

/**
 * Finds a file in the garden, ignoring case
 * @param {string} targetPath - The page name from the wikilink (e.g., "chores").
 * @param {object} appContext - Contains gitClient and sidebar instances.
 * @returns {string|null} The correctly cased, full file path if found, otherwise null.
 */
async function findFileCaseInsensitive(targetPath, appContext) {
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

/**
 * Core navigation function for wikilinks.
 * Handles parsing, case-insensitive lookup, and browser navigation.
 * @param {string} linkContent - The text inside the [[...]] brackets.
 * @param {object} appContext - An object containing the gitClient and sidebar.
 */
export async function navigateTo(linkContent, appContext) {
  if (!linkContent) return;

  let path = linkContent.split('|')[0].trim();
  let garden = null;

  if (path.includes('#')) {
    [garden, path] = path.split('#');
  }

  if (garden) {
    if (!path.startsWith('/')) {
        path = `/${path}`;
    }
    const fullPathUrl = new URL(import.meta.url).pathname;
    const srcIndex = fullPathUrl.lastIndexOf('/src/');
    const basePath = srcIndex > -1 ? fullPathUrl.substring(0, srcIndex) : '';
    window.location.href = `${window.location.origin}${basePath}/${encodeURIComponent(garden)}#${encodeURIComponent(path)}`;
  } else {
    const foundPath = await findFileCaseInsensitive(path, appContext);
    let finalPath;

    if (foundPath) {
      finalPath = foundPath;
    } else {
      finalPath = path.startsWith('/') ? path : `/${path}`;
    }
    window.location.hash = `#${encodeURIComponent(finalPath)}`;
  }
}