// src/ui-interactions.js

/**
 * Initializes all UI interaction handlers for the application.
 * This is the single exported function from this module.
 */
export function initializeAppInteractions() {
  initializeSidebarInteractions();
  initializeErudaResizer();
}

/**
 * Initializes sidebar resizing and collapsing functionality.
 * This function is local to this module and is not exported.
 */
function initializeSidebarInteractions() {
  const container = document.querySelector('.app-container');
  const sidebar = document.getElementById('sidebar');
  const resizer = document.getElementById('resizer');
  const overlay = document.getElementById('resize-overlay');
  const toggleButton = document.getElementById('sidebar-toggle');

  if (!container || !sidebar || !resizer || !overlay || !toggleButton) {
    console.error('Sidebar UI elements not found. Aborting interactions setup.');
    return;
  }

  // --- Sidebar Resizing ---
  const startResize = (e) => {
    e.preventDefault();
    overlay.style.display = 'block';
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('mouseup', endResize);
    document.addEventListener('touchend', endResize);
  };

  const handleMove = (e) => {
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    if (typeof clientX !== 'number') return;
    const newWidth = Math.max(50, Math.min(clientX, window.innerWidth - 100));
    document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
  };

  const endResize = () => {
    overlay.style.display = 'none';
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('mouseup', endResize);
    document.removeEventListener('touchend', endResize);
    const currentWidth = document.documentElement.style.getPropertyValue('--sidebar-width');
    if (currentWidth) {
      localStorage.setItem('sidebarWidth', currentWidth);
    }
  };

  resizer.addEventListener('mousedown', startResize);
  resizer.addEventListener('touchstart', startResize);

  // --- Sidebar Collapsing ---
  const toggleCollapse = () => {
    const isCollapsed = container.classList.toggle('sidebar-collapsed');
    toggleButton.textContent = isCollapsed ? '›' : '‹';
    localStorage.setItem('sidebarCollapsed', isCollapsed);
  };
  toggleButton.addEventListener('click', toggleCollapse);

  // --- Restore State on Load ---
  const savedWidth = localStorage.getItem('sidebarWidth');
  if (savedWidth) {
    document.documentElement.style.setProperty('--sidebar-width', savedWidth);
  }
  const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  if (isCollapsed) {
    container.classList.add('sidebar-collapsed');
    toggleButton.textContent = '›';
  }
}

/**
 * Initializes the resizer for the Eruda developer tools panel.
 * This function is local to this module and is not exported.
 */
function initializeErudaResizer() {
  const erudaContainer = document.getElementById('eruda-container');
  const erudaResizer = document.getElementById('eruda-resizer');
  let erudaDevTools; // Will be assigned after Eruda initializes

  if (!erudaContainer || !erudaResizer) {
    console.error('Eruda resizer elements not found.');
    return;
  }
  
  const startResize = (e) => {
    e.preventDefault();
    erudaDevTools = document.querySelector('.eruda-dev-tools');
    if (!erudaDevTools) return;

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('mouseup', endResize);
    document.addEventListener('touchend', endResize);
  };

  const handleMove = (e) => {
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (typeof clientY !== 'number') return;

    // Prevent default touch action like scrolling
    if (e.type === 'touchmove') {
      e.preventDefault();
    }

    const newHeight = window.innerHeight - clientY;
    const minHeight = 42; // Min height of Eruda toolbar
    const maxHeight = window.innerHeight - 100; // Leave 100px for the editor

    const constrainedHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
    erudaDevTools.style.height = `${constrainedHeight}px`;
  };

  const endResize = () => {
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';

    if (erudaDevTools) {
        const finalHeight = erudaDevTools.style.height;
        if (finalHeight) {
          localStorage.setItem('erudaHeight', finalHeight);
        }
    }
    
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('mouseup', endResize);
    document.removeEventListener('touchend', endResize);
  };
  
  erudaResizer.addEventListener('mousedown', startResize);
  erudaResizer.addEventListener('touchstart', startResize, { passive: false });

  // Restore height on load
  const savedHeight = localStorage.getItem('erudaHeight');
  if (savedHeight) {
    const observer = new MutationObserver(() => {
        const devTools = document.querySelector('.eruda-dev-tools');
        if (devTools) {
            devTools.style.height = savedHeight;
            observer.disconnect();
        }
    });
    observer.observe(erudaContainer, { childList: true });
  }
}
