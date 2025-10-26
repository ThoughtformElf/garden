import { Git as GitCore } from './git/core.js';
import { gitStateActions } from './git/state.js';
import { gitBranchingActions } from './git/branching.js';
import { gitRemoteActions } from './git/remote.js';

// Combine all actions into the GitCore prototype
Object.assign(
  GitCore.prototype,
  gitStateActions,
  gitBranchingActions,
  gitRemoteActions
);

// Export the fully composed class as the main export
export const Git = GitCore;