import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const wikilinkDecoration = Decoration.mark({ class: 'cm-wikilink' });

export const wikilinkPlugin = ViewPlugin.fromClass(
  class {
    decorations;
    constructor(view) {
      this.decorations = this.findWikilinks(view);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.findWikilinks(update.view);
      }
    }
    findWikilinks(view) {
      const builder = new RangeSetBuilder();
      const wikilinkRegex = /\[\[([^\[\]]+?)\]\]/g;
      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        let match;
        while ((match = wikilinkRegex.exec(text))) {
          const start = from + match.index;
          const end = start + match[0].length;
          builder.add(start, end, wikilinkDecoration);
        }
      }
      return builder.finish();
    }
  },
  { decorations: v => v.decorations }
);
