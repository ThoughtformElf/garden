import { Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { executeFile } from './executor.js';
import { Git } from '../util/git-integration.js';
import { parse } from 'yaml';
import { appContextField } from '../editor/navigation.js';
import { internalCommands } from '../editor/keymaps/internal-commands.js';

export class KeymapService {
  constructor(editor) {
    if (!editor) {
      throw new Error("KeymapService requires an Editor instance.");
    }
    this.editor = editor;
    this.keymapCompartment = new Compartment();
    this.currentKeymap = keymap.of([]);
  }

  getCompartment() {
    return this.keymapCompartment.of(this.currentKeymap);
  }

  async updateKeymaps() {
    if (!this.editor.editorView || this.editor.editorView.isDestroyed) {
      return;
    }

    const { value: finalConfig } = await window.thoughtform.config.get(
      'keymaps.yml',
      null,
      this.editor
    );
    
    const newKeymapExtension = this._buildKeymapExtension(finalConfig);

    if (this.editor.editorView && !this.editor.editorView.isDestroyed) {
      this.currentKeymap = newKeymapExtension;
      this.editor.editorView.dispatch({
        effects: this.keymapCompartment.reconfigure(this.currentKeymap),
      });
    }
  }

  _buildKeymapExtension(config) {
    if (!Array.isArray(config)) {
      return keymap.of([]);
    }
    const keyBindings = config.map(binding => {
      const { key, run, sourceGarden } = binding;
      if (!run || !sourceGarden) {
        return null;
      }
      
      if (typeof run === 'string' && run.startsWith('internal:')) {
        const commandName = run.substring(9);
        const commandFn = internalCommands.get(commandName);
        if (commandFn) {
          return { key, run: commandFn };
        }
        return null;
      }

      const fullPath = `${sourceGarden}#${run}`;
      return {
        key: key,
        run: (view) => {
          const appContext = view.state.field(appContextField);
          if (appContext.editor && appContext.gitClient) {
            executeFile(fullPath, appContext.editor, appContext.gitClient);
          }
          return true;
        },
      };
    }).filter(Boolean);

    return keymap.of(keyBindings);
  }
}