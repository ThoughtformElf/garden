// src/workspace.js
import { Editor } from './editor/editor.js';

/**
 * Manages the state of the entire application's UI, including panes,
 * workspaces, and active contexts.
 */
export class WorkspaceManager {
  constructor() {
    this.paneTree = this.createInitialPaneTree(); // The data structure for the layout
    this.panes = new Map(); // Map of paneId -> { element, editor, resizerElement }
    this.activePaneId = 'pane-1';
    this.mainContainer = document.querySelector('main');
    this.isResizing = false;
  }

  createInitialPaneTree() {
    return {
      type: 'leaf',
      id: 'pane-1',
      activeBufferIndex: 0,
      buffers: [] // Will be populated in a later phase
    };
  }

  /**
   * Performs the initial render of the entire workspace layout.
   */
  async render() {
    this.mainContainer.innerHTML = ''; // Clear the main container
    await this._renderNode(this.paneTree, this.mainContainer);
    this.setActivePane(this.activePaneId);
  }

  /**
   * Recursively walks the pane tree and builds the DOM.
   * @param {object} node - The current node in the pane tree.
   * @param {HTMLElement} parentElement - The DOM element to render into.
   */
  async _renderNode(node, parentElement) {
    if (node.type === 'leaf') {
      const paneElement = document.createElement('div');
      paneElement.className = 'pane';
      paneElement.dataset.paneId = node.id;
      parentElement.appendChild(paneElement);

      // This is a temporary shim to pass the initial garden's git client.
      // In a future phase, this will be determined by the buffer's state.
      const initialGitClient = window.thoughtform.editor.gitClient;

      const editor = new Editor({
        target: paneElement,
        gitClient: initialGitClient,
        commandPalette: window.thoughtform.commandPalette
      });

      // Wait for the editor to be fully initialized before proceeding.
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (editor.isReady) {
            clearInterval(check);
            resolve();
          }
        }, 50);
      });

      this.panes.set(node.id, { element: paneElement, editor: editor });

      paneElement.addEventListener('click', () => {
        this.setActivePane(node.id);
      });

    } else if (node.type.startsWith('split-')) {
      const direction = node.type.split('-')[1]; // 'vertical' or 'horizontal'
      parentElement.style.display = 'grid';

      const [child1, child2] = node.children;
      const child1Element = document.createElement('div');
      child1Element.className = 'pane-container';
      const child2Element = document.createElement('div');
      child2Element.className = 'pane-container';

      const resizerElement = document.createElement('div');
      resizerElement.className = `pane-resizer pane-resizer-${direction}`;

      // --- THIS IS THE FIX (Part 1) ---
      // Define a 3-track grid: [pane1, resizer, pane2]
      if (direction === 'vertical') {
        parentElement.style.gridTemplateColumns = `${node.splitPercentage}% auto 1fr`;
      } else {
        parentElement.style.gridTemplateRows = `${node.splitPercentage}% auto 1fr`;
      }
      // --- END OF FIX (Part 1) ---

      parentElement.appendChild(child1Element);
      parentElement.appendChild(resizerElement);
      parentElement.appendChild(child2Element);
      
      this._initializeResizer(resizerElement, parentElement, node, direction);

      await this._renderNode(child1, child1Element);
      await this._renderNode(child2, child2Element);
    }
  }
  
  _initializeResizer(resizer, parent, node, direction) {
    const startResize = (e) => {
      e.preventDefault();
      this.isResizing = true;
      const overlay = document.getElementById('resize-overlay');
      overlay.style.display = 'block';
      overlay.style.cursor = direction === 'vertical' ? 'col-resize' : 'row-resize';

      const handleMove = (moveEvent) => {
        if (!this.isResizing) return;
        const parentRect = parent.getBoundingClientRect();
        
        // --- THIS IS THE FIX (Part 2) ---
        // The logic for calculating the new percentage remains the same,
        // but it will now correctly apply to the new 3-track grid definition.
        if (direction === 'vertical') {
          const newPercentage = ((moveEvent.clientX - parentRect.left) / parentRect.width) * 100;
          node.splitPercentage = Math.max(10, Math.min(90, newPercentage));
          parent.style.gridTemplateColumns = `${node.splitPercentage}% auto 1fr`;
        } else {
          const newPercentage = ((moveEvent.clientY - parentRect.top) / parentRect.height) * 100;
          node.splitPercentage = Math.max(10, Math.min(90, newPercentage));
          parent.style.gridTemplateRows = `${node.splitPercentage}% auto 1fr`;
        }
        // --- END OF FIX (Part 2) ---
      };

      const endResize = () => {
        this.isResizing = false;
        overlay.style.display = 'none';
        overlay.style.cursor = 'default';
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', endResize);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', endResize);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', endResize);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', endResize);
    };
    resizer.addEventListener('mousedown', startResize);
    resizer.addEventListener('touchstart', startResize, { passive: false });
  }

  setActivePane(paneId) {
    if (!this.panes.has(paneId)) return;
    this.activePaneId = paneId;

    this.panes.forEach((pane, id) => {
      pane.element.classList.toggle('is-active-pane', id === paneId);
    });
    
    // In the future, this is where we'll notify the sidebar to refresh
    window.thoughtform.sidebar?.refresh();
  }
  
  splitPane(paneIdToSplit, direction) {
    const findAndSplit = (node) => {
        if (node.type === 'leaf' && node.id === paneIdToSplit) {
            const newPaneId = `pane-${Date.now()}`;
            const newLeaf = { ...node, id: newPaneId }; // Copy buffer state
            
            return {
                type: `split-${direction}`,
                splitPercentage: 50,
                children: [
                    node,
                    newLeaf
                ]
            };
        }
        if (node.type.startsWith('split-')) {
            node.children = node.children.map(child => findAndSplit(child));
        }
        return node;
    };
    
    this.paneTree = findAndSplit(this.paneTree);
    this.render(); // Re-render the entire layout
  }

  getActiveEditor() {
    const pane = this.panes.get(this.activePaneId);
    return pane ? pane.editor : null;
  }

  getActiveGitClient() {
    const editor = this.getActiveEditor();
    return editor ? editor.gitClient : null;
  }
}

export function initializeWorkspaceManager() {
  return new WorkspaceManager();
}