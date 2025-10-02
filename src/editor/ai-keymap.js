// src/editor/ai-keymap.js
import { keymap } from '@codemirror/view';

export const aiChatKeymap = keymap.of([
  {
    key: 'Mod-Enter',
    run: (view) => {
      const pos = view.state.selection.main.head;
      const currentLine = view.state.doc.lineAt(pos);

      // --- THIS IS THE FIX ---
      // The check is now more specific to the AI prompt '>$' instead of a generic blockquote '>'.
      // If the context does not match, it explicitly returns `false` to allow
      // the next keymap (link navigation) to handle the event.
      if (!currentLine.text.trim().startsWith('>$')) {
        // If not in an AI prompt context, we DO NOT handle this event.
        return false;
      }

      // If we ARE in an AI prompt, we definitively handle this event.
      // We kick off the async AI logic and immediately return true to stop other keymaps.
      window.thoughtform.ai.handleAiChatRequest(view);
      
      return true;
    }
  }
]);