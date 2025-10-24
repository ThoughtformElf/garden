// This script is the action for the "Alt-Enter" keyboard shortcut.
// If the cursor is on a wikilink, it opens that link in a new floating window.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance, passed by the executor.
// 'git': The git client for the current garden, passed by the executor.
// 'event': Null for keymap-triggered events.

const view = editor.editorView;
if (!view) {
  console.error('[open-in-window] Editor view not found.');
  return false;
}

const pos = view.state.selection.main.head;
const line = view.state.doc.lineAt(pos);
const wikilinkRegex = /\[\[([^\[\]]+?)\]\]/g;
let match;
wikilinkRegex.lastIndex = 0;

while ((match = wikilinkRegex.exec(line.text))) {
  const start = line.from + match.index;
  const end = start + match[0].length;

  if (pos >= start && pos <= end) {
    const linkContent = match[1];
    
    const getLinkURL = (content) => {
        let path = content.split('|')[0].trim();
        let garden = git.gardenName;
        if (path.includes('#')) [garden, path] = path.split('#');
        return `/${encodeURIComponent(garden)}#${encodeURI(path)}?windowed=true`;
    };

    const url = getLinkURL(linkContent);
    const isNested = window.self !== window.top;

    // THIS IS THE FIX: Use viewport center for keyboard actions.
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;

    if (isNested) {
        window.top.postMessage({
            type: 'request-preview-window',
            payload: { url, clientX: x, clientY: y }
        }, '*');
    } else {
        if (typeof window.thoughtform.ui.openWindow === 'function') {
            window.thoughtform.ui.openWindow(url, x, y);
        } else {
            console.error("[open-in-window] Windowing function not available.");
        }
    }
    
    return true;
  }
}

return false;