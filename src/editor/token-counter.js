import { ViewPlugin } from '@codemirror/view';
import { Compartment } from '@codemirror/state';
import { countTokens } from 'gpt-tokenizer';
import debounce from 'lodash/debounce';

// Compartment to allow dynamically enabling/disabling the token counter
export const tokenCounterCompartment = new Compartment();

// A self-contained ViewPlugin to manage the token counter status bar
const tokenCounterPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.view = view;

      // Create the status bar element
      this.statusBar = document.createElement('div');
      this.statusBar.className = 'token-status-bar';
      this.countElement = document.createElement('span');
      this.countElement.className = 'token-count';
      this.statusBar.appendChild(this.countElement);

      // --- THIS IS THE FIX ---
      // Append the status bar to the editor's direct parent (the .pane element)
      // instead of the global <main> container. This ensures each pane has its own
      // status bar and doesn't interfere with the main grid layout.
      if (view.dom.parentElement) {
        view.dom.parentElement.appendChild(this.statusBar);
      } else {
        console.error("Could not find a parent element for the editor view to attach the status bar.");
      }
      // --- END OF FIX ---
      
      // Debounce the update function to avoid performance issues
      this.debouncedUpdate = debounce(this.updateTokenCount.bind(this), 250);

      // Perform an initial count
      this.updateTokenCount();
    }

    update(update) {
      // If the document content has changed, trigger a debounced update
      if (update.docChanged) {
        this.debouncedUpdate();
      }
    }

    updateTokenCount() {
      try {
        const text = this.view.state.doc.toString();
        // Use the countTokens function from gpt-tokenizer
        const tokenCount = countTokens(text);
        this.countElement.textContent = `Tokens: ${tokenCount.toLocaleString()}`;
      } catch (error) {
        console.warn('Token counting error:', error);
        this.countElement.textContent = 'Tokens: Error';
      }
    }

    destroy() {
      // Clean up the DOM element and cancel any pending updates
      this.debouncedUpdate.cancel();
      if (this.statusBar) {
        this.statusBar.remove();
      }
    }
  }
);

/**
 * Factory function to create the token counter extension.
 * This is what you'll add to the editor's configuration.
 */
export function createTokenCounterExtension() {
  return tokenCounterPlugin;
}