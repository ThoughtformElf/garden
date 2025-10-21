// This is the primary action script for the "Mod-Enter" keyboard shortcut.
// It intelligently determines what to do based on the cursor's context.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance, passed by the executor.
// 'git': The git client for the current garden, passed by the executor.
// 'event': Null for keymap-triggered events.

const view = editor.editorView;
const pos = view.state.selection.main.head;
const line = view.state.doc.lineAt(pos);

/**
 * Robustly checks if the cursor position is within or immediately after a response block.
 * This prevents new prompts from being added when interacting with agent output.
 * @param {EditorState} state - The current editor state.
 * @param {number} pos - The cursor position.
 * @returns {boolean} - True if the cursor is in a relevant context.
 */
function isCursorInAgentContext(state, pos) {
  const doc = state.doc;
  const textBefore = doc.sliceString(0, pos);
  
  const lastOpenTag = textBefore.lastIndexOf('<response>');
  const lastCloseTag = textBefore.lastIndexOf('</response>');

  // If the last thing we saw was an open tag, we are definitely inside.
  if (lastOpenTag > lastCloseTag) {
    return true;
  }
  
  // If the last thing we saw was a close tag, check if the cursor is still
  // on the same line or the line immediately following it. This prevents
  // adding a new prompt right after the agent finishes.
  if (lastCloseTag > lastOpenTag) {
    const closeTagLine = doc.lineAt(lastCloseTag).number;
    const cursorLine = doc.lineAt(pos).number;
    if (cursorLine <= closeTagLine + 1) {
      return true;
    }
  }

  return false;
}

// --- 1. AI Prompt Execution ---
// If the cursor is on a line that is an AI prompt, execute the AI request.
if (line.text.trim().startsWith('>$')) {
  console.log('[navigate-or-prompt] Triggering AI request.');
  window.thoughtform.ai.handleAiChatRequest(view);
  return; // Stop execution
}

// --- 2. Link Navigation ---
// Check for any type of link at the cursor's position.
const linkRegexes = [
  { type: 'wikilink', regex: /\[\[([^\[\]]+?)\]\]/g },
  { type: 'markdown', regex: /\[[^\]]*\]\(([^)]+)\)/g },
  { type: 'naked', regex: /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g },
];

for (const { type, regex } of linkRegexes) {
  let match;
  while ((match = regex.exec(line.text))) {
    const start = line.from + match.index;
    const end = start + match[0].length;

    if (pos >= start && pos <= end) {
      console.log(`[navigate-or-prompt] Found ${type} link. Navigating.`);
      if (type === 'wikilink') {
        // Use the new, clean method on the editor instance
        editor.navigateTo(match[1]);
      } else {
        let url = type === 'markdown' ? match[1] : match[0];
        if (url.startsWith('www.')) url = `https://${url}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return; // Stop execution
    }
  }
}

// --- 3. Inside Agent Response ---
// If the cursor is inside an agent's response block...
if (isCursorInAgentContext(view.state, pos)) {
  // ...check if an agent is actually running for this pane.
  const editorPaneId = editor.paneId;
  if (editorPaneId) {
    const controller = window.thoughtform.ai.activeAgentControllers.get(editorPaneId);
    if (controller) {
      // If an agent is running, cancel it.
      console.log('[navigate-or-prompt] Agent is running. Cancelling via Mod-Enter.');
      controller.abort();
      return; // Stop execution.
    }
  }
  // If no agent is running, just do nothing.
  console.log('[navigate-or-prompt] Cursor is inside a finished agent context. Doing nothing.');
  return; // Stop execution
}

// --- 4. Fallback: Insert New Prompt ---
// If no other context was matched, insert a new prompt at the end of the document.
console.log('[navigate-or-prompt] No other context found. Inserting new prompt.');
const doc = view.state.doc;
const endOfDoc = doc.length;
let insertText = `\n\n>$ `;

if (endOfDoc > 1) {
    const lastTwoChars = doc.sliceString(endOfDoc - 2, endOfDoc);
    if (lastTwoChars === '\n\n') {
        insertText = `>$ `;
    } else if (lastTwoChars.endsWith('\n')) {
        insertText = `\n>$ `;
    }
}

view.dispatch({
  changes: { from: endOfDoc, insert: insertText },
  selection: { anchor: endOfDoc + insertText.length },
  effects: view.constructor.scrollIntoView(endOfDoc + insertText.length, { y: "end" })
});