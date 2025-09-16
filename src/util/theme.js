import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t, Tag } from '@lezer/highlight';

// Define a custom tag for hashtags
export const hashtagTag = Tag.define();

// A minimal dark theme for the editor chrome (background, gutters, selection, etc.)
const baseTheme = EditorView.theme({
  '&': {
    color: '#ccc',
    backgroundColor: '#222',
  },
  '.cm-content': {
    caretColor: '#fff',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#fff',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#444',
  },
  '.cm-gutters': {
    backgroundColor: '#222',
    color: '#888',
    border: 'none',
  },
}, { dark: true });

// A minimal syntax highlighting style for the text itself
const highlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#CF8E6D' },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#9CDCFE' },
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#CE9178' },
  { tag: [t.function(t.variableName), t.labelName], color: '#DCDCAA' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#B5CEA8' },
  { tag: [t.definition(t.name), t.separator], color: '#D4D4D4' },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#4EC9B0' },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#D4D4D4' },
  { tag: [t.meta, t.comment], color: '#6A9955' },
  { tag: hashtagTag, color: '#C678DD', fontStyle: 'italic' }, // Style for #hashtags
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: '#6A9955', textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: '#569CD6' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#B5CEA8' },
  { tag: t.invalid, color: '#f00' },
]);

// Combine the base theme and the highlight style into a single extension.
export const basicDark = [
  baseTheme,
  syntaxHighlighting(highlightStyle)
];
