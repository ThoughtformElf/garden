import eruda from 'eruda';
import { Sync } from './sync/index.js';
import { addDataTool } from './data/index.js';
import { addAiTool } from './ai.js';

export function initializeDevTools() {
  const el = document.getElementById('eruda-container');
  if (!el) return;

  eruda.init({
    container: el,
    tool: ['console', 'elements', 'network', 'resources'],
    inline: true,
    useShadowDom: false,
  });

  const consoleTool = eruda.get('console');
  if (consoleTool) {
    consoleTool.config.set('maxLogNum', 2000);
  }

  if (window.thoughtform) {
    window.thoughtform.eruda = eruda;
  }

  // Add listener to know when devtools tabs are switched
  setTimeout(() => {
    const navBar = el.querySelector('.luna-tab-item')?.parentElement;
    if (navBar) {
      navBar.addEventListener('click', (e) => {
        const tabItem = e.target.closest('.luna-tab-item');
        if (tabItem) {
          const tabName = tabItem.innerText.toLowerCase();
          window.thoughtform.ui.toggleDevtools?.(true, tabName);
        }
      });
    }
  }, 500);

  // Workaround for eruda elements inspector bug
  setTimeout(() => {
    const elementsPanel = el.querySelector('.eruda-elements');
    if (!elementsPanel) return;
    let wasVisible = false;
    const observer = new MutationObserver(() => {
      const isVisible = elementsPanel.style.display !== 'none';
      if (isVisible && !wasVisible) {
        const selectBtn = document.querySelector('.eruda-control > .eruda-icon-select');
        if (selectBtn) {
          selectBtn.click();
          selectBtn.click();
        }
      }
      wasVisible = isVisible;
    });
    observer.observe(elementsPanel, { attributes: true, attributeFilter: ['style'] });
  }, 500);
  
  // Add custom tools by delegating to specialized modules
  addDataTool(eruda);
  addAiTool(eruda);

  // The Sync tool is already well-encapsulated, so we initialize it directly
  eruda.add({
    name: 'Sync',
    init($el) {
      this.sync = new Sync();
      this.sync.init($el.get(0));
    },
    show() { this.sync.show(); },
    hide() { this.sync.hide(); },
    destroy() { this.sync.destroy(); }
  });

  return eruda;
}