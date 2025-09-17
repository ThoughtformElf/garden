import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const linkDecoration = Decoration.mark({ class: 'cm-naked-link' });

export const linkPlugin = ViewPlugin.fromClass(
  class {
    decorations;
    constructor(view) {
      this.decorations = this.findLinks(view);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.findLinks(update.view);
      }
    }
    findLinks(view) {
      const builder = new RangeSetBuilder();
      const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        let match;
        while ((match = linkRegex.exec(text))) {
          const line = view.state.doc.lineAt(from + match.index);
          if (/\[.*\]\(.*\)/.test(line.text)) {
            continue;
          }
          const start = from + match.index;
          const end = start + match[0].length;
          builder.add(start, end, linkDecoration);
        }
      }
      return builder.finish();
    }
  },
  { decorations: v => v.decorations }
);
