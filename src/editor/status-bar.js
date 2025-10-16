import { ViewPlugin } from '@codemirror/view';
import { Compartment } from '@codemirror/state';
import { countTokens } from 'gpt-tokenizer';
import debounce from 'lodash/debounce';
import { appContextField } from './navigation.js'; // Import the context field

export const statusBarCompartment = new Compartment();

export const statusBarPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.view = view;

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
      
      this.debouncedUpdate = debounce(this.updateAll.bind(this), 100);
      this.updateAll();
    }

    update(update) {
      // Any change to the view (doc, selection, etc.) should trigger a potential update.
      // The debounce will prevent it from being too noisy.
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.debouncedUpdate();
      }
    }
    
    // --- THIS IS THE FIX ---
    getDisplayPath() {
        // Read the context directly from the editor's state field.
        const appContext = this.view.state.field(appContextField);
        if (!appContext || !appContext.editor) return '...';
        
        const garden = appContext.editor.gitClient.gardenName;
        const path = appContext.editor.filePath || '/untitled';
        return `[${garden}] ${path}`;
    }

    updateAll() {
      if (!this.view.dom.isConnected) return;
      
      const newPath = this.getDisplayPath();
      // Only update the DOM if the text content has actually changed.
      if (this.filePathElement.textContent !== newPath) {
        this.filePathElement.textContent = newPath;
      }
      
      try {
        const text = this.view.state.doc.toString();
        const tokenCount = countTokens(text);
        const tokenText = `Tokens: ${tokenCount.toLocaleString()}`;
        if (this.tokenCountElement.textContent !== tokenText) {
          this.tokenCountElement.textContent = tokenText;
        }
      } catch (error) {
        // Don't spam the console, just show an error state.
        this.tokenCountElement.textContent = 'Tokens: Error';
      }
    }
    // --- END OF FIX ---

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