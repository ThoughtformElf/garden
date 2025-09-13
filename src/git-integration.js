import FS from '@isomorphic-git/lightning-fs';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';


const REPO_URL = 'https://github.com/thoughtforms/garden';
const CORS_PROXY = 'https://cors.isomorphic-git.org';

const fs = new FS('garden-fs');
const pfs = fs.promises;

let isCloned = false;

async function checkCloneStatus() {
  try {
    await pfs.stat('/.git');
    isCloned = true;
  } catch (e) {
    isCloned = false;
  }
  return isCloned;
}

export async function cloneRepo() {
  if (await checkCloneStatus()) {
    console.log('Repository already cloned.');
    return;
  }
  console.log('Cloning repository...');
  await git.clone({
    fs,
    http,
    dir: '/',
    url: REPO_URL,
    corsProxy: CORS_PROXY,
    singleBranch: true,
    depth: 10,
  });
  console.log('Clone complete.');
}

export async function readFile(filepath) {
  try {
    const content = await pfs.readFile(filepath, 'utf8');
    return content;
  } catch (e) {
    console.warn(`File not found: ${filepath}`);
    return `// File not found: ${filepath}`;
  }
}

export async function writeFile(filepath, content) {
  await pfs.writeFile(filepath, content, 'utf8');
}
