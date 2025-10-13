// src/editor/plugins/title-headings.js
import { ViewPlugin, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

// Decoration for the entire line to act as a container.
const titleHeadingLineDecoration = Decoration.line({ class: 'cm-title-heading-line' });

export const titleHeadingPlugin = ViewPlugin.fromClass(
  class {
    decorations;

    constructor(view) {
      this.decorations = this.findTitleHeadings(view);
    }

    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.findTitleHeadings(update.view);
      }
    }

    findTitleHeadings(view) {
      const builder = new RangeSetBuilder();
      const lineTitleRegex = /^#!\s.*$/; // Matches lines starting with '#!'
      
      // Regex to tokenize the line into different parts:
      // 1. The '#!' sigil
      // 2. An individual uppercase letter
      // 3. A sequence of lowercase letters
      // 4. A sequence of numbers
      // 5. A sequence of punctuation/symbols
      const tokenizerRegex = /(#!)|([A-Z])|([a-z]+)|(\d+)|([\p{P}\p{S}]+)/gu;

      for (const { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to) {
          const line = view.state.doc.lineAt(pos);

          if (lineTitleRegex.test(line.text)) {
            // Apply the line-level decoration for the container
            builder.add(line.from, line.from, titleHeadingLineDecoration);

            let match;
            while ((match = tokenizerRegex.exec(line.text))) {
              const [token, sigil, uppercase, lowercase, number, punctuation] = match;
              const start = line.from + match.index;
              const end = start + token.length;
              
              // Start with the base class for all tokens
              let classes = 'cm-title-heading-word'; 

              if (sigil) {
                classes += ' cm-title-heading-punctuation cm-title-heading-sigil';
              } else if (uppercase) {
                classes += ' cm-title-heading-uppercase';
              } else if (lowercase) {
                // No extra class needed for lowercase runs, base class is sufficient
              } else if (number) {
                classes += ' cm-title-heading-number';
              } else if (punctuation) {
                classes += ' cm-title-heading-punctuation';
              }
              
              // Create a decoration with all the relevant classes for this token
              const tokenDecoration = Decoration.mark({ class: classes });
              builder.add(start, end, tokenDecoration);
            }
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