import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { appContextField } from '../navigation.js';

const SESSION_STORAGE_KEY = 'thoughtform_window_states';

const previewState = {
  activeWindows: new Map(),
  dragState: null,
  zIndexCounter: 1000,
  lastSpawnedLink: null,
  lastSpawnTime: 0,
};

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function saveWindowStates() {
  const states = [];
  previewState.activeWindows.forEach(windowEl => {
    const rect = windowEl.getBoundingClientRect();
    states.push({
      id: windowEl.dataset.windowId,
      url: windowEl.querySelector('.preview-address-input').value,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      zIndex: parseInt(windowEl.style.zIndex, 10),
    });
  });
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(states));
}

function loadWindowStates() {
  const savedStates = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (savedStates) {
    try {
      const states = JSON.parse(savedStates);
      states.sort((a, b) => a.zIndex - b.zIndex).forEach(state => {
        createPreviewWindow(state.url, 0, 0, state);
      });
    } catch (e) {
      console.error("Failed to load window states from session storage.", e);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }
}

function getLinkURL(linkContent, appContext) {
  let path = linkContent.split('|')[0].trim();
  let garden = appContext.gitClient.gardenName;
  if (path.includes('#')) [garden, path] = path.split('#');
  
  // Use the new centralized URL builder
  return window.thoughtform.workspace.buildUrl(garden, path, true);
}

function hidePreview(windowEl) {
  if (windowEl) {
    previewState.activeWindows.delete(windowEl.dataset.windowId);
    windowEl.classList.remove('visible');
    
    window.thoughtform.events.publish('window:close', { windowId: windowEl.dataset.windowId });

    setTimeout(() => {
      windowEl.remove();
      saveWindowStates();

      // --- THIS IS THE FIX ---
      // After closing a window, return focus to the active editor in the main workspace.
      const activeEditor = window.thoughtform.workspace.getActiveEditor();
      if (activeEditor && activeEditor.editorView) {
        activeEditor.editorView.focus();
      }
      // --- END OF FIX ---
      
    }, 200);
  }
}

function createPreviewWindow(url, initialX, initialY, savedState = null) {
    const windowId = savedState ? savedState.id : `preview-${crypto.randomUUID()}`;
    const windowEl = document.createElement('div');
    windowEl.className = 'preview-window';
    windowEl.dataset.windowId = windowId;
    
    windowEl.style.zIndex = savedState ? savedState.zIndex : ++previewState.zIndexCounter;
    if (savedState) previewState.zIndexCounter = Math.max(previewState.zIndexCounter, savedState.zIndex);

    windowEl.addEventListener('mousedown', () => {
      windowEl.style.zIndex = ++previewState.zIndexCounter;
      saveWindowStates();
    }, { capture: true });

    const addressBar = document.createElement('div');
    addressBar.className = 'preview-address-bar';
    addressBar.addEventListener('mousedown', (e) => startDrag(windowEl, e));
    
    const addressInput = document.createElement('input');
    addressInput.type = 'text';
    addressInput.className = 'preview-address-input';
    addressInput.value = savedState ? savedState.url : url;

    const goBtn = document.createElement('button');
    goBtn.textContent = 'Go';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'preview-close-btn';
    closeBtn.onclick = () => hidePreview(windowEl);
    
    addressBar.append(addressInput, goBtn, closeBtn);

    const iframe = document.createElement('iframe');
    iframe.className = 'preview-iframe';
    
    let iframeSrc = savedState ? savedState.url : url;
    if (iframeSrc.includes('?')) {
        iframeSrc += `&windowId=${windowId}`;
    } else {
        iframeSrc += `?windowId=${windowId}`;
    }
    iframe.src = iframeSrc;

    const searchResultsEl = document.createElement('ul');
    searchResultsEl.className = 'preview-search-results';
    searchResultsEl.style.display = 'none';
    addressBar.appendChild(searchResultsEl);

    let searchResults = [];
    let selectedSearchIndex = -1;

    const updateSearchDropdown = () => {
        searchResultsEl.innerHTML = '';
        if(searchResults.length === 0) {
            searchResultsEl.style.display = 'none';
            return;
        }
        searchResults.forEach((result, index) => {
            const li = document.createElement('li');
            li.className = 'preview-result-item';
            li.innerHTML = `<span class="preview-result-path">${result.doc.path.substring(1)}</span> <span class="preview-result-garden">[${result.doc.garden}]</span>`;
            if (index === selectedSearchIndex) li.classList.add('active');
            li.onmousedown = (e) => {
                e.preventDefault();
                addressInput.value = `/${result.doc.garden}#${result.doc.path}?windowed=true`;
                loadUrl();
                searchResultsEl.style.display = 'none';
            };
            searchResultsEl.appendChild(li);
        });
        searchResultsEl.style.display = 'block';
    };
    
    addressInput.addEventListener('input', async (e) => {
      const query = e.target.value;
      if (!query || query.startsWith('/')) {
        searchResults = [];
        updateSearchDropdown();
        return;
      }
      const results = await window.thoughtform.commandPalette.unifiedIndex.searchAsync(query, { enrich: true, limit: 10 });
      searchResults = results[0]?.result || [];
      selectedSearchIndex = 0;
      updateSearchDropdown();
    });

    addressInput.addEventListener('keydown', (e) => {
        if (searchResultsEl.style.display !== 'none') {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedSearchIndex = Math.min(selectedSearchIndex + 1, searchResults.length - 1);
                updateSearchDropdown();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedSearchIndex = Math.max(selectedSearchIndex - 1, 0);
                updateSearchDropdown();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedSearchIndex > -1 && searchResults[selectedSearchIndex]) {
                    const result = searchResults[selectedSearchIndex];
                    addressInput.value = `/${result.doc.garden}#${result.doc.path}?windowed=true`;
                    loadUrl();
                } else {
                    loadUrl();
                }
                searchResults = [];
                updateSearchDropdown();
            } else if (e.key === 'Escape') {
                searchResults = [];
                updateSearchDropdown();
            }
        } else if (e.key === 'Enter') {
            loadUrl();
        }
    });
    
    addressInput.addEventListener('blur', () => setTimeout(() => { searchResultsEl.style.display = 'none' }, 150));
    addressInput.addEventListener('focus', () => { if(searchResults.length > 0) searchResultsEl.style.display = 'block'; });

    const loadUrl = () => {
      if (iframe.contentWindow) {
          try {
             iframe.contentWindow.location.href = new URL(addressInput.value, window.location.origin).href;
          } catch(e) { addressInput.value = iframe.src; }
      }
    };
    goBtn.onclick = loadUrl;

    windowEl.append(addressBar, iframe);

    if (savedState) {
        windowEl.style.left = `${savedState.left}px`;
        windowEl.style.top = `${savedState.top}px`;
        windowEl.style.width = `${savedState.width}px`;
        windowEl.style.height = `${savedState.height}px`;
    } else {
        const { innerWidth, innerHeight } = window;
        const winWidth = 640;
        const winHeight = 424;
        const offset = (previewState.activeWindows.size % 5) * 25;
        
        let top, left;
        const isCentering = Math.abs(initialX - innerWidth / 2) < 100 && Math.abs(initialY - innerHeight / 2) < 100;

        if (isCentering) {
            left = initialX - (winWidth / 2) + offset;
            top = initialY - (winHeight / 2) + offset;
        } else {
            top = initialY + 20 + offset;
            left = initialX + 20 + offset;
            if (left + winWidth > innerWidth) left = initialX - winWidth - 20 - offset;
            if (top + winHeight > innerHeight) top = initialY - winHeight - 20 - offset;
        }
        
        windowEl.style.left = `${Math.max(5, left)}px`;
        windowEl.style.top = `${Math.max(5, top)}px`;
    }

    document.getElementById('preview-windows-container').appendChild(windowEl);
    previewState.activeWindows.set(windowId, windowEl);
    
    if (!savedState) {
        window.thoughtform.events.publish('window:create', { windowId, url });
    }

    const debouncedResize = debounce((entry) => {
        saveWindowStates();
        const { width, height } = entry.contentRect;
        window.thoughtform.events.publish('window:resize', {
            windowId: windowId,
            width: Math.round(width),
            height: Math.round(height),
        });
    }, 250);

    new ResizeObserver((entries) => {
        for (const entry of entries) debouncedResize(entry);
    }).observe(windowEl);
    
    setTimeout(() => {
        windowEl.classList.add('visible');
        if (!savedState) saveWindowStates();
    }, 10);
}

