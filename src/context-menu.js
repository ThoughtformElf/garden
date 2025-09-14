// src/context-menu.js

/**
 * A reusable class for creating custom context menus.
 */
export class ContextMenu {
  /**
   * @param {Object} options Configuration for the context menu.
   * @param {string} options.targetSelector A CSS selector for elements that should trigger the menu.
   * @param {Array<{label: string, action: function}>} options.items An array of menu item objects.
   * @param {string} options.dataAttribute The data attribute to find on the target element (e.g., 'data-filepath').
   */
  constructor({ targetSelector, items, dataAttribute }) {
    this.targetSelector = targetSelector;
    this.items = items;
    this.dataAttribute = dataAttribute.replace('data-', '');
    this.menuElement = null;
    this.longPressTimeout = null;

    // Bind event handlers once to maintain the correct `this` context
    this.boundHideMenu = this.hideMenu.bind(this);

    this.init();
  }

  init() {
    this.createMenuElement();
    // Use event delegation on the document for simplicity and performance
    document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this));
    document.addEventListener('touchcancel', this.handleTouchEnd.bind(this));
  }

  createMenuElement() {
    this.menuElement = document.createElement('div');
    this.menuElement.className = 'context-menu';
    document.body.appendChild(this.menuElement);
  }

  handleContextMenu(e) {
    const targetElement = e.target.closest(this.targetSelector);
    if (targetElement) {
      e.preventDefault();
      this.showMenu(e.clientX, e.clientY, targetElement);
    }
  }

  handleTouchStart(e) {
    const targetElement = e.target.closest(this.targetSelector);
    if (targetElement) {
      this.longPressTimeout = setTimeout(() => {
        e.preventDefault();
        this.showMenu(e.touches[0].clientX, e.touches[0].clientY, targetElement);
        this.longPressTimeout = null;
      }, 500);
    }
  }

  handleTouchEnd(e) {
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
  }

  showMenu(x, y, targetElement) {
    this.menuElement.innerHTML = '';
    this.menuElement.style.display = 'block';

    const dataValue = targetElement.dataset[this.dataAttribute];

    this.items.forEach(item => {
      const button = document.createElement('button');
      button.className = 'context-menu-item';
      button.textContent = item.label;
      button.addEventListener('click', () => {
        item.action(dataValue);
        this.hideMenu(); // Hide menu after action
      });
      this.menuElement.appendChild(button);
    });

    const menuWidth = this.menuElement.offsetWidth;
    const menuHeight = this.menuElement.offsetHeight;
    const { innerWidth, innerHeight } = window;

    let finalX = x;
    let finalY = y;

    if (x + menuWidth > innerWidth) finalX = innerWidth - menuWidth - 5;
    if (y + menuHeight > innerHeight) finalY = innerHeight - menuHeight - 5;

    this.menuElement.style.top = `${finalY}px`;
    this.menuElement.style.left = `${finalX}px`;

    // Add listeners to close the menu
    document.addEventListener('click', this.boundHideMenu);
    document.addEventListener('contextmenu', this.boundHideMenu);
  }

  hideMenu(e) {
    // If the event that triggered hide was inside our menu, do nothing.
    // This allows clicks on menu items to work without hide being called first.
    if (e && this.menuElement.contains(e.target)) {
      return;
    }
    
    if (this.menuElement.style.display === 'block') {
      this.menuElement.style.display = 'none';
      // Clean up the listeners when the menu is hidden
      document.removeEventListener('click', this.boundHideMenu);
      document.removeEventListener('contextmenu', this.boundHideMenu);
    }
  }
}
