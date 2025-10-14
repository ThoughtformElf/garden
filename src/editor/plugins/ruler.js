import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

// Use Decoration.line() to apply a style to the entire line
const rulerDecoration = Decoration.line({ class: 'cm-hr' });

export const rulerPlugin = ViewPlugin.fromClass(
  class {
    decorations;

    constructor(view) {
      this.decorations = this.findRulers(view);
    }

    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.findRulers(update.view);
      }
    }

    findRulers(view) {
      const builder = new RangeSetBuilder();
      // Regex to find lines consisting of 3 or more hyphens, equals signs, or asterisks
      const rulerRegex = /^\s*([-=*_]){3,}\s*$/;

      for (const { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to) {
          const line = view.state.doc.lineAt(pos);
          if (rulerRegex.test(line.text)) {
            // Add the line decoration from the start of the line
            builder.add(line.from, line.from, rulerDecoration);
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
