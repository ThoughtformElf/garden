import { StateField, Compartment } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import diff from 'fast-diff';

// Define the decoration style for inserted text
const addDecoration = Decoration.mark({ class: 'cm-diff-inserted' });

/**
 * Calculates decorations by comparing original content to the current document state.
 * This is the core logic that powers the diff view.
 * @param {string} originalContent The base content to compare against.
 * @param {EditorState} state The current editor state.
 * @returns {DecorationSet} A set of decorations to be applied.
 */
function calculateDecorations(originalContent, state) {
  const decorations = [];
  const currentContent = state.doc.toString();
  const changes = diff(originalContent, currentContent);
  
  let pos = 0;
  for (const [type, text] of changes) {
    if (type === diff.INSERT) {
      // Create a decoration range for the inserted text
      decorations.push(addDecoration.range(pos, pos + text.length));
    }
    // Always advance the position by the length of the text in the *current* document
    if (type !== diff.DELETE) {
      pos += text.length;
    }
  }
  
  // Use Decoration.set() with an array of ranges, which is the correct CM6 pattern.
  return Decoration.set(decorations);
}

/**
 * A compartment to hold the diff extension, allowing it to be added or removed dynamically.
 */
export const diffCompartment = new Compartment();

/**
 * Returns a StateField that provides diff decorations. This is the main extension export.
 * @param {string} originalContent - The base content for the diff.
 * @returns {StateField}
 */
export function createDiffExtension(originalContent) {
  return StateField.define({
    create(state) {
      return calculateDecorations(originalContent, state);
    },
    update(decorations, tr) {
      // If the document changed, recalculate the diff. Otherwise, just map existing decorations.
      if (tr.docChanged) {
        return calculateDecorations(originalContent, tr.state);
      }
      return decorations.map(tr.changes);
    },
    // Provide this field as a source of decorations for the editor view.
    provide: f => EditorView.decorations.from(f)
  });
}
