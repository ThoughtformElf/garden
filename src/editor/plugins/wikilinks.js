import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { appContextField } from '../navigation.js';

// --- State for managing previews ---
const previewState = {
  activeWindows: new Map(), // Use a unique ID for each window instance
  dragState: null,
  zIndexCounter: 1000,
};

// --- Helper Functions ---
function getLinkURL(linkContent, appContext) {
  let path = linkContent.split('|')[0].trim();
  let garden = appContext.gitClient.gardenName;

  if (path.includes('#')) {
    [garden, path] = path.split('#');
  }

  // THIS IS THE FIX: Use a root-relative path to avoid base path issues.
  return `/${encodeURIComponent(garden)}#${encodeURI(path)}?preview=true`;
}

function hidePreview(windowEl) {
  if (windowEl) {
    const windowId = windowEl.dataset.windowId;
    previewState.activeWindows.delete(windowId);
    windowEl.classList.remove('visible');
    setTimeout(() => windowEl.remove(), 200);
  }
}

function createPreviewWindow(url, initialX, initialY) {
    const windowId = `preview-${crypto.randomUUID()}`;

    const windowEl = document.createElement('div');
    windowEl.className = 'preview-window';
    windowEl.dataset.windowId = windowId; // Use unique ID
    
    windowEl.style.zIndex = ++previewState.zIndexCounter;
    
    windowEl.addEventListener('mousedown', () => {
      windowEl.style.zIndex = ++previewState.zIndexCounter;
    }, { capture: true });

    const addressBar = document.createElement('div');
    addressBar.className = 'preview-address-bar';
    addressBar.addEventListener('mousedown', (e) => startDrag(windowEl, e));
    
    const addressInput = document.createElement('input');
    addressInput.type = 'text';
    addressInput.className = 'preview-address-input';
    addressInput.value = url;

    const goBtn = document.createElement('button');
    goBtn.textContent = 'Go';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'preview-close-btn';
    closeBtn.onclick = () => hidePreview(windowEl);
    
    addressBar.append(addressInput, goBtn, closeBtn);

    const iframe = document.createElement('iframe');
    iframe.className = 'preview-iframe';
    iframe.src = url;

    const loadUrl = () => {
      // Use the iframe's contentWindow to navigate, which preserves the origin
      // and avoids cross-origin issues when the base path changes.
      if (iframe.contentWindow) {
          try {
             iframe.contentWindow.location.href = new URL(addressInput.value, window.location.origin).href;
          } catch(e) {
             addressInput.value = iframe.src;
          }
      }
    };
    goBtn.onclick = loadUrl;
    addressInput.onkeydown = (e) => { if(e.key === 'Enter') loadUrl(); };

    windowEl.append(addressBar, iframe);

    const { innerWidth, innerHeight } = window;
    const winWidth = 640;
    const winHeight = 424;
    const offset = (previewState.activeWindows.size % 5) * 25; // Cascade up to 5 windows
    
    let top = initialY + 20 + offset;
    let left = initialX + 20 + offset;

    if (left + winWidth > innerWidth) left = initialX - winWidth - 20 - offset;
    if (top + winHeight > innerHeight) top = initialY - winHeight - 20 - offset;
    
    windowEl.style.left = `${Math.max(5, left)}px`;
    windowEl.style.top = `${Math.max(5, top)}px`;

    document.getElementById('preview-windows-container').appendChild(windowEl);
    previewState.activeWindows.set(windowId, windowEl);
    
    setTimeout(() => windowEl.classList.add('visible'), 10);
}

// --- Communication with iframes ---
window.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  const iframe = event.source.frameElement;
  if (!iframe) return;

  const previewWindow = iframe.closest('.preview-window');
  if (!previewWindow) return;

  switch (type) {
    case 'preview-focus':
      previewWindow.style.zIndex = ++previewState.zIndexCounter;
      break;
    case 'preview-url-changed':
      const addressInput = previewWindow.querySelector('.preview-address-input');
      if (addressInput && payload.newUrl) {
          // Reconstruct a root-relative URL for the address bar
          const url = new URL(payload.newUrl);
          addressInput.value = `${url.pathname}${url.hash}`;
      }
      break;
    case 'request-preview-window':
      if (payload) {
        createPreviewWindow(payload.url, payload.clientX, payload.clientY);
      }
      break;
  }
});


// --- Drag and Resize Logic ---
function startDrag(windowEl, e) {
  const rect = windowEl.getBoundingClientRect();
  previewState.dragState = {
    windowEl,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
  };

  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd, { once: true });
}

function onDragMove(e) {
  if (!previewState.dragState) return;
  e.preventDefault();
  const { windowEl, offsetX, offsetY } = previewState.dragState;
  windowEl.style.left = `${e.clientX - offsetX}px`;
  windowEl.style.top = `${e.clientY - offsetY}px`;
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

    this.view.dom.addEventListener('mousedown', this.onMouseDown);
    this.view.dom.addEventListener('mouseup', this.onMouseUp);
    this.view.dom.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.view.dom.addEventListener('touchend', this.onTouchEnd);
    this.view.dom.addEventListener('touchmove', this.onTouchMove, { passive: true });
    this.view.dom.addEventListener('mouseover', this.onMouseOver);
  }

  destroy() {
    this.clearLongPressTimeout();
    this.view.dom.removeEventListener('mousedown', this.onMouseDown);
    this.view.dom.removeEventListener('mouseup', this.onMouseUp);
    this.view.dom.removeEventListener('touchstart', this.onTouchStart);
    this.view.dom.removeEventListener('touchend', this.onTouchEnd);
    this.view.dom.removeEventListener('touchmove', this.onTouchMove);
    this.view.dom.removeEventListener('mouseover', this.onMouseOver);
  }
  
  onMouseOver(event) {
    if (!event.altKey) return;
    const linkEl = event.target.closest('.cm-wikilink');
    if (!linkEl) return;

    const appContext = this.view.state.field(appContextField);
    const linkContent = linkEl.textContent.slice(2, -2);
    const url = getLinkURL(linkContent, appContext);
    
    const isNestedPreview = window.self !== window.top;
    if (isNestedPreview) {
        window.top.postMessage({
            type: 'request-preview-window',
            payload: {
                url: url,
                clientX: event.clientX,
                clientY: event.clientY,
            }
        }, '*');
        return;
    }

    createPreviewWindow(url, event.clientX, event.clientY);
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