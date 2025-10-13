import { Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { executeFile } from './executor.js';
import { Git } from '../util/git-integration.js';
import { parse } from 'yaml';
import { appContextField } from '../editor/navigation.js';

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
        // THIS IS THE FIX (Part 1):
        // We now check that the `run` property *exists* (`hasOwnProperty`), even if its value is null or "".
        // This allows `run: null` to be a valid override instruction.
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
      const { key, run, sourceGarden } = binding;
      
      // THIS IS THE FIX (Part 2):
      // If `run` is null, "", or otherwise falsy, we explicitly treat it as a disabled
      // keybinding and return `null` so it can be filtered out.
      if (!run) {
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
    }).filter(Boolean); // This `filter(Boolean)` now correctly removes the disabled keymaps.

    return keymap.of(keyBindings);
  }
}