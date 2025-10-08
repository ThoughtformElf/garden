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

  // --- THIS IS THE FIX (Part 1) ---
  // Use the new `listAllPaths` function.
  const allPaths = await appContext.sidebar.listAllPaths(appContext.gitClient, '/');
  
  // Normalize the target path for comparison
  const normalizedTargetPath = targetPath.toLowerCase()

  // --- THIS IS THE FIX (Part 2) ---
  // The new function returns objects `{path, isDirectory}`, so we must
  // destructure the path and ignore directories.
  for (const { path, isDirectory } of allPaths) {
    if (isDirectory) continue; // Skip folders

    const filePath = path;
    // Normalize the file from the list for comparison
    const normalizedFilePath = (filePath.startsWith('/') ? filePath.substring(1) : filePath).toLowerCase();
    if (normalizedFilePath === normalizedTargetPath) {
      return filePath; // Return the original, correctly cased path
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

  let path = linkContent.split('|')[0].trim(); // Use text before alias pipe
  let garden = null;

  if (path.includes('#')) {
    [garden, path] = path.split('#');
  }

  if (garden) {
    // Cross-garden navigation is simpler for now, we don't do a case-insensitive search.
    // Ensure the final file path segment starts with a slash
    if (!path.startsWith('/')) {
        path = `/${path}`;
    }
    const fullPathUrl = new URL(import.meta.url).pathname;
    const srcIndex = fullPathUrl.lastIndexOf('/src/');
    const basePath = srcIndex > -1 ? fullPathUrl.substring(0, srcIndex) : '';
    window.location.href = `${window.location.origin}${basePath}/${encodeURIComponent(garden)}#${encodeURIComponent(path)}`;
  } else {
    // Local navigation with case-insensitive search
    const foundPath = await findFileCaseInsensitive(path, appContext);
    let finalPath;

    if (foundPath) {
      // We found an existing file, use its exact path
      finalPath = foundPath;
    } else {
      // No file found, create a canonical path for a new file
      finalPath = path.startsWith('/') ? path : `/${path}`;
    }
    window.location.hash = `#${encodeURIComponent(finalPath)}`;
  }
}

/**
 * A CodeMirror keymap extension for navigating any type of link.
 */
export const linkNavigationKeymap = keymap.of([
  {
    key: 'Mod-Enter',
    run: (view) => {
      const appContext = view.state.field(appContextField);
      if (!appContext.gitClient) return false;

      const pos = view.state.selection.main.head;
      const line = view.state.doc.lineAt(pos);
      
      const linkRegexes = [
        { type: 'wikilink', regex: /\[\[([^\[\]]+?)\]\]/g },
        { type: 'markdown', regex: /\[[^\]]*\]\(([^)]+)\)/g },
        { type: 'naked', regex: /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g },
      ];

      for (const { type, regex } of linkRegexes) {
        let match;
        while ((match = regex.exec(line.text))) {
          const start = line.from + match.index;
          const end = start + match[0].length;

          if (pos >= start && pos <= end) {
            if (type === 'wikilink') {
              navigateTo(match[1], appContext);
            } else {
              let url = type === 'markdown' ? match[1] : match[0];
              if (url.startsWith('www.')) url = `https://${url}`;
              window.open(url, '_blank', 'noopener,noreferrer');
            }
            return true; // Event handled
          }
        }
      }
      return false; // Event not handled
    },
  },
]);