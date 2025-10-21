import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const nakedLinkDecoration = Decoration.mark({ class: 'cm-naked-link' });

function sanitizeUrl(url) {
  if (!url) return null;
  if (url.startsWith('www.')) {
    return `https://` + url;
  }
  return url;
}

class ExternalLinkPlugin {
  constructor(view) {
    this.view = view;
    this.decorations = this.findNakedLinks(view);
    this.longPressTimeout = null;

    // Bind event handlers
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);

    // Add event listeners
    this.view.dom.addEventListener('mousedown', this.onMouseDown);
    this.view.dom.addEventListener('mouseup', this.onMouseUp);
    this.view.dom.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.view.dom.addEventListener('touchend', this.onTouchEnd);
    this.view.dom.addEventListener('touchmove', this.onTouchMove, { passive: true });
  }

  destroy() {
    this.clearLongPressTimeout();
    this.view.dom.removeEventListener('mousedown', this.onMouseDown);
    this.view.dom.removeEventListener('mouseup', this.onMouseUp);
    this.view.dom.removeEventListener('touchstart', this.onTouchStart);
    this.view.dom.removeEventListener('touchend', this.onTouchEnd);
    this.view.dom.removeEventListener('touchmove', this.onTouchMove);
  }

  handleNavigation(event) {
    // Check for naked links or standard Markdown URLs
    const linkEl = event.target.closest('.cm-naked-link, .cm-url');
    if (!linkEl) return false;
    
    let url = sanitizeUrl(linkEl.textContent);
    if (url) {
      // --- THIS IS THE FIX ---
      // This regex removes one or more common punctuation characters
      // (.,;)) from the very end of the URL string.
      url = url.replace(/[.,;)]+$/, '');
      // --- END OF FIX ---
      
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    return true;
  }

  onMouseDown(event) {
    if (event.ctrlKey || event.metaKey) {
      if (this.handleNavigation(event)) {
        event.preventDefault();
      }
    }
  }

  onMouseUp() {
    this.clearLongPressTimeout();
  }

  onTouchStart(event) {
    const linkEl = event.target.closest('.cm-naked-link, .cm-url');
    if (linkEl) {
      event.preventDefault();
      this.longPressTimeout = setTimeout(() => {
        this.handleNavigation(event);
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
      this.decorations = this.findNakedLinks(update.view);
    }
  }

  // This plugin only decorates naked links. Markdown links are already
  // decorated by the core markdown language extension.
  findNakedLinks(view) {
    const builder = new RangeSetBuilder();
    const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
    for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        let match;
        while ((match = linkRegex.exec(text))) {
            const line = view.state.doc.lineAt(from + match.index);
            // Avoid decorating URLs that are already part of a markdown link
            if (/\[.*\]\(.*\)/.test(line.text)) {
                if (line.text.includes(`](${match[0]})`)) continue;
            }
            const start = from + match.index;
            const end = start + match[0].length;
            builder.add(start, end, nakedLinkDecoration);
        }
    }
    return builder.finish();
  }
}

export const externalLinkPlugin = ViewPlugin.fromClass(
  ExternalLinkPlugin,
  { decorations: v => v.decorations }
);