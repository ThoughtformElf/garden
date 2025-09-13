import { EditorView, basicSetup } from "codemirror";
import { vim, Vim } from "@replit/codemirror-vim";
import { LanguageDescription } from "@codemirror/language";
import { markdown } from "@codemirror/lang-markdown";
import { yamlFrontmatter } from "@codemirror/lang-yaml";
import {amy} from 'thememirror';

// Map "jj" to <Esc> in insert mode
Vim.map("jj", "<Esc>", "insert");

const initialDoc = `---
title: This Finally Works
tags: [codemirror, success]
---

# Hello, Correct Code!

This is a Markdown document with YAML frontmatter.

\`\`\`javascript
console.log('It works!');
\`\`\`

\`\`\`html
<div>Success</div>
\`\`\`
`;

// Define the markdown language extension with support for code blocks.
// We use dynamic imports for lazy loading, which is best practice.
const markdownLang = markdown({
  codeLanguages: [
    LanguageDescription.of({ name: "javascript", load: () => import("@codemirror/lang-javascript").then(m => m.javascript()) }),
    LanguageDescription.of({ name: "html", load: () => import("@codemirror/lang-html").then(m => m.html()) }),
    LanguageDescription.of({ name: "css", load: () => import("@codemirror/lang-css").then(m => m.css()) })
  ]
});

// Use the yamlFrontmatter function to combine YAML with the configured Markdown extension.
const mainLanguage = yamlFrontmatter({
  content: markdownLang
});

new EditorView({
  doc: initialDoc,
  extensions: [
    vim(),
    basicSetup,
    mainLanguage, // This single extension now correctly handles both frontmatter and markdown
    amy
  ],
  parent: document.querySelector(".editor"),
});
