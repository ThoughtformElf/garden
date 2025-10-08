// src/keymaps.js
import { Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { executeFile } from './executor.js';

export class KeymapService {
  constructor(editorView) {
    this.editorView = editorView;
    this.keymapCompartment = new Compartment();
    this.currentKeymap = [];
  }

  /**
   * Initializes the service and returns the initial CodeMirror extension.
   */
  async initialize() {
    await this.updateKeymaps();
    // The compartment's extension is returned to be included in the editor setup.
    return this.keymapCompartment.of(this.currentKeymap);
  }

  /**
   * Reads the configuration, builds the keymap, and updates the editor if changed.
   */
  async updateKeymaps() {
    console.log('[KeymapService] Updating keymaps...');
    const keymapConfig = await window.thoughtform.config.get('keymaps.yml');

    if (!Array.isArray(keymapConfig)) {
      console.error('[KeymapService] Invalid keymap configuration. Expected an array.');
      return;
    }

    const newKeymapExtension = this._buildKeymapExtension(keymapConfig);

    // Only dispatch an update if the keymap has actually changed.
    // For now, we'll just update every time. A deep-diff could optimize this.
    this.currentKeymap = newKeymapExtension;
    this.editorView.dispatch({
      effects: this.keymapCompartment.reconfigure(this.currentKeymap),
    });

    console.log('[KeymapService] Keymaps updated.');
  }

  /**
   * Translates the YAML config into a CodeMirror keymap extension.
   * @param {Array<object>} config - The parsed keymap.yml content.
   * @returns {import('@codemirror/state').Extension}
   */
  _buildKeymapExtension(config) {
    const keyBindings = config.map(binding => {
      if (!binding.key || !binding.run) {
        return null; // Skip invalid entries
      }
      
      return {
        key: binding.key,
        run: () => {
          // The 'run' function calls our Universal Executor.
          // This is an async function, but we return 'true' immediately
          // to let CodeMirror know the event has been handled.
          executeFile(
            binding.run,
            window.thoughtform.editor,
            window.thoughtform.editor.gitClient
          );
          return true;
        },
      };
    }).filter(Boolean); // Filter out any null (invalid) entries

    return keymap.of(keyBindings);
  }
}