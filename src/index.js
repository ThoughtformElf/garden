import { Buffer } from 'buffer';
window.Buffer = Buffer;

import { createEditor } from './editor.js';
import { cloneRepo, readFile, writeFile } from './git-integration.js';

async function main() {
  await cloneRepo();

  const base = import.meta.env.BASE_URL;
  const location = window.location.pathname;

  // This logic is now clean and works in both environments.
  const filepath = location.startsWith(base) ? location.slice(base.length - 1) : location;
  const finalFilepath = (filepath === '/' || filepath === '') ? '/README.md' : filepath;

  const initialContent = await readFile(finalFilepath);

  createEditor(initialContent, (newContent) => {
    writeFile(finalFilepath, newContent);
  });
}

main();