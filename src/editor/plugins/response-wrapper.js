import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const responseLineDecoration = Decoration.line({ class: 'cm-response-wrapper' });
const responseTagDecoration = Decoration.mark({ class: 'cm-response-tag' });

export const responseWrapperPlugin = ViewPlugin.fromClass(
  class {
    decorations;

    constructor(view) {
      this.decorations = this.findResponseBlocks(view);
    }

    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.findResponseBlocks(update.view);
      }
    }

    findResponseBlocks(view) {
      const builder = new RangeSetBuilder();
      const doc = view.state.doc;
      let inResponseBlock = false;

      // We iterate through the entire document line by line to maintain state,
      // but only add decorations if the line is within the visible ranges.
      // This is necessary for correctly parsing stateful blocks.
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        
        // Check if this line is visible before creating decorations for it.
        const isVisible = view.visibleRanges.some(r => r.from <= line.to && r.to >= line.from);

        if (line.text.trim() === '<response>') {
          inResponseBlock = true;
          if (isVisible) {
            builder.add(line.from, line.to, responseTagDecoration);
          }
          continue;
        }

        if (line.text.trim() === '</response>') {
          inResponseBlock = false;
          if (isVisible) {
            builder.add(line.from, line.to, responseTagDecoration);
          }
          continue;
        }

        if (inResponseBlock && isVisible) {
          builder.add(line.from, line.from, responseLineDecoration);
        }
      }
      return builder.finish();
    }
  },
  {
    decorations: v => v.decorations
  }
);