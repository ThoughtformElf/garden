import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const hashtagDecoration = Decoration.mark({ class: 'cm-hashtag' });

export const hashtagPlugin = ViewPlugin.fromClass(
  class {
    decorations;
    constructor(view) {
      this.decorations = this.findHashtags(view);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.findHashtags(update.view);
      }
    }
    findHashtags(view) {
      const builder = new RangeSetBuilder();
      const hashtagRegex = /#[\w-]+/g;
      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        let match;
        while ((match = hashtagRegex.exec(text))) {
          const matchStart = from + match.index;
          const end = matchStart + match[0].length;
          const line = view.state.doc.lineAt(matchStart);
          if (matchStart > line.from) {
            const charBefore = view.state.doc.sliceString(matchStart - 1, matchStart);
            if (/\s/.test(charBefore) === false) continue;
          }
          const urlRegex = /https?:\/\/[^\s]+/g;
          let urlMatch,
            isInsideUrl = false;
          while ((urlMatch = urlRegex.exec(line.text))) {
            const urlStart = line.from + urlMatch.index;
            const urlEnd = urlStart + urlMatch[0].length;
            if (matchStart >= urlStart && end <= urlEnd) {
              isInsideUrl = true;
              break;
            }
          }
          if (isInsideUrl) continue;
          builder.add(matchStart, end, hashtagDecoration);
        }
      }
      return builder.finish();
    }
  },
  { decorations: v => v.decorations }
);