window.addEventListener('message', (event) => {
  if (!event.data || typeof event.data.type === 'undefined') {
    return;
  }

  let iframe;
  try {
    iframe = event.source.frameElement;
  } catch (e) {
    // This can happen if the message source is not an iframe, which is fine.
  }
  
  const { type, payload } = event.data;

  // The 'close' message doesn't depend on the iframe context,
  // so we handle it before the iframe checks.
  if (type === 'close-preview-window') {
    if (payload && payload.windowId) {
      const windowEl = previewState.activeWindows.get(payload.windowId);
      if (windowEl) {
        hidePreview(windowEl);
      }
    }
    return; // We've handled the message.
  }

  // The rest of the messages require an iframe source.
  if (!iframe) return;

  const previewWindow = iframe.closest('.preview-window');
  if (!previewWindow) return;

  switch (type) {
    case 'preview-focus':
      previewWindow.style.zIndex = ++previewState.zIndexCounter;
      saveWindowStates();
      break;
    case 'preview-url-changed':
      const addressInput = previewWindow.querySelector('.preview-address-input');
      if (addressInput && payload.newUrl) {
          const url = new URL(payload.newUrl);
          addressInput.value = `${url.pathname}${url.hash}`;
          saveWindowStates();
      }
      break;
    case 'request-preview-window':
      if (payload) createPreviewWindow(payload.url, payload.clientX, payload.clientY);
      break;
  }
});

