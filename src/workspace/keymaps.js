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
    if (!this.editor.gitClient) {
      return;
    }
    const currentGarden = this.editor.gitClient.gardenName;

    // Use the centralized config service to read configs
    const readKeymapFile = async (gardenName) => {
      // The get() method without a key returns the whole parsed file
      const { value, sourceGarden } = await window.thoughtform.config.get('keymaps.yml', null, gardenName);
      return value ? { config: value, sourceGarden: sourceGarden } : null;
    };

    const mergedKeymap = new Map();

    const processConfig = (result) => {
      if (!result || !Array.isArray(result.config)) return;
      for (const binding of result.config) {
        if (binding && binding.key && binding.hasOwnProperty('run')) {
          // Add the source garden to the binding object for the executor
          mergedKeymap.set(binding.key, { ...binding, sourceGarden: result.sourceGarden });
        }
      }
    };

    // 1. Load base configuration from Settings garden
    const globalResult = await readKeymapFile('Settings');
    processConfig(globalResult);
    
    // 2. Load and merge (override) with the current garden's configuration
    if (currentGarden !== 'Settings') {
      const gardenResult = await readKeymapFile(currentGarden);
      processConfig(gardenResult);
    }

    const finalConfig = Array.from(mergedKeymap.values());
    const newKeymapExtension = this._buildKeymapExtension(finalConfig);

    if (this.editor.editorView && !this.editor.editorView.isDestroyed) {
      this.currentKeymap = newKeymapExtension;
      this.editor.editorView.dispatch({
        effects: this.keymapCompartment.reconfigure(this.currentKeymap),
      });
    }
  }

  _buildKeymapExtension(config) {
    const keyBindings = config.map(binding => {
      const { key, run, sourceGarden } = binding;
      if (!run) return null;
      
      if (typeof run === 'string' && run.startsWith('internal:')) {
        const commandName = run.substring(9);
        const commandFn = internalCommands.get(commandName);
        if (commandFn) {
          return { key, run: commandFn };
        } else {
          return null;
        }
      }

      // The full path is now correctly determined by where the config file was found
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