// src/ui-interactions.js

/**
 * Initializes all UI interaction handlers for the application.
 */
export function initializeAppInteractions() {
  initializeSidebarInteractions();
  initializeErudaResizer();
}

/**
 * Initializes sidebar resizing and collapsing functionality.
 * Click toggles between 0 and a saved/default width. Drag resizes freely.
 */
function initializeSidebarInteractions() {
  const container = document.querySelector('.app-container');
  const resizer = document.getElementById('resizer');
  const overlay = document.getElementById('resize-overlay');

  if (!container || !resizer || !overlay) return;

  const toggleButton = document.createElement('button');
  toggleButton.id = 'sidebar-toggle-icon';
  toggleButton.title = 'Toggle Sidebar';
  resizer.appendChild(toggleButton);

  let dragStartX = 0;
  let isDragging = false;

  const toggleCollapse = () => {
    const isCollapsed = container.classList.contains('sidebar-collapsed');
    if (isCollapsed) {
      // Expand
      const lastWidth = localStorage.getItem('sidebarWidth') || '250px';
      container.classList.remove('sidebar-collapsed');
      document.documentElement.style.setProperty('--sidebar-width', lastWidth);
      localStorage.setItem('sidebarCollapsed', 'false');
      toggleButton.textContent = '‹';
    } else {
      // Collapse
      const currentWidth = document.documentElement.style.getPropertyValue('--sidebar-width');
      if (currentWidth !== '0px') {
        localStorage.setItem('sidebarWidth', currentWidth);
      }
      container.classList.add('sidebar-collapsed');
      document.documentElement.style.setProperty('--sidebar-width', '0px');
      localStorage.setItem('sidebarCollapsed', 'true');
      toggleButton.textContent = '›';
    }
  };
  
  const sidebarHandleMove = (e) => {
    if (e.type === 'touchmove') e.preventDefault();
    const currentX = e.clientX || (e.touches && e.touches[0].clientX);
    
    if (Math.abs(currentX - dragStartX) > 5) {
      isDragging = true;
    }
    
    if (isDragging) {
      const newWidth = Math.max(0, Math.min(currentX, window.innerWidth - 100));
      document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
      container.classList.remove('sidebar-collapsed');
      toggleButton.textContent = '‹';
    }
  };

  const sidebarEndResize = () => {
    overlay.style.display = 'none';
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';

    document.removeEventListener('mousemove', sidebarHandleMove);
    document.removeEventListener('touchmove', sidebarHandleMove);
    document.removeEventListener('mouseup', sidebarEndResize);
    document.removeEventListener('touchend', sidebarEndResize);

    if (isDragging) {
      const finalWidth = document.documentElement.style.getPropertyValue('--sidebar-width');
      localStorage.setItem('sidebarWidth', finalWidth);
      localStorage.setItem('sidebarCollapsed', 'false');
    } else {
      toggleCollapse();
    }
  };
  
  const sidebarStartResize = (e) => {
    dragStartX = e.clientX || (e.touches && e.touches[0].clientX);
    isDragging = false;
    e.preventDefault();
    overlay.style.display = 'block';
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', sidebarHandleMove);
    document.addEventListener('touchmove', sidebarHandleMove, { passive: false });
    document.addEventListener('mouseup', sidebarEndResize);
    document.addEventListener('touchend', sidebarEndResize);
  };

  resizer.addEventListener('mousedown', sidebarStartResize);
  resizer.addEventListener('touchstart', sidebarStartResize, { passive: false });

  // Restore State
  const savedWidth = localStorage.getItem('sidebarWidth');
  const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  if (isCollapsed) {
    container.classList.add('sidebar-collapsed');
    document.documentElement.style.setProperty('--sidebar-width', '0px');
    toggleButton.textContent = '›';
  } else {
    document.documentElement.style.setProperty('--sidebar-width', savedWidth || '250px');
    toggleButton.textContent = '‹';
  }
}

/**
 * Initializes the resizer and toggle for the Eruda panel.
 */
