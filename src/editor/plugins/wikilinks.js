// src/editor/plugins/wikilinks.js
import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { appContextField } from '../navigation.js';

const wikilinkDecoration = Decoration.mark({ class: 'cm-wikilink' });

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
    this.view.dom.addEventListener('touchmove', this.onTouchMove, { passive: true });
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
  
  handleNavigation(linkEl) {
    const appContext = this.view.state.field(appContextField);
    if (appContext.editor) {
      appContext.editor.navigateTo(linkEl.textContent.slice(2, -2));
    }
  }

  onMouseDown(event) {
    const linkEl = event.target.closest('.cm-wikilink');
    if (linkEl && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.handleNavigation(linkEl);
    }
  }

  onMouseUp() {
    this.clearLongPressTimeout();
  }

  onTouchStart(event) {
    const linkEl = event.target.closest('.cm-wikilink');
    if (linkEl) {
      event.preventDefault();
      this.longPressTimeout = setTimeout(() => {
        this.handleNavigation(linkEl);
        this.longPressTimeout = null;
      }, 500);
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