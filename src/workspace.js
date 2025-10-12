// src/workspace.js
import { Editor } from './editor/editor.js';
import { Git } from './util/git-integration.js';

/**
 * Manages the state of the entire application's UI, including panes,
 * workspaces, and active contexts.
 */
export class WorkspaceManager {
  constructor(initialGitClient) {
    this.initialGitClient = initialGitClient; // Store the initial client
    this.paneTree = this.createInitialPaneTree(); // The data structure for the layout
    this.panes = new Map(); // Map of paneId -> { element, editor }
    this.activePaneId = 'pane-1';
    this.mainContainer = document.querySelector('main');
    this.isResizing = false;
    this.gitClients = new Map(); // Cache for Git clients
    this.gitClients.set(initialGitClient.gardenName, initialGitClient);
  }

  createInitialPaneTree() {
    const initialPath = (window.location.hash || '#/home').substring(1);
    return {
      type: 'leaf',
      id: 'pane-1',
      activeBufferIndex: 0,
      buffers: [ { garden: this.initialGitClient.gardenName, path: initialPath } ]
    };
  }
  
  async getGitClient(gardenName) {
      if (!this.gitClients.has(gardenName)) {
          const client = new Git(gardenName);
          await client.initRepo();
          this.gitClients.set(gardenName, client);
      }
      return this.gitClients.get(gardenName);
  }

  async render() {
    // Before wiping the DOM, destroy old editor instances to prevent memory leaks
    this.panes.forEach(({ editor }) => {
        if (editor && editor.editorView) {
            editor.editorView.destroy();
        }
    });
    this.panes.clear();

    this.mainContainer.innerHTML = '';
    await this._renderNode(this.paneTree, this.mainContainer);
    this.setActivePane(this.activePaneId);
  }

  async _renderNode(node, parentElement) {
    if (node.type === 'leaf') {
      const paneElement = document.createElement('div');
      paneElement.className = 'pane';
      paneElement.dataset.paneId = node.id;
      parentElement.appendChild(paneElement);

      const activeBuffer = node.buffers[node.activeBufferIndex];
      const gitClient = await this.getGitClient(activeBuffer.garden);
      
      const editor = new Editor({
        target: paneElement,
        gitClient: gitClient,
        commandPalette: window.thoughtform.commandPalette,
        initialFile: activeBuffer.path
      });
      
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
      const direction = node.type.split('-')[1];
      parentElement.style.display = 'grid';

      const [child1, child2] = node.children;
      const child1Element = document.createElement('div');
      child1Element.className = 'pane-container';
      const child2Element = document.createElement('div');
      child2Element.className = 'pane-container';

      const resizerElement = document.createElement('div');
      resizerElement.className = `pane-resizer pane-resizer-${direction}`;

      if (direction === 'vertical') {
        parentElement.style.gridTemplateColumns = `${node.splitPercentage}% auto 1fr`;
      } else {
        parentElement.style.gridTemplateRows = `${node.splitPercentage}% auto 1fr`;
      }

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
        if (direction === 'vertical') {
          const newPercentage = ((moveEvent.clientX - parentRect.left) / parentRect.width) * 100;
          node.splitPercentage = Math.max(10, Math.min(90, newPercentage));
          parent.style.gridTemplateColumns = `${node.splitPercentage}% auto 1fr`;
        } else {
          const newPercentage = ((moveEvent.clientY - parentRect.top) / parentRect.height) * 100;
          node.splitPercentage = Math.max(10, Math.min(90, newPercentage));
          parent.style.gridTemplateRows = `${node.splitPercentage}% auto 1fr`;
        }
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
    
    // Focus the editor in the newly active pane
    const activePane = this.panes.get(paneId);
    activePane?.editor?.editorView.focus();
    
    this._updateURL();
    window.thoughtform.sidebar?.refresh();
  }
  
  async splitPane(paneIdToSplit, direction) {
    // --- THIS IS THE FIX ---
    let newPaneId = null; // Variable to capture the ID of the new pane.

    const findAndSplit = (node) => {
        if (node.type === 'leaf' && node.id === paneIdToSplit) {
            newPaneId = `pane-${Date.now()}`; // Capture the new ID
            const newLeaf = JSON.parse(JSON.stringify(node)); // Deep copy buffer state
            newLeaf.id = newPaneId;
            
            return {
                type: `split-${direction}`,
                splitPercentage: 50,
                children: [ node, newLeaf ]
            };
        }
        if (node.type.startsWith('split-')) {
            node.children = node.children.map(child => findAndSplit(child));
        }
        return node;
    };
    
    this.paneTree = findAndSplit(this.paneTree);
    await this.render(); // Re-render the entire layout

    if (newPaneId) {
        this.setActivePane(newPaneId); // Explicitly set the new pane as active
    }
    // --- END OF FIX ---
  }
  
  async openFile(garden, path) {
    const activePaneInfo = this.getActivePaneInfo();
    if (!activePaneInfo) return;
    
    const { node, pane } = activePaneInfo;
    
    const existingBufferIndex = node.buffers.findIndex(b => b.garden === garden && b.path === path);

    if (existingBufferIndex !== -1) {
      node.activeBufferIndex = existingBufferIndex;
    } else {
      node.buffers.push({ garden, path });
      node.activeBufferIndex = node.buffers.length - 1;
    }

    const gitClient = await this.getGitClient(garden);
    pane.editor.gitClient = gitClient;
    await pane.editor.loadFile(path);
    
    this.setActivePane(this.activePaneId);
    this._updateURL();
  }

  _updateURL() {
      const info = this.getActivePaneInfo();
      if (!info) return;
      const activeBuffer = info.node.buffers[info.node.activeBufferIndex];
      
      const fullUrlPath = new URL(import.meta.url).pathname;
      const srcIndex = fullUrlPath.lastIndexOf('/src/');
      const basePath = srcIndex > -1 ? fullUrlPath.substring(0, srcIndex) : '';

      const newPathname = `${basePath}/${encodeURIComponent(activeBuffer.garden)}`;
      const newHash = `#${encodeURI(activeBuffer.path)}`;
      const newUrl = `${newPathname}${newHash}`;

      if (window.location.pathname !== newPathname || window.location.hash !== newHash) {
          window.history.pushState(null, '', newUrl);
      }
  }

  getActivePaneInfo() {
      if (!this.activePaneId) return null;
      let foundNode = null;
      const findNode = (node) => {
          if (node.type === 'leaf' && node.id === this.activePaneId) {
              foundNode = node;
          } else if (node.type.startsWith('split-')) {
              node.children.forEach(findNode);
          }
      };
      findNode(this.paneTree);
      
      const pane = this.panes.get(this.activePaneId);
      return (foundNode && pane) ? { node: foundNode, pane: pane } : null;
  }

  getActiveEditor() {
    const pane = this.panes.get(this.activePaneId);
    return pane ? pane.editor : null;
  }

  async getActiveGitClient() {
    const info = this.getActivePaneInfo();
    if (!info) return this.initialGitClient;
    const activeBuffer = info.node.buffers[info.node.activeBufferIndex];
    return await this.getGitClient(activeBuffer.garden);
  }
}

export function initializeWorkspaceManager(initialGitClient) {
  return new WorkspaceManager(initialGitClient);
}