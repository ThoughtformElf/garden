import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const todoDecoration = Decoration.mark({ class: 'cm-checkbox-todo' });
const doneDecoration = Decoration.mark({ class: 'cm-checkbox-done' });
const doingDecoration = Decoration.mark({ class: 'cm-checkbox-doing' });

export const checkboxPlugin = ViewPlugin.fromClass(
  class {
    decorations;
    constructor(view) {
      this.decorations = this.findCheckboxes(view);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.findCheckboxes(update.view);
      }
    }
    findCheckboxes(view) {
      const builder = new RangeSetBuilder();
      const checkboxRegex = /^\s*(\[([ |x|-])\])/gm;
      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        let match;
        while ((match = checkboxRegex.exec(text))) {
          const content = match[2];
          const start = from + match.index + match[0].indexOf('[');
          const end = start + 3;
          if (content === ' ') builder.add(start, end, todoDecoration);
          else if (content === 'x') builder.add(start, end, doneDecoration);
          else if (content === '-') builder.add(start, end, doingDecoration);
        }
      }
      return builder.finish();
    }
  },
  { decorations: v => v.decorations }
);
