// src/workspace/pane-manager.js

export class PaneManager {
  constructor(workspace) {
    this.workspace = workspace;
  }

  splitPane(paneIdToSplit, direction) {
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
        return `/scratchpad/${timestamp}.md`;
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

  _findAndSwap(direction) {
    let parentNode = null;
    let nodeIndex = -1;

    const findParent = (node) => {
        if (node.type.startsWith('split-')) {
            const index = node.children.findIndex(child => child.id === this.workspace.activePaneId);
            if (index !== -1) {
                parentNode = node;
                nodeIndex = index;
                return;
            }
            node.children.forEach(findParent);
        }
    };
    findParent(this.workspace.paneTree);

    if (parentNode) {
      if (direction === 'up' && nodeIndex > 0) {
        [parentNode.children[nodeIndex], parentNode.children[nodeIndex - 1]] = [parentNode.children[nodeIndex - 1], parentNode.children[nodeIndex]];
        this.workspace.render();
      } else if (direction === 'down' && nodeIndex < parentNode.children.length - 1) {
        [parentNode.children[nodeIndex], parentNode.children[nodeIndex + 1]] = [parentNode.children[nodeIndex + 1], parentNode.children[nodeIndex]];
        this.workspace.render();
      }
    }
  }
}