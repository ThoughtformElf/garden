// src/editor/plugins/wikilinks.js
import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const wikilinkDecoration = Decoration.mark({ class: 'cm-wikilink' });

/**
 * Parses a wikilink's inner content and navigates the browser.
 * Handles both local [[page]] and cross-garden [[garden#page]] links.
 * @param {string} linkContent - The text inside the [[...]] brackets.
 */
export function navigateToLink(linkContent) {
  if (!linkContent) return;

  let path = linkContent.split('|')[0].trim(); // Use text before alias pipe
  let garden = null;

  if (path.includes('#')) {
    [garden, path] = path.split('#');
  }

  // A simple rule: if no extension, assume it's a Markdown file.
  if (!/\.[^/.]+$/.test(path)) {
    path = `${path}.md`;
  }
  
  // Ensure the final file path segment starts with a slash
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  if (garden) {
    // Cross-garden navigation (full page reload)
    // This logic is borrowed from index.js to correctly determine the base path
    const fullPath = new URL(import.meta.url).pathname;
    const srcIndex = fullPath.lastIndexOf('/src/');
    const basePath = srcIndex > -1 ? fullPath.substring(0, srcIndex) : '';
    
    // Note: We encode the garden and hash path separately for correctness
    window.location.href = `${window.location.origin}${basePath}/${encodeURIComponent(garden)}#${encodeURIComponent(path)}`;
  } else {
    // Local navigation (hash change)
    window.location.hash = `#${encodeURIComponent(path)}`;
  }
}

class WikilinkPlugin {
  constructor(view) {
    this.view = view;
    this.decorations = this.findWikilinks(view);
    this.longPressTimeout = null;

    // Bind event handlers to this instance
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);

    // Add event listeners to the editor's DOM element
    this.view.dom.addEventListener('mousedown', this.onMouseDown);
    this.view.dom.addEventListener('mouseup', this.onMouseUp);
    this.view.dom.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.view.dom.addEventListener('touchend', this.onTouchEnd);
    this.view.dom.addEventListener('touchmove', this.onTouchMove);
  }

  destroy() {
    // Clean up event listeners
    this.clearLongPressTimeout();
    this.view.dom.removeEventListener('mousedown', this.onMouseDown);
    this.view.dom.removeEventListener('mouseup', this.onMouseUp);
    this.view.dom.removeEventListener('touchstart', this.onTouchStart);
    this.view.dom.removeEventListener('touchend', this.onTouchEnd);
    this.view.dom.removeEventListener('touchmove', this.onTouchMove);
  }

  onMouseDown(event) {
    const linkEl = event.target.closest('.cm-wikilink');
    if (linkEl && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      navigateToLink(linkEl.textContent.slice(2, -2));
    }
  }

  onMouseUp() {
    this.clearLongPressTimeout();
  }

  onTouchStart(event) {
    const linkEl = event.target.closest('.cm-wikilink');
    if (linkEl) {
      // Prevent default to stop text selection or other touch actions
      event.preventDefault();
      this.longPressTimeout = setTimeout(() => {
        navigateToLink(linkEl.textContent.slice(2, -2));
        this.longPressTimeout = null;
      }, 500); // 500ms for a long press
    }
  }

  onTouchEnd() {
    this.clearLongPressTimeout();
  }
  
  onTouchMove() {
      this.clearLongPressTimeout();
  }

  clearLongPressTimeout() {
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
  }

  update(update) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.findWikilinks(update.view);
    }
  }

  findWikilinks(view) {
    const builder = new RangeSetBuilder();
    const wikilinkRegex = /\[\[([^\[\]]+?)\]\]/g;
    for (const { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to);
      let match;
      while ((match = wikilinkRegex.exec(text))) {
        const start = from + match.index;
        const end = start + match[0].length;
        builder.add(start, end, wikilinkDecoration);
      }
    }
    return builder.finish();
  }
}

export const wikilinkPlugin = ViewPlugin.fromClass(
  WikilinkPlugin,
  { decorations: v => v.decorations }
);