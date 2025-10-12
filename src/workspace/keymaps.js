import { Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { executeFile } from './executor.js';

export class KeymapService {
  constructor(editorView) {
    this.editorView = editorView;
    this.keymapCompartment = new Compartment();
    // Initialize with an empty keymap. This is what the editor will use for its initial render.
    this.currentKeymap = keymap.of([]);
  }

  /**
   * Returns the compartment extension for the initial editor setup.
   */
  getCompartment() {
    return this.keymapCompartment.of(this.currentKeymap);
  }

  /**
   * Reads the configuration, builds the keymap, and updates the editor if changed.
   * This is now called *after* the initial render.
   */
  async updateKeymaps() {
    const { value: keymapConfig, sourceGarden } = await window.thoughtform.config.get('keymaps.yml');

    if (!Array.isArray(keymapConfig)) {
      console.error('[KeymapService] Invalid keymap configuration. Expected an array.');
      return;
    }

    const newKeymapExtension = this._buildKeymapExtension(keymapConfig, sourceGarden);

    this.currentKeymap = newKeymapExtension;
    this.editorView.dispatch({
      effects: this.keymapCompartment.reconfigure(this.currentKeymap),
    });
  }

  _buildKeymapExtension(config, sourceGarden) {
    const keyBindings = config.map(binding => {
      if (!binding.key || !binding.run) {
        return null;
      }
      
      let fullPath = binding.run;
      if (!fullPath.includes('#') && sourceGarden) {
        fullPath = `${sourceGarden}#${fullPath}`;
      }

      return {
        key: binding.key,
        run: () => {
          const editor = window.thoughtform.workspace.getActiveEditor();
          const git = window.thoughtform.workspace.getActiveGitClient();
          if (editor && git) {
            executeFile(fullPath, editor, git);
          }
          return true;
        },
      };
    }).filter(Boolean);

    return keymap.of(keyBindings);
  }
}