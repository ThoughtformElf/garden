// This script is the action for the "Mod-Shift-Enter" keyboard shortcut.
// It is context-aware:
// 1. If on a wikilink, it opens that link in a new, dynamically-split pane.
// 2. If NOT on a wikilink, it creates a new scratchpad, inserts a link to it, and navigates there.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance, passed by the executor.
// 'git': The git client for the current garden, passed by the executor.
// 'event': Null for keymap-triggered events.

/**
 * Generates a unique path for a new scratchpad breadcrumb file.
 * This function is self-contained to avoid module import issues in the executor.
 * @param {Git} gitClient - The git client instance for the garden.
 * @returns {Promise<string>} A promise that resolves to the unique scratchpad file path.
 */
async function generateScratchpadBreadcrumbPath(gitClient) {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const baseName = `${year}${month}${day}-${hours}${minutes}`;
  const baseDir = '/scratchpad';

  await gitClient.ensureDir(baseDir);

  let finalPath = `${baseDir}/${baseName}`;
  let counter = 0;

  while (true) {
    try {
      await gitClient.pfs.stat(finalPath);
      counter++;
      finalPath = `${baseDir}/${baseName}-${counter}`;
    } catch (e) {
      if (e.code === 'ENOENT') break;
      throw e;
    }
  }
  return finalPath;
}


const view = editor.editorView;
if (!view) {
  console.error('[navigate-in-new-pane] Editor view not found.');
  return;
}

const pos = view.state.selection.main.head;
const line = view.state.doc.lineAt(pos);

// --- Case 1: Cursor is on a wikilink ---
const wikilinkRegex = /\[\[([^\[\]]+?)\]\]/g;
let match;
wikilinkRegex.lastIndex = 0; // Reset regex state for each use
while ((match = wikilinkRegex.exec(line.text))) {
  const start = line.from + match.index;
  const end = start + match[0].length;

  // Check if the cursor is inside the bounds of this link match.
  if (pos >= start && pos <= end) {
    const linkContent = match[1];
    window.thoughtform.workspace.openInNewPane(linkContent, editor.paneId);
    return; // We found our link and handled it, so we can stop.
  }
}

// --- Case 2: Cursor is NOT on a wikilink (Fallback) ---
// This part of the script only runs if the loop above did not find a link and return.

(async () => {
  try {
    // The git client is passed into this script's scope by the executor
    const newPath = await generateScratchpadBreadcrumbPath(git);
    if (!newPath) return;

    // Create the wikilink text, e.g., "[[scratchpad/102525-2205]]"
    const linkText = `[[${newPath.substring(1)}]]`;

    // 1. Insert the wikilink text at the current cursor position
    view.dispatch({
      changes: { from: pos, insert: linkText }
    });

    // 2. THIS IS THE FIX: Manually trigger the save and wait for it to complete.
    //    We pass the editor's new state to the handler to ensure it saves the latest content.
    await editor.handleUpdate(view.state.doc.toString());
    
    // 3. Now that we know the file is saved, we can safely navigate.
    window.thoughtform.workspace.openFile(git.gardenName, newPath);
    
  } catch (error) {
    console.error('[navigate-in-new-pane] Failed to create scratchpad breadcrumb:', error);
  }
})();