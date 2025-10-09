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

  async initialize() {
    await this.updateKeymaps();
    return this.keymapCompartment.of(this.currentKeymap);
  }

  async updateKeymaps() {
    console.log('[KeymapService] Updating keymaps...');
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

    console.log('[KeymapService] Keymaps updated.');
  }

  _buildKeymapExtension(config, sourceGarden) {
    const keyBindings = config.map(binding => {
      if (!binding.key || !binding.run) {
        return null;
      }
      
      let fullPath = binding.run;
      // If the path is relative and we have a source garden, make it absolute.
      if (!fullPath.includes('#') && sourceGarden) {
        fullPath = `${sourceGarden}#${fullPath}`;
      }

      return {
        key: binding.key,
        run: () => {
          executeFile(
            fullPath, // Use the resolved, absolute path
            window.thoughtform.editor,
            window.thoughtform.editor.gitClient
          );
          return true;
        },
      };
    }).filter(Boolean);

    return keymap.of(keyBindings);
  }
}