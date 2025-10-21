import { appContextField } from '../navigation.js';

/**
 * Robustly checks if the cursor position is within a <response>...</response> block
 * by scanning the document from the beginning up to the cursor's line.
 * @param {EditorState} state - The current editor state.
 * @param {number} pos - The cursor position.
 * @returns {boolean} - True if the cursor is inside a response block.
 */
function isCursorInResponseBlock(state, pos) {
  const doc = state.doc;
  const cursorLine = doc.lineAt(pos).number;
  let inResponse = false;

  // Iterate from the start of the document up to the cursor's line to determine the current state.
  for (let i = 1; i <= cursorLine; i++) {
    const line = doc.line(i);
    const lineText = line.text.trim();

    if (lineText.includes('<response>')) {
      inResponse = true;
    }
    // A closing tag on the same line or any previous line will turn it off,
    // unless a new one has started.
    if (lineText.includes('</response>')) {
      inResponse = false;
    }
  }
  return inResponse;
}

/**
 * The command logic for cancelling a running AI agent.
 * This is exported so it can be used by the internal command system.
 * @param {EditorView} view - The CodeMirror EditorView instance.
 * @returns {boolean} - True if the event was handled, false otherwise.
 */
export function command(view) {
  console.log('[Cancel Keymap] "Mod-c" detected. Running command...');
  const pos = view.state.selection.main.head;
  
  const inBlock = isCursorInResponseBlock(view.state, pos);
  console.log(`[Cancel Keymap] Is cursor in a response block? -> ${inBlock}`);
  
  // Check if the cursor is inside a <response> block.
  if (inBlock) {
    const appContext = view.state.field(appContextField);
    const editor = appContext.editor;

    if (editor && editor.paneId) {
      console.log(`[Cancel Keymap] Checking for active agent in pane: ${editor.paneId}`);
      const controller = window.thoughtform.ai.activeAgentControllers.get(editor.paneId);
      
      if (controller) {
        console.log(`[Cancel Keymap] SUCCESS: Found active agent. Sending abort signal.`);
        controller.abort();
        return true; // We handled the event; stop the "copy" action.
      } else {
        console.log('[Cancel Keymap] No active agent found for this pane.');
      }
    } else {
      console.log('[Cancel Keymap] Could not get editor or paneId from context.');
    }
  }
  
  // If we are not in a response block, or if there's no active agent,
  // return false to let the default copy action proceed.
  console.log('[Cancel Keymap] Condition not met. Allowing default "copy" action.');
  return false;
}