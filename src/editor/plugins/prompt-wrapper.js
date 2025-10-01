// src/editor/plugins/prompt-wrapper.js
import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

// Use Decoration.line() to apply a style to the entire line
const promptDecoration = Decoration.line({ class: 'cm-prompt-wrapper' });

export const promptWrapperPlugin = ViewPlugin.fromClass(
  class {
    decorations;

    constructor(view) {
      this.decorations = this.findPrompts(view);
    }

    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.findPrompts(update.view);
      }
    }

    findPrompts(view) {
      const builder = new RangeSetBuilder();
      // Regex to find lines starting with '>$' (allowing for leading whitespace)
      const promptRegex = /^\s*>\$\s/;

      for (const { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to) {
          const line = view.state.doc.lineAt(pos);
          if (promptRegex.test(line.text)) {
            // Add the line decoration from the start of the line
            builder.add(line.from, line.from, promptDecoration);
          }
          pos = line.to + 1; // Move to the next line
        }
      }
      return builder.finish();
    }
  },
  {
    decorations: v => v.decorations
  }
);