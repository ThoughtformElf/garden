import { EditorView, basicSetup } from "codemirror";
import { EditorState } from '@codemirror/state';
import { vim, Vim } from "@replit/codemirror-vim";
import { LanguageDescription } from "@codemirror/language";
import { markdown } from "@codemirror/lang-markdown";
import { yamlFrontmatter } from "@codemirror/lang-yaml";
import debounce from 'lodash/debounce';
import {amy} from 'thememirror';

// Responsive font size theme
const createFontTheme = (size) => {
  return EditorView.theme({
    "&": {
      fontSize: size,
    },
    ".cm-scroller": {
      fontFamily: "monospace",
    }
  });
};
const isMobile = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
const editorFontSize = isMobile ? createFontTheme("2rem") : createFontTheme("1rem");

// Vim keybindings
Vim.map("jj", "<Esc>", "insert");

// Markdown language support with embedded JavaScript, HTML, and CSS
const markdownLang = markdown({
  codeLanguages: [
    LanguageDescription.of({ name: "javascript", load: () => import("@codemirror/lang-javascript").then(m => m.javascript()) }),
    LanguageDescription.of({ name: "html", load: () => import("@codemirror/lang-html").then(m => m.html()) }),
    LanguageDescription.of({ name: "css", load: () => import("@codemirror/lang-css").then(m => m.css()) })
  ]
});

// Combine YAML frontmatter with Markdown
const mainLanguage = yamlFrontmatter({ content: markdownLang });

export function createEditor(initialDoc, onUpdate) {
  const debouncedOnUpdate = debounce(onUpdate, 500);

  const updateListener = EditorView.updateListener.of(update => {
    if (update.docChanged) {
      const content = update.state.doc.toString();
      debouncedOnUpdate(content);
    }
  });

  return new EditorView({
    doc: initialDoc,
    extensions: [
      vim(),
      basicSetup,
      mainLanguage,
      updateListener,
      amy,
      editorFontSize,
    ],
    parent: document.querySelector(".editor"),
  });
}
