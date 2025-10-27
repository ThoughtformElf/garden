import { Editor } from '../editor/editor.js';

export class WorkspaceRenderer {
  constructor(workspace) {
    this.workspace = workspace;
  }

  /**
   * Performs a smart, full render. It reuses existing editor instances
   * to avoid performance bottlenecks, detaching them and re-attaching
   * them to a newly created pane structure.
   */
  async render() {
    // 1. Detach existing editor DOM elements without destroying them
    this.workspace.panes.forEach(({ editor }) => {
      if (editor && editor.editorView && editor.editorView.dom.parentElement) {
        editor.editorView.dom.remove();
      }
    });

    // 2. Clear the old grid structure
    this.workspace.mainContainer.innerHTML = '';
    
    // 3. Rebuild the grid structure from the paneTree and re-attach editors
    await this._renderNode(this.workspace.paneTree, this.workspace.mainContainer);
    
    // 4. Finalize the state
    this.workspace.setActivePane(this.workspace.activePaneId);
  }

  /**
   * A lightweight, non-destructive layout update. Use for resizing operations
   * like maximizing, which only change percentages.
   */
  updateLayout() {
    this._syncNodeStyles(this.workspace.paneTree, this.workspace.mainContainer);
  }

  _syncNodeStyles(node, element) {
    if (!element || !node) return;

    if (node.type.startsWith('split-')) {
      const direction = node.type.split('-')[1];
      if (direction === 'vertical') {
        element.style.gridTemplateColumns = `${node.splitPercentage}% auto 1fr`;
      } else {
        element.style.gridTemplateRows = `${node.splitPercentage}% auto 1fr`;
      }
      
      if (element.children.length === 3) {
        this._syncNodeStyles(node.children[0], element.children[0]);
        this._syncNodeStyles(node.children[1], element.children[2]);
      }
    }
  }

  async _renderNode(node, parentElement) {
    if (!node) return; // --- THIS IS THE FIX for the rendering crash ---

    if (node.type === 'leaf') {
      const paneElement = document.createElement('div');
      paneElement.className = 'pane';
      paneElement.dataset.paneId = node.id;
      parentElement.appendChild(paneElement);

      let editor = this.workspace.panes.get(node.id)?.editor;

      if (editor) {
        // Re-attach the existing editor's DOM
        paneElement.appendChild(editor.editorView.dom);
        this.workspace.panes.set(node.id, { element: paneElement, editor: editor });
      } else {
        // Create a new editor if it doesn't exist
        const activeBuffer = node.buffers[node.activeBufferIndex];
        const gitClient = await this.workspace.getGitClient(activeBuffer.garden);
        
        editor = new Editor({
          target: paneElement,
          gitClient: gitClient,
          commandPalette: window.thoughtform.commandPalette,
          initialFile: activeBuffer.path,
          paneId: node.id
        });
        
        await new Promise(resolve => {
          const check = setInterval(() => { if (editor.isReady) { clearInterval(check); resolve(); } }, 50);
        });

        this.workspace.panes.set(node.id, { element: paneElement, editor: editor });
        
        const savedState = this.workspace.initialEditorStates[node.id];
        if (savedState) {
            editor.restoreState(savedState);
        }
      }

      paneElement.addEventListener('click', () => {
        this.workspace.setActivePane(node.id);
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
      this.workspace.isResizing = true;
      const overlay = document.getElementById('resize-overlay');
      overlay.style.display = 'block';
      overlay.style.cursor = direction === 'vertical' ? 'col-resize' : 'row-resize';

      const handleMove = (moveEvent) => {
        if (!this.workspace.isResizing) return;
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
        this.workspace.isResizing = false;
        overlay.style.display = 'none';
        overlay.style.cursor = 'default';
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', endResize);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', endResize);
        this.workspace._stateManager.saveState();
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', endResize);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', endResize);
    };
    resizer.addEventListener('mousedown', startResize);
    resizer.addEventListener('touchstart', startResize, { passive: false });
  }
}