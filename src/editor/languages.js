import { LanguageDescription, StreamLanguage } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { shell } from '@codemirror/legacy-modes/mode/shell';

// Define language extensions
const shellLang = StreamLanguage.define(shell);
const markdownLang = markdown({
  base: markdownLanguage,
  codeLanguages: [
    LanguageDescription.of({ name: 'javascript', load: () => Promise.resolve(javascript()) }),
    LanguageDescription.of({ name: 'html', load: () => Promise.resolve(html()) }),
    LanguageDescription.of({ name: 'css', load: () => Promise.resolve(css()) }),
  ],
});

/**
 * Determines the CodeMirror language extension based on file path.
 * @param {string} filepath - The path to the file.
 * @returns {import('@codemirror/state').Extension}
 */
export function getLanguageExtension(filepath) {
  const filename = filepath.split('/').pop();
  const extension = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';

  // Handle special filenames first
  switch (filename) {
    case '.gitignore':
    case '.npmrc':
    case '.editorconfig':
    case 'Dockerfile':
      return shellLang;
  }

  // Handle extensions
  switch (extension) {
    case 'js':
      return javascript();
    case 'css':
      return css();
    case 'html':
      return html();
    case 'json':
      return json();
    case 'xml':
      return xml();
    case 'yaml':
    case 'yml':
      return yaml();
    case 'sh':
    case 'bash':
    case 'zsh':
      return shellLang;
    default:
      // Default to Markdown for unknown extensions or files without extensions
      return markdownLang;
  }
}
