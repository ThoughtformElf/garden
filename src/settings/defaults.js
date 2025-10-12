// src/settings/defaults.js

// This file centralizes the list of default files for the 'Settings' garden.
// It is used by both the initial git repository setup and the 'Reset Default Settings'
// function in the dev tools to ensure they are always in sync.

import defaultInterfaceYml from './interface.yml?raw';
import defaultKeymapsYml from './keymaps.yml?raw';
import defaultNavigateOrPromptJs from './keymaps/navigate-or-prompt.js?raw';
import defaultToggleSidebarJs from './keymaps/toggle-sidebar.js?raw';
import defaultToggleDevtoolsJs from './keymaps/toggle-devtools.js?raw';
import defaultSearchFilesJs from './keymaps/search-files.js?raw';
import defaultExecuteCommandJs from './keymaps/execute-command.js?raw';
import defaultBrowserBackJs from './keymaps/browser-back.js?raw';
import defaultBrowserForwardJs from './keymaps/browser-forward.js?raw';
import defaultDuplicateFileJs from './keymaps/duplicate-current-file.js?raw';
import defaultNewFileJs from './keymaps/new-file.js?raw';
import defaultHookCreateJs from './hooks/create.js?raw';
import defaultHookLoadJs from './hooks/load.js?raw';
import defaultHookDeleteJs from './hooks/delete.js?raw';
import defaultSplitVerticalJs from './keymaps/split-pane-vertical.js?raw';
import defaultSplitHorizontalJs from './keymaps/split-pane-horizontal.js?raw';

export const defaultFiles = [
  ['/interface.yml', defaultInterfaceYml],
  ['/keymaps.yml', defaultKeymapsYml],
  ['/keymaps/navigate-or-prompt.js', defaultNavigateOrPromptJs],
  ['/keymaps/toggle-sidebar.js', defaultToggleSidebarJs],
  ['/keymaps/toggle-devtools.js', defaultToggleDevtoolsJs],
  ['/keymaps/search-files.js', defaultSearchFilesJs],
  ['/keymaps/execute-command.js', defaultExecuteCommandJs],
  ['/keymaps/browser-back.js', defaultBrowserBackJs],
  ['/keymaps/browser-forward.js', defaultBrowserForwardJs],
  ['/keymaps/duplicate-current-file.js', defaultDuplicateFileJs],
  ['/keymaps/new-file.js', defaultNewFileJs],
  ['/keymaps/split-pane-vertical.js', defaultSplitVerticalJs],
  ['/keymaps/split-pane-horizontal.js', defaultSplitHorizontalJs],
  ['/hooks/create.js', defaultHookCreateJs],
  ['/hooks/load.js', defaultHookLoadJs],
  ['/hooks/delete.js', defaultHookDeleteJs]
];