// src/editor/status-bar.js
import { ViewPlugin } from '@codemirror/view';
import { Compartment } from '@codemirror/state';
import { countTokens } from 'gpt-tokenizer';
import debounce from 'lodash/debounce';

export const statusBarCompartment = new Compartment();

const statusBarPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.view = view;
      this.editor = Editor.editors.find(e => e.editorView === view);

      this.statusBar = document.createElement('div');
      this.statusBar.className = 'status-bar';

      this.filePathElement = document.createElement('span');
      this.filePathElement.className = 'status-bar-filepath';
      
      this.tokenCountElement = document.createElement('span');
      this.tokenCountElement.className = 'status-bar-token-count';

      this.statusBar.appendChild(this.filePathElement);
      this.statusBar.appendChild(this.tokenCountElement);

      if (view.dom.parentElement) {
        view.dom.parentElement.appendChild(this.statusBar);
      } else {
        console.error("Could not find a parent element for the editor view to attach the status bar.");
      }
      
      this.debouncedUpdate = debounce(this.updateAll.bind(this), 250);
      this.updateAll();
    }

    update(update) {
      // If the document content or file path has changed, trigger a debounced update
      if (update.docChanged || this.filePathElement.textContent !== this.getDisplayPath()) {
        this.debouncedUpdate();
      }
    }
    
    getDisplayPath() {
        if (!this.editor) return '...';
        const garden = this.editor.gitClient.gardenName;
        const path = this.editor.filePath || '/untitled';
        return `[${garden}] ${path}`;
    }

    updateAll() {
      if (!this.view.dom.isConnected) return; // Don't update if editor is gone
      
      // Update File Path
      this.filePathElement.textContent = this.getDisplayPath();
      
      // Update Token Count
      try {
        const text = this.view.state.doc.toString();
        const tokenCount = countTokens(text);
        this.tokenCountElement.textContent = `Tokens: ${tokenCount.toLocaleString()}`;
      } catch (error) {
        console.warn('Token counting error:', error);
        this.tokenCountElement.textContent = 'Tokens: Error';
      }
    }

    destroy() {
      this.debouncedUpdate.cancel();
      if (this.statusBar) {
        this.statusBar.remove();
      }
    }
  }
);

export function createStatusBarExtension() {
  return statusBarPlugin;
}