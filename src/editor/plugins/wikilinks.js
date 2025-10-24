import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { appContextField } from '../navigation.js';

// --- State for managing previews ---
const previewState = {
  activeWindow: null,
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

function hidePreview(windowEl) {
  if (windowEl) {
    windowEl.classList.remove('visible');
    setTimeout(() => windowEl.remove(), 200);
  }
  if (previewState.activeWindow === windowEl) {
    previewState.activeWindow = null;
  }
}

// --- Communication with iframes ---
window.addEventListener('message', (event) => {
  const previewWindow = event.source.frameElement?.closest('.preview-window');
  if (!previewWindow) return;

  const { type, payload } = event.data;

  switch (type) {
    case 'preview-interacted':
      previewWindow.dataset.interacted = 'true';
      break;
    case 'preview-url-changed':
      const addressInput = previewWindow.querySelector('.preview-address-input');
      if (addressInput && payload.newUrl) {
          addressInput.value = payload.newUrl;
      }
      break;
  }
});


// --- Drag and Resize Logic ---
function startDrag(windowEl, e) {
  windowEl.dataset.interacted = 'true';
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

    if (previewState.activeWindow && previewState.activeWindow.dataset.link === linkEl.textContent) {
      return; // Already showing this preview
    }
    
    if(previewState.activeWindow) hidePreview(previewState.activeWindow);

    const appContext = this.view.state.field(appContextField);
    const linkContent = linkEl.textContent.slice(2, -2);
    const url = getLinkURL(linkContent, appContext);

    const windowEl = document.createElement('div');
    windowEl.className = 'preview-window';
    windowEl.dataset.link = linkEl.textContent;
    
    // Create Address Bar
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

    // Create Iframe
    const iframe = document.createElement('iframe');
    iframe.className = 'preview-iframe';
    iframe.src = url;

    const loadUrl = () => {
      try {
        const newUrl = new URL(addressInput.value);
        iframe.src = newUrl.href;
      } catch (e) {
        addressInput.value = iframe.src; // Revert on invalid URL
      }
    };
    goBtn.onclick = loadUrl;
    addressInput.onkeydown = (e) => { if(e.key === 'Enter') loadUrl(); };

    windowEl.append(addressBar, iframe);

    // Smart Positioning
    const { clientX, clientY } = event;
    const { innerWidth, innerHeight } = window;
    const winWidth = parseFloat(getComputedStyle(windowEl).width);
    const winHeight = parseFloat(getComputedStyle(windowEl).height);
    
    let top = clientY + 20;
    let left = clientX + 20;

    if (left + winWidth > innerWidth) {
      left = clientX - winWidth - 20;
    }
    if (top + winHeight > innerHeight) {
      top = clientY - winHeight - 20;
    }
    
    windowEl.style.left = `${Math.max(5, left)}px`;
    windowEl.style.top = `${Math.max(5, top)}px`;

    // Interaction listeners
    const markInteracted = () => windowEl.dataset.interacted = 'true';
    windowEl.addEventListener('mouseover', () => clearTimeout(previewState.hideTimeout));
    windowEl.addEventListener('mousedown', markInteracted);
    windowEl.addEventListener('wheel', markInteracted);
    windowEl.addEventListener('mouseout', (e) => {
        if (e.relatedTarget === null || e.relatedTarget.tagName === 'HTML') {
            this.onMouseOut();
        }
    });

    document.getElementById('preview-windows-container').appendChild(windowEl);
    previewState.activeWindow = windowEl;
    
    setTimeout(() => windowEl.classList.add('visible'), 10);
  }

  onMouseOut() {
    clearTimeout(previewState.hideTimeout);
    previewState.hideTimeout = setTimeout(() => {
      if (previewState.activeWindow && previewState.activeWindow.dataset.interacted !== 'true') {
        hidePreview(previewState.activeWindow);
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