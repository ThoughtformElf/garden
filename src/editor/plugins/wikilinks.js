import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { appContextField } from '../navigation.js';

// --- State for managing previews ---
const previewState = {
  activeIframe: null,
  hideTimeout: null,
  dragState: null,
};

// --- Helper Functions ---
function getLinkURL(linkContent, appContext) {
  let path = linkContent.split('|')[0].trim();
  let garden = appContext.gitClient.gardenName;

  if (path.includes('#')) {
    [garden, path] = path.split('#');
  }

  const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
  return `${window.location.origin}${basePath}/${encodeURIComponent(garden)}#${encodeURI(path)}?preview=true`;
}

function hidePreview(iframe) {
  if (iframe) {
    iframe.classList.remove('visible');
    setTimeout(() => iframe.remove(), 200);
  }
  if (previewState.activeIframe === iframe) {
    previewState.activeIframe = null;
  }
}

// --- Communication with iframes ---
window.addEventListener('message', (event) => {
  if (!event.source.frameElement || !event.source.frameElement.classList.contains('preview-iframe')) {
    return;
  }

  const iframe = event.source.frameElement;
  const { type, payload } = event.data;

  switch (type) {
    case 'preview-interacted':
      iframe.dataset.interacted = 'true';
      break;
    case 'preview-close':
      hidePreview(iframe);
      break;
    case 'preview-drag-start':
      startDrag(iframe, payload.x, payload.y);
      break;
    case 'preview-maximize':
      iframe.style.top = '1rem';
      iframe.style.left = '1rem';
      iframe.style.width = 'calc(100vw - 2rem)';
      iframe.style.height = 'calc(100vh - 2rem)';
      iframe.dataset.interacted = 'true';
      break;
  }
});


// --- Drag and Resize Logic ---
function startDrag(iframe, initialMouseX, initialMouseY) {
  iframe.dataset.interacted = 'true';
  const rect = iframe.getBoundingClientRect();
  previewState.dragState = {
    iframe,
    offsetX: initialMouseX - rect.left,
    offsetY: initialMouseY - rect.top,
  };

  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd, { once: true });
}

function onDragMove(e) {
  if (!previewState.dragState) return;
  e.preventDefault();
  const { iframe, offsetX, offsetY } = previewState.dragState;
  iframe.style.left = `${e.clientX - offsetX}px`;
  iframe.style.top = `${e.clientY - offsetY}px`;
}

function onDragEnd() {
  previewState.dragState = null;
  document.removeEventListener('mousemove', onDragMove);
}


// --- Main Plugin Class ---
const wikilinkDecoration = Decoration.mark({ class: 'cm-wikilink' });

class WikilinkPlugin {
  constructor(view) {
    this.view = view;
    this.decorations = this.findWikilinks(view);
    this.longPressTimeout = null;

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onMouseOver = this.onMouseOver.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);

    this.view.dom.addEventListener('mousedown', this.onMouseDown);
    this.view.dom.addEventListener('mouseup', this.onMouseUp);
    this.view.dom.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.view.dom.addEventListener('touchend', this.onTouchEnd);
    this.view.dom.addEventListener('touchmove', this.onTouchMove, { passive: true });
    this.view.dom.addEventListener('mouseover', this.onMouseOver);
    this.view.dom.addEventListener('mouseout', this.onMouseOut);
  }

  destroy() {
    this.clearLongPressTimeout();
    this.view.dom.removeEventListener('mousedown', this.onMouseDown);
    this.view.dom.removeEventListener('mouseup', this.onMouseUp);
    this.view.dom.removeEventListener('touchstart', this.onTouchStart);
    this.view.dom.removeEventListener('touchend', this.onTouchEnd);
    this.view.dom.removeEventListener('touchmove', this.onTouchMove);
    this.view.dom.removeEventListener('mouseover', this.onMouseOver);
    this.view.dom.removeEventListener('mouseout', this.onMouseOut);
  }
  
  onMouseOver(event) {
    if (!event.altKey) return;
    const linkEl = event.target.closest('.cm-wikilink');
    if (!linkEl) return;

    clearTimeout(previewState.hideTimeout);

    if (previewState.activeIframe && previewState.activeIframe.dataset.link === linkEl.textContent) {
      return; // Already showing this preview
    }
    
    // Hide any existing preview before showing a new one
    if(previewState.activeIframe) hidePreview(previewState.activeIframe);

    const appContext = this.view.state.field(appContextField);
    const linkContent = linkEl.textContent.slice(2, -2);
    const url = getLinkURL(linkContent, appContext);

    const iframe = document.createElement('iframe');
    iframe.className = 'preview-iframe';
    iframe.src = url;
    iframe.dataset.link = linkEl.textContent;

    // Position the iframe near the mouse
    const x = event.clientX + 20;
    const y = event.clientY + 20;
    iframe.style.left = `${x}px`;
    iframe.style.top = `${y}px`;

    iframe.addEventListener('mouseover', () => {
      clearTimeout(previewState.hideTimeout);
      iframe.dataset.interacted = 'true';
    });

    iframe.addEventListener('mouseout', (e) => {
        // Only hide if the mouse moves out of the iframe to the main page
        if (e.relatedTarget === null || e.relatedTarget.tagName === 'HTML') {
            this.onMouseOut();
        }
    });

    document.getElementById('preview-windows-container').appendChild(iframe);
    previewState.activeIframe = iframe;
    
    // Use a tiny timeout to allow the element to be in the DOM before transitioning
    setTimeout(() => iframe.classList.add('visible'), 10);
  }

  onMouseOut() {
    clearTimeout(previewState.hideTimeout);
    previewState.hideTimeout = setTimeout(() => {
      if (previewState.activeIframe && previewState.activeIframe.dataset.interacted !== 'true') {
        hidePreview(previewState.activeIframe);
      }
    }, 300);
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
      const linkContent = linkEl.textContent.slice(2, -2);
      
      if (event.shiftKey) {
        const appContext = this.view.state.field(appContextField);
        if (appContext && appContext.editor && appContext.editor.paneId) {
            window.thoughtform.workspace.openInNewPane(linkContent, appContext.editor.paneId);
        }
      } else {
        this.handleNavigation(linkEl);
      }
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