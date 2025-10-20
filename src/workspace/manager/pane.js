export class PaneManager {
  constructor(workspace) {
    this.workspace = workspace;
    this.isMaximized = false;
  }

  splitPane(paneIdToSplit, direction) {
    if (this.isMaximized) this.toggleMaximizePane();

    let newPaneId = null; 

    const generateScratchpadPath = () => {
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const randomKey = Math.random().toString(36).substring(2, 6);
        const timestamp = `${year}${month}${day}-${hours}${minutes}`;
        return `/scratchpad/${timestamp}`;
    };

    const findAndSplit = (node) => {
        if (node.type === 'leaf' && node.id === paneIdToSplit) {
            newPaneId = `pane-${Date.now()}`;
            const currentGarden = node.buffers[node.activeBufferIndex].garden;
            
            const newLeaf = {
                type: 'leaf',
                id: newPaneId,
                activeBufferIndex: 0,
                buffers: [{ garden: currentGarden, path: generateScratchpadPath() }]
            };
            
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
    
    this.workspace.paneTree = findAndSplit(this.workspace.paneTree);
    this.workspace.render().then(() => {
        if (newPaneId) {
            this.workspace.setActivePane(newPaneId); 
        }
    });
  }

  closeActivePane() {
    if (this.isMaximized) this.toggleMaximizePane();
    const panes = this._getPaneList();
    if (panes.length <= 1) {
        return;
    }

    const currentIndex = panes.findIndex(p => p.id === this.workspace.activePaneId);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + 1) % panes.length;
    const nextActivePaneId = panes[nextIndex === currentIndex ? 0 : nextIndex].id;

    const findAndRemove = (node) => {
        if (!node || node.type === 'leaf') {
            return node;
        }
        const childIndexToRemove = node.children.findIndex(child => child.id === this.workspace.activePaneId);
        if (childIndexToRemove !== -1) {
            return node.children[1 - childIndexToRemove];
        }
        node.children = node.children.map(child => findAndRemove(child)).filter(Boolean);
        return node.children.length === 1 ? node.children[0] : node;
    };

    this.workspace.paneTree = findAndRemove(this.workspace.paneTree);
    
    this.workspace.render().then(() => {
        this.workspace.setActivePane(nextActivePaneId);
    });
  }

  selectNextPane() {
    const panes = this._getPaneList();
    const currentIndex = panes.findIndex(p => p.id === this.workspace.activePaneId);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % panes.length;
    this.workspace.setActivePane(panes[nextIndex].id);
  }
  
  selectPrevPane() {
    const panes = this._getPaneList();
    const currentIndex = panes.findIndex(p => p.id === this.workspace.activePaneId);
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + panes.length) % panes.length;
    this.workspace.setActivePane(panes[prevIndex].id);
  }
  
  movePaneUp() { this._findAndSwap('up'); }
  movePaneDown() { this._findAndSwap('down'); }

  toggleMaximizePane() {
    if (this.isMaximized) {
      this._applyRestore(this.workspace.paneTree);
    } else {
      this._applyMaximize(this.workspace.paneTree, this.workspace.activePaneId);
    }
    this.isMaximized = !this.isMaximized;
    this.workspace.updateLayout(); // Use the fast layout update
    this.workspace._stateManager.saveState();
  }
  
  _isDescendant(node, paneId) {
    if (node.type === 'leaf') {
      return node.id === paneId;
    }
    if (node.type.startsWith('split-')) {
      return this._isDescendant(node.children[0], paneId) || this._isDescendant(node.children[1], paneId);
    }
    return false;
  }

  _applyMaximize(node, activePaneId) {
    if (!node || node.type === 'leaf') return;

    if (node.type.startsWith('split-')) {
      node.originalSplitPercentage = node.splitPercentage;
      if (this._isDescendant(node.children[0], activePaneId)) {
        node.splitPercentage = 99.5;
      } else if (this._isDescendant(node.children[1], activePaneId)) {
        node.splitPercentage = 0.5;
      }
      this._applyMaximize(node.children[0], activePaneId);
      this._applyMaximize(node.children[1], activePaneId);
    }
  }

  _applyRestore(node) {
    if (!node || node.type === 'leaf') return;
    
    if (node.type.startsWith('split-')) {
      if (typeof node.originalSplitPercentage === 'number') {
        node.splitPercentage = node.originalSplitPercentage;
        delete node.originalSplitPercentage;
      }
      this._applyRestore(node.children[0]);
      this._applyRestore(node.children[1]);
    }
  }

  getActivePaneInfo() {
    if (!this.workspace.activePaneId) return null;
    let foundNode = null;
    const findNode = (node) => {
        if (node.type === 'leaf' && node.id === this.workspace.activePaneId) {
            foundNode = node;
        } else if (node.type.startsWith('split-')) {
            node.children.forEach(findNode);
        }
    };
    findNode(this.workspace.paneTree);
    
    const pane = this.workspace.panes.get(this.workspace.activePaneId);
    return (foundNode && pane) ? { node: foundNode, pane: pane } : null;
  }
  
  _getPaneList() {
    const paneList = [];
    const traverse = (node) => {
        if (node.type === 'leaf') {
            paneList.push(node);
        } else if (node.type.startsWith('split-')) {
            node.children.forEach(traverse);
        }
    };
    traverse(this.workspace.paneTree);
    return paneList;
  }
  
  /**
   * Rebuilds the pane tree structure using a new, ordered list of leaf panes.
   * This is the core of the robust swapping logic. It preserves the split
   * structure while re-populating it with panes in the desired order.
   * @param {object} skeleton - A deep copy of the original tree structure.
   * @param {Array<object>} orderedPanes - The array of leaf panes in their new visual order.
   * @returns {object} The newly constructed pane tree.
   */
  _rebuildTreeWithNewOrder(skeleton, orderedPanes) {
    if (!skeleton) return null;
    if (skeleton.type === 'leaf') {
      // Pluck the next pane from the front of the ordered list.
      return orderedPanes.shift();
    }
    if (skeleton.type.startsWith('split-')) {
      skeleton.children = skeleton.children.map(child => this._rebuildTreeWithNewOrder(child, orderedPanes));
    }
    return skeleton;
  }

  _findAndSwap(direction) {
    if (this.isMaximized) this.toggleMaximizePane();

    const panes = this._getPaneList();
    if (panes.length < 2) return;

    const currentIndex = panes.findIndex(p => p.id === this.workspace.activePaneId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Prevent moving past the beginning or end of the list.
    if (targetIndex < 0 || targetIndex >= panes.length) {
      return; 
    }

    // 1. Create the new, desired visual order by swapping in the flat list.
    [panes[currentIndex], panes[targetIndex]] = [panes[targetIndex], panes[currentIndex]];
    
    // 2. Rebuild the master paneTree data model to match this new order.
    // We use a deep copy of the current tree as a "skeleton" to fill in.
    const skeleton = JSON.parse(JSON.stringify(this.workspace.paneTree));
    this.workspace.paneTree = this._rebuildTreeWithNewOrder(skeleton, panes);

    // 3. Trigger the fast, non-destructive render.
    this.workspace.render().then(() => {
        // 4. Ensure focus is maintained.
        const activeEditor = this.workspace.getActiveEditor();
        if (activeEditor) {
            activeEditor.editorView.focus();
        }
    });
  }
}