function startDrag(windowEl, e) {
  windowEl.classList.add('is-dragging');
  const rect = windowEl.getBoundingClientRect();
  previewState.dragState = { windowEl, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
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
  if (previewState.dragState) {
    previewState.dragState.windowEl.classList.remove('is-dragging');
    saveWindowStates();
  }
  previewState.dragState = null;
  document.removeEventListener('mousemove', onDragMove);
}

const wikilinkDecoration = Decoration.mark({ class: 'cm-wikilink' });

class WikilinkPlugin {
  constructor(view) {
    this.view = view;
    this.decorations = this.findWikilinks(view);
    this.longPressTimeout = null;
    this.isWindowed = window.self !== window.top;

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onMouseOver = this.onMouseOver.bind(this);
    
    if (!this.isWindowed) {
        if (window.thoughtform && window.thoughtform.ui && !window.thoughtform.ui.openWindow) {
            window.thoughtform.ui.openWindow = createPreviewWindow;
        }
        if (!window.thoughtform_windows_loaded) {
            loadWindowStates();
            window.thoughtform_windows_loaded = true;
        }
    }
    
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

    const now = Date.now();
    if (linkEl.textContent === previewState.lastSpawnedLink && (now - previewState.lastSpawnTime < 500)) {
        return;
    }

    const appContext = this.view.state.field(appContextField);
    const linkContent = linkEl.textContent.slice(2, -2);
    const url = getLinkURL(linkContent, appContext);
    
    if (this.isWindowed) {
        window.top.postMessage({ type: 'request-preview-window', payload: { url, clientX: event.clientX, clientY: event.clientY }}, '*');
    } else {
        createPreviewWindow(url, event.clientX, event.clientY);
    }
    
    previewState.lastSpawnedLink = linkEl.textContent;
    previewState.lastSpawnTime = now;
  }

  handleNavigation(linkEl) {
    const appContext = this.view.state.field(appContextField);
    if (appContext.editor) appContext.editor.navigateTo(linkEl.textContent.slice(2, -2));
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

  onMouseUp() { this.clearLongPressTimeout(); }
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
  onTouchEnd() { this.clearLongPressTimeout(); }
  onTouchMove() { this.clearLongPressTimeout(); }
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