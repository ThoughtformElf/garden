/**
 * A reusable class for creating custom context menus.
 */
export class ContextMenu {
  /**
   * @param {Object} options Configuration for the context menu.
   * @param {string} options.targetSelector A CSS selector for the main container where the menu can be triggered.
   * @param {Array<{label: string, action: function}|{type: 'separator'}>} options.items An array of menu item objects.
   * @param {Array<{label: string, action: function}|{type: 'separator'}>} [options.containerItems] Optional array for container background clicks.
   * @param {string} [options.itemSelector] A CSS selector for specific items within the target that trigger the main `items` list.
   * @param {string} [options.dataAttribute] The data attribute to find on a specific item (e.g., 'data-filepath').
   */
  constructor({ targetSelector, items, containerItems = [], itemSelector, dataAttribute }) {
    this.targetSelector = targetSelector;
    this.items = items;
    this.containerItems = containerItems;
    this.itemSelector = itemSelector;
    
    if (dataAttribute) {
        const rawAttribute = dataAttribute.replace('data-', '');
        this.dataAttributeKey = rawAttribute.replace(/-([a-z])/g, g => g[1].toUpperCase());
    } else {
        this.dataAttributeKey = null;
    }

    this.menuElement = null;
    this.longPressTimeout = null;

    this.boundHideMenu = this.hideMenu.bind(this);
    this.init();
  }

  init() {
    this.createMenuElement();
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
    const mainTarget = e.target.closest(this.targetSelector);
    if (!mainTarget) return;

    e.preventDefault();
    const specificItem = this.itemSelector ? e.target.closest(this.itemSelector) : null;

    if (specificItem) {
      this.showMenu(e.clientX, e.clientY, this.items, specificItem);
    } else {
      this.showMenu(e.clientX, e.clientY, this.containerItems, mainTarget);
    }
  }

  handleTouchStart(e) {
    const mainTarget = e.target.closest(this.targetSelector);
    if (!mainTarget) return;

    this.longPressTimeout = setTimeout(() => {
      e.preventDefault();
      const specificItem = this.itemSelector ? e.target.closest(this.itemSelector) : null;
      const menuItems = specificItem ? this.items : this.containerItems;
      this.showMenu(e.touches[0].clientX, e.touches[0].clientY, menuItems, specificItem || mainTarget);
      this.longPressTimeout = null;
    }, 500);
  }

  handleTouchEnd() {
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
  }

  showMenu(x, y, menuItems, element) {
    this.menuElement.innerHTML = '';
    this.menuElement.style.display = 'block';

    const dataValue = this.dataAttributeKey && element.dataset[this.dataAttributeKey] 
      ? element.dataset[this.dataAttributeKey] 
      : null;

    menuItems.forEach(item => {
      // --- NEW: Handle separators ---
      if (item.type === 'separator') {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        this.menuElement.appendChild(separator);
        return;
      }
      
      const button = document.createElement('button');
      button.className = 'context-menu-item';
      button.textContent = item.label;
      button.addEventListener('click', () => {
        item.action(dataValue);
        this.hideMenu();
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

    document.addEventListener('click', this.boundHideMenu);
    document.addEventListener('contextmenu', this.boundHideMenu);
  }

  hideMenu(e) {
    if (e && this.menuElement.contains(e.target)) {
      return;
    }
    
    if (this.menuElement.style.display === 'block') {
      this.menuElement.style.display = 'none';
      document.removeEventListener('click', this.boundHideMenu);
      document.removeEventListener('contextmenu', this.boundHideMenu);
    }
  }
}
