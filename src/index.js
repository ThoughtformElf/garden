import { Buffer } from 'buffer';
window.Buffer = Buffer;

import { createEditor } from './editor.js';
import { cloneRepo, readFile, writeFile } from './git-integration.js';

async function main() {
  await cloneRepo();
  let filepath = window.location.pathname === '/' ? '/README.md' : window.location.pathname;
  const initialContent = await readFile(filepath);
  createEditor(initialContent, (newContent) => {
    writeFile(filepath, newContent);
  });
}

main();