import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t, Tag } from '@lezer/highlight';

// Define a custom tag for hashtags
export const hashtagTag = Tag.define();

// A minimal dark theme for the editor chrome (background, gutters, selection, etc.)
// Updated to use CSS variables from the base palette.
const baseTheme = EditorView.theme({
  '&': {
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-background-primary)',
  },
  '.cm-content': {
    caretColor: 'var(--color-text-bright)',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: 'var(--color-text-bright)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--color-background-hover)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--color-background-primary)',
    color: 'var(--color-text-secondary)',
    border: 'none',
  },
}, { dark: true });


// A minimal syntax highlighting style for the text itself.
// This version adds a stable 'class' property to each rule, allowing you to
// target these tokens from external CSS for complex/nested styling.
const highlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: 'var(--base-accent-emphasis)', class: 'cm-keyword' },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: 'var(--base-accent-info)', class: 'cm-name' },
  { tag: [t.processingInstruction, t.string, t.inserted], color: 'var(--base-accent-emphasis)', class: 'cm-string' },
  { tag: [t.function(t.variableName), t.labelName], color: 'var(--base-accent-action)', class: 'cm-function' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: 'var(--base-accent-action)', class: 'cm-constant' },
  { tag: [t.definition(t.name), t.separator], color: 'var(--base-text-primary)', class: 'cm-definition' },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: 'var(--base-accent-action)', class: 'cm-type' },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: 'var(--base-text-primary)', class: 'cm-operator' },
  { tag: [t.meta, t.comment], color: 'var(--base-text-muted)', class: 'cm-comment' },
  { tag: hashtagTag, color: 'var(--base-accent-highlight)', fontStyle: 'italic', class: 'cm-hashtag' },
  { tag: t.strong, fontWeight: 'bold', class: 'cm-strong' },
  { tag: t.emphasis, fontStyle: 'italic', class: 'cm-emphasis' },
  { tag: t.strikethrough, textDecoration: 'line-through', class: 'cm-strikethrough' },
  { tag: t.link, color: 'var(--base-syntax-wikilink-bg)', textDecoration: 'underline', class: 'cm-link' },
  { tag: t.heading, fontWeight: 'bold', color: 'var(--base-accent-info)', class: 'cm-heading' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: 'var(--base-accent-action)', class: 'cm-atom' },
  { tag: t.invalid, color: 'var(--base-accent-destructive)', class: 'cm-invalid' },
]);


// Combine the base theme and the highlight style into a single extension.
export const basicDark = [
  baseTheme,
  syntaxHighlighting(highlightStyle)
];
