// src/settings/defaults.js

import defaultInterfaceYml from './interface.yml?raw';
import defaultKeymapsYml from './keymaps.yml?raw';
import defaultNavigateOrPromptJs from './keymaps/navigate-or-prompt.js?raw';
import defaultToggleSidebarJs from './keymaps/toggle-sidebar.js?raw';
import defaultToggleDevtoolsJs from './keymaps/toggle-devtools.js?raw';
import defaultSearchFilesJs from './keymaps/search-files.js?raw';
import defaultExecuteCommandJs from './keymaps/execute-command.js?raw';
import defaultGlobalSearchJs from './keymaps/global-search.js?raw';
import defaultBrowserBackJs from './keymaps/browser-back.js?raw';
import defaultBrowserForwardJs from './keymaps/browser-forward.js?raw';
import defaultDuplicateFileJs from './keymaps/duplicate-current-file.js?raw';
import defaultNewFileJs from './keymaps/new-file.js?raw';
import defaultHookCreateJs from './hooks/create.js?raw';
import defaultHookLoadJs from './hooks/load.js?raw';
import defaultHookDeleteJs from './hooks/delete.js?raw';
import defaultSplitVerticalJs from './keymaps/split-pane-vertical.js?raw';
import defaultSplitHorizontalJs from './keymaps/split-pane-horizontal.js?raw';
import defaultSelectNextPaneJs from './keymaps/select-next-pane.js?raw';
import defaultSelectPrevPaneJs from './keymaps/select-prev-pane.js?raw';
import defaultMovePaneUpJs from './keymaps/move-pane-up.js?raw';
import defaultMovePaneDownJs from './keymaps/move-pane-down.js?raw';
import defaultClosePaneJs from './keymaps/close-pane.js?raw';
import defaultQueryTestJs from './query/test.js?raw';

// --- AGENT DEFAULTS ---
import defaultSelectToolMd from './prompts/select-tool.md?raw';
import defaultCritiqueStepMd from './prompts/critique-step.md?raw';
import defaultSynthesizeAnswerMd from './prompts/synthesize-answer.md?raw';
import defaultBuildKnowledgeBaseJs from './tools/buildKnowledgeBase.js?raw';
import defaultReadURLJs from './tools/readURL.js?raw';


export const defaultFiles = [
  ['/settings/interface.yml', defaultInterfaceYml],
  ['/settings/keymaps.yml', defaultKeymapsYml],
  ['/settings/keymaps/navigate-or-prompt.js', defaultNavigateOrPromptJs],
  ['/settings/keymaps/toggle-sidebar.js', defaultToggleSidebarJs],
  ['/settings/keymaps/toggle-devtools.js', defaultToggleDevtoolsJs],
  ['/settings/keymaps/search-files.js', defaultSearchFilesJs],
  ['/settings/keymaps/execute-command.js', defaultExecuteCommandJs],
  ['/settings/keymaps/global-search.js', defaultGlobalSearchJs],
  ['/settings/keymaps/browser-back.js', defaultBrowserBackJs],
  ['/settings/keymaps/browser-forward.js', defaultBrowserForwardJs],
  ['/settings/keymaps/duplicate-current-file.js', defaultDuplicateFileJs],
  ['/settings/keymaps/new-file.js', defaultNewFileJs],
  ['/settings/keymaps/split-pane-vertical.js', defaultSplitVerticalJs],
  ['/settings/keymaps/split-pane-horizontal.js', defaultSplitHorizontalJs],
  ['/settings/keymaps/select-next-pane.js', defaultSelectNextPaneJs],
  ['/settings/keymaps/select-prev-pane.js', defaultSelectPrevPaneJs],
  ['/settings/keymaps/move-pane-up.js', defaultMovePaneUpJs],
  ['/settings/keymaps/move-pane-down.js', defaultMovePaneDownJs],
  ['/settings/keymaps/close-pane.js', defaultClosePaneJs],
  ['/settings/hooks/create.js', defaultHookCreateJs],
  ['/settings/hooks/load.js', defaultHookLoadJs],
  ['/settings/hooks/delete.js', defaultHookDeleteJs],
  ['/settings/query/test.js', defaultQueryTestJs],

  // --- AGENT DEFAULTS ---
  ['/settings/prompts/select-tool.md', defaultSelectToolMd],
  ['/settings/prompts/critique-step.md', defaultCritiqueStepMd],
  ['/settings/prompts/synthesize-answer.md', defaultSynthesizeAnswerMd],
  ['/settings/tools/buildKnowledgeBase.js', defaultBuildKnowledgeBaseJs],
  ['/settings/tools/readURL.js', defaultReadURLJs],
];