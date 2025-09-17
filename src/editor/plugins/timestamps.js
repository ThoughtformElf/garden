import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const timestampDecoration = Decoration.mark({ class: 'cm-timestamp' });

export const timestampPlugin = ViewPlugin.fromClass(
  class {
    decorations;
    constructor(view) {
      this.decorations = this.findTimestamps(view);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.findTimestamps(update.view);
      }
    }
    findTimestamps(view) {
      const builder = new RangeSetBuilder();
      const timestampRegex = /^\s*(?:>\s*)*(\d{4,})\s/gm;
      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        let match;
        while ((match = timestampRegex.exec(text))) {
          const fullMatch = match[0];
          const timestamp = match[1];
          const start = from + match.index + fullMatch.indexOf(timestamp);
          const end = start + timestamp.length;
          builder.add(start, end, timestampDecoration);
        }
      }
      return builder.finish();
    }
  },
  { decorations: v => v.decorations }
);
