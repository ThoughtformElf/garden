import { EditorView, basicSetup } from "codemirror";
import { vim, Vim } from "@replit/codemirror-vim";
import { LanguageDescription } from "@codemirror/language";
import { markdown } from "@codemirror/lang-markdown";
import { yamlFrontmatter } from "@codemirror/lang-yaml";
import debounce from 'lodash/debounce';
import {amy} from 'thememirror';

Vim.map("jj", "<Esc>", "insert");

const markdownLang = markdown({
  codeLanguages: [
    LanguageDescription.of({ name: "javascript", load: () => import("@codemirror/lang-javascript").then(m => m.javascript()) }),
    LanguageDescription.of({ name: "html", load: () => import("@codemirror/lang-html").then(m => m.html()) }),
    LanguageDescription.of({ name: "css", load: () => import("@codemirror/lang-css").then(m => m.css()) })
  ]
});

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
    ],
    parent: document.querySelector(".editor"),
  });
}
