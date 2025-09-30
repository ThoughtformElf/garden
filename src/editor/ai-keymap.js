// src/editor/ai-keymap.js
import { keymap } from '@codemirror/view';

export const aiChatKeymap = keymap.of([
  {
    key: 'Mod-Enter',
    run: (view) => {
      const pos = view.state.selection.main.head;
      const currentLine = view.state.doc.lineAt(pos);

      // Check if we are in the correct context (a blockquote).
      if (!currentLine.text.trim().startsWith('>')) {
        // If not, we do NOT handle this event. Let other keymaps (like link navigation) try.
        return false;
      }

      // If we ARE in a blockquote, we definitively handle this event.
      // We kick off the async AI logic and immediately return true.
      window.thoughtform.ai.handleAiChatRequest(view);
      
      return true;
    }
  }
]);