// Import the actual command logic from its dedicated file within the editor's keymaps directory.
import { command as cancelAgentCommand } from './cancel-agent.js';

/**
 * A map of internal, hardcoded commands that can be triggered by the KeymapService.
 * This registry simply maps a name to an imported function. The logic for each
 * command lives in its own file to maintain modularity.
 */
export const internalCommands = new Map([
  ['cancel-agent', cancelAgentCommand],
  // Other internal commands could be imported and added here in the future.
]);