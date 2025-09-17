import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

// Use Decoration.line() to apply a style to the entire line
const blockquoteDecoration = Decoration.line({ class: 'cm-blockquote' });

export const blockquotePlugin = ViewPlugin.fromClass(
  class {
    decorations;

    constructor(view) {
      this.decorations = this.findBlockquotes(view);
    }

    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.findBlockquotes(update.view);
      }
    }

    findBlockquotes(view) {
      const builder = new RangeSetBuilder();
      // Regex to find lines starting with one or more '>' characters
      const blockquoteRegex = /^\s*>\s/;

      for (const { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to) {
          const line = view.state.doc.lineAt(pos);
          if (blockquoteRegex.test(line.text)) {
            // Add the line decoration from the start of the line
            builder.add(line.from, line.from, blockquoteDecoration);
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
