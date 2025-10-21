import { Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { executeFile } from './executor.js';
import { Git } from '../util/git-integration.js';
import { parse } from 'yaml';
import { appContextField } from '../editor/navigation.js';
import { internalCommands } from '../editor/keymaps/internal-commands.js';

import defaultKeymapsYml from '../settings/keymaps.yml?raw';

export class KeymapService {
  constructor(editorView) {
    if (!editorView) {
      throw new Error("KeymapService requires an EditorView instance.");
    }
    this.editorView = editorView;
    this.keymapCompartment = new Compartment();
    this.currentKeymap = keymap.of([]);
  }

  getCompartment() {
    return this.keymapCompartment.of(this.currentKeymap);
  }

  async updateKeymaps() {
    const appContext = this.editorView.state.field(appContextField);
    if (!appContext || !appContext.gitClient) {
      console.warn('[KeymapService] Could not find gitClient in editor context. Cannot update keymaps.');
      return;
    }
    const currentGarden = appContext.gitClient.gardenName;

    const readKeymapFile = async (gardenName) => {
      try {
        const git = new Git(gardenName);
        await git.initRepo();
        const content = await git.pfs.readFile(`/settings/keymaps.yml`, 'utf8');
        return parse(content);
      } catch (e) {
        return null;
      }
    };

    const hardcodedConfig = parse(defaultKeymapsYml) || [];
    const globalConfig = await readKeymapFile('Settings');
    const gardenConfig = currentGarden !== 'Settings'
      ? await readKeymapFile(currentGarden)
      : null;

    const mergedKeymap = new Map();
    const processConfig = (config, sourceGarden) => {
      if (!Array.isArray(config)) return;
      for (const binding of config) {
        if (binding && binding.key && binding.hasOwnProperty('run')) {
          mergedKeymap.set(binding.key, { ...binding, sourceGarden });
        }
      }
    };

    processConfig(hardcodedConfig, 'Settings');
    processConfig(globalConfig, 'Settings');
    processConfig(gardenConfig, currentGarden);

    const finalConfig = Array.from(mergedKeymap.values());
    const newKeymapExtension = this._buildKeymapExtension(finalConfig);

    if (this.currentKeymap !== newKeymapExtension && this.editorView && !this.editorView.isDestroyed) {
      this.currentKeymap = newKeymapExtension;
      this.editorView.dispatch({
        effects: this.keymapCompartment.reconfigure(this.currentKeymap),
      });
    }
  }

  _buildKeymapExtension(config) {
    const keyBindings = config.map(binding => {
      let { key, run, sourceGarden } = binding;
      
      if (!run) {
        return null; // A null 'run' value disables the keybinding.
      }
      
      // Check for the "internal:" prefix to handle special, hardcoded commands.
      if (typeof run === 'string' && run.startsWith('internal:')) {
        const commandName = run.substring(9);
        const commandFn = internalCommands.get(commandName);
        if (commandFn) {
          return { key, run: commandFn };
        } else {
          console.warn(`[KeymapService] Unknown internal command: "${commandName}"`);
          return null;
        }
      }

      // Default behavior: treat 'run' as a path to a user script.
      const fullPath = `${sourceGarden}#${run}`;
      return {
        key: key,
        run: (view) => {
          const appContext = view.state.field(appContextField);
          if (appContext.editor && appContext.gitClient) {
            executeFile(fullPath, appContext.editor, appContext.gitClient);
          }
          return true; // Assume handled.
        },
      };
    }).filter(Boolean);

    return keymap.of(keyBindings);
  }
}