function initializeErudaResizer() {
  const erudaContainer = document.getElementById('eruda-container');
  const erudaResizer = document.getElementById('eruda-resizer');
  let erudaDevTools;

  if (!erudaContainer || !erudaResizer) return;
  
  const erudaToggle = document.createElement('button');
  erudaToggle.id = 'eruda-toggle';
  erudaToggle.title = 'Toggle Eruda Panel';
  erudaResizer.appendChild(erudaToggle);

  let dragStartY = 0;
  let isDragging = false;

  const toggleEruda = () => {
    if (!erudaDevTools) return;
    // FIX: Check the actual style property or offsetHeight.
    const isCurrentlyCollapsed = erudaDevTools.style.height === '0px' || erudaDevTools.offsetHeight < 10;
    
    if (isCurrentlyCollapsed) {
      // Expand to a fixed 250px
      erudaDevTools.style.height = '250px';
      erudaToggle.textContent = '▼';
      localStorage.setItem('erudaCollapsed', 'false');
      localStorage.setItem('erudaHeight', '250px'); // Also save this as the new height
    } else {
      // Collapse
      localStorage.setItem('erudaHeight', erudaDevTools.style.height);
      erudaDevTools.style.height = '0px';
      erudaToggle.textContent = '▲';
      localStorage.setItem('erudaCollapsed', 'true');
    }
  };

  const erudaHandleMove = (e) => {
    if (e.type === 'touchmove') e.preventDefault();
    const currentY = e.clientY || (e.touches && e.touches[0].clientY);
    if (Math.abs(currentY - dragStartY) > 5) {
      isDragging = true;
    }
    if (!isDragging) return;
    
    const newHeight = window.innerHeight - currentY;
    const minHeight = 42;
    const maxHeight = window.innerHeight - 100;
    erudaDevTools.style.height = `${Math.max(minHeight, Math.min(newHeight, maxHeight))}px`;
    erudaToggle.textContent = '▼';
  };

  const erudaEndResize = (e) => {
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';

    document.removeEventListener('mousemove', erudaHandleMove);
    document.removeEventListener('touchmove', erudaHandleMove);
    document.removeEventListener('mouseup', erudaEndResize);
    document.removeEventListener('touchend', erudaEndResize);
    
    // Use setTimeout to ensure the click event fires after this, and can check the `isDragging` flag.
    setTimeout(() => {
        if (isDragging) {
            localStorage.setItem('erudaHeight', erudaDevTools.style.height);
            localStorage.setItem('erudaCollapsed', 'false');
        }
    }, 0);
  };
  
  const erudaStartResize = (e) => {
    dragStartY = e.clientY || (e.touches && e.touches[0].clientY);
    isDragging = false;
    e.preventDefault();
    erudaDevTools = document.querySelector('.eruda-dev-tools');
    if (!erudaDevTools) return;
    
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', erudaHandleMove);
    document.addEventListener('touchmove', erudaHandleMove, { passive: false });
    document.addEventListener('mouseup', erudaEndResize);
    document.addEventListener('touchend', erudaEndResize);
  };

  erudaResizer.addEventListener('mousedown', erudaStartResize);
  erudaResizer.addEventListener('touchstart', erudaStartResize, { passive: false });
  // This listener now correctly fires only on a non-drag click.
  erudaResizer.addEventListener('click', () => {
    if (!isDragging) {
      toggleEruda();
    }
  });

  // Restore State
  const observer = new MutationObserver(() => {
    erudaDevTools = document.querySelector('.eruda-dev-tools');
    if (erudaDevTools) {
      const isCollapsed = localStorage.getItem('erudaCollapsed') === 'true';
      if (isCollapsed) {
        erudaDevTools.style.height = '0px';
        erudaToggle.textContent = '▲';
      } else {
        erudaDevTools.style.height = localStorage.getItem('erudaHeight') || '150px';
        erudaToggle.textContent = '▼';
      }
      observer.disconnect();
    }
  });
  observer.observe(erudaContainer, { childList: true });
}
