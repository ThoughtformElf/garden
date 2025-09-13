// src/ui-interactions.js

/**
 * Initializes sidebar resizing and collapsing functionality.
 * Handles mouse and touch events for a smooth, robust experience.
 */
export function initializeSidebarInteractions() {
  const container = document.querySelector('.app-container');
  const sidebar = document.getElementById('sidebar');
  const resizer = document.getElementById('resizer');
  const overlay = document.getElementById('resize-overlay');
  const toggleButton = document.getElementById('sidebar-toggle');

  if (!container || !sidebar || !resizer || !overlay || !toggleButton) {
    console.error('Sidebar UI elements not found. Aborting interactions setup.');
    return;
  }

  // --- Resizing Logic ---
  const startResize = (e) => {
    // Prevent default actions, especially on touch devices and to avoid text selection.
    e.preventDefault();
    overlay.style.display = 'block';

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove);

    document.addEventListener('mouseup', endResize);
    document.addEventListener('touchend', endResize);
  };

  const handleMove = (e) => {
    // Use touch or mouse event coordinates.
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    if (typeof clientX !== 'number') return;

    // Apply constraints for min/max width.
    const newWidth = Math.max(50, Math.min(clientX, window.innerWidth - 100));
    
    // Update the CSS variable on the root element.
    document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
  };

  const endResize = () => {
    overlay.style.display = 'none';

    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('touchmove', handleMove);

    document.removeEventListener('mouseup', endResize);
    document.removeEventListener('touchend', endResize);

    // Persist the new width to localStorage.
    const currentWidth = document.documentElement.style.getPropertyValue('--sidebar-width');
    if (currentWidth) {
      localStorage.setItem('sidebarWidth', currentWidth);
    }
  };

  resizer.addEventListener('mousedown', startResize);
  resizer.addEventListener('touchstart', startResize);


  // --- Collapsing Logic ---
  const toggleCollapse = () => {
    const isCollapsed = container.classList.toggle('sidebar-collapsed');
    
    // Adjust button text for visual feedback.
    toggleButton.textContent = isCollapsed ? '›' : '‹';
    
    // Persist the state.
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
