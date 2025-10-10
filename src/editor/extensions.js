// src/editor/extensions.js
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';
import { lineNumbersRelative } from '@uiw/codemirror-extensions-line-numbers-relative';

import { basicDark } from '../util/theme.js';
import { allHighlightPlugins } from './plugins/index.js';
import { diffCompartment } from './diff.js';

/**
 * Creates the complete array of CodeMirror extensions for the editor.
 * @param {object} options - Configuration options for the extensions.
 * @param {object} options.appContext - The application context.
 * @param {object} options.dynamicKeymapExtension - The keymap compartment.
 * @param {object} options.vimCompartment - The vim compartment.
 * @param {object} options.languageCompartment - The language compartment.
 * @param {object} options.tokenCounterCompartment - The token counter compartment.
 * @param {Function} options.updateListener - The update listener.
 * @param {string} options.filePath - The initial file path.
 * @param {Function} options.getLanguageExtension - The function to get language extensions.
 * @param {Function} options.createTokenCounterExtension - The function to create the token counter.
 * @returns {Array} An array of CodeMirror extensions.
 */
export function createEditorExtensions({
  appContext,
  dynamicKeymapExtension,
  vimCompartment,
  languageCompartment,
  tokenCounterCompartment,
  updateListener,
  filePath,
  getLanguageExtension,
  createTokenCounterExtension
}) {
  return [
    appContext,
    dynamicKeymapExtension,
    vimCompartment.of([]),
    keymap.of([indentWithTab]),
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap
    ]),
    EditorView.lineWrapping,
    lineNumbersRelative,
    basicDark,
    languageCompartment.of(getLanguageExtension(filePath)),
    updateListener,
    ...allHighlightPlugins,
    diffCompartment.of([]),
    tokenCounterCompartment.of(createTokenCounterExtension()),
  ];
}