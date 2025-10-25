import { Git } from '../../util/git-integration.js';
import { Traversal } from '../traversal.js';

const toolCache = new Map();

function parseToolMetadata(code) {
  // This regex finds ALL comment blocks, both multiline (/* ... */)
  // and single-line (// ...), anywhere in the file.
  const allCommentsRegex = /\/\*[\s\S]*?\*\/|\/\/.*/g;
  const commentMatches = code.match(allCommentsRegex);

  if (!commentMatches) {
    // Return an empty description if no comments are found.
    return '';
  }

  // Join all found comments into a single block of text.
  const allCommentsText = commentMatches.join('\n');
  
  // Clean the entire concatenated comment block for the LLM.
  const description = allCommentsText
    .replace(/^\s*\/\*+\s*?/gm, '') // remove "/*"
    .replace(/^\s*\*+\/\s*?$/gm, '') // remove "*/" on its own line
    .replace(/\*\/$/, '')           // remove "*/" at the end of a line
    .replace(/^\s*\*\s?/gm, '')      // remove leading "*" on each line
    .replace(/^\s*\/\/\s?/gm, '')    // remove "//"
    .trim();

  return description;
}


async function loadTool(toolPath, contextGarden) {
  const cacheKey = `${contextGarden}#${toolPath}`;
  if (toolCache.has(cacheKey)) {
    return toolCache.get(cacheKey);
  }

  let code;
  let sourceGarden = contextGarden;

  try {
    // Attempt to read from the current garden first.
    const git = new Git(contextGarden);
    code = await git.readFile(toolPath);
  } catch (e) {
    // If it fails (e.g., doesn't exist), try the global 'Settings' garden.
    if (!e.message.includes('does not exist')) throw e;
    try {
      sourceGarden = 'Settings';
      const git = new Git(sourceGarden);
      code = await git.readFile(toolPath);
    } catch (e2) {
      // If it's not in 'Settings' either, then it truly doesn't exist.
      if (!e2.message.includes('does not exist')) throw e2;
      return null; // Return null if the tool is not found in either location.
    }
  }

  if (!code) return null;

  try {
    // The tool's name is now derived directly from its filename.
    const name = toolPath.split('/').pop().replace('.js', '');
    const description = parseToolMetadata(code);
    
    // The tool's code is wrapped in a try...catch block.
    // This logs the full error for debugging but returns a simple
    // message to the agent so it can reason about the failure.
    const execute = new Function('args', 'context', `
      return (async () => {
        try { 
          ${code} 
        } catch (e) {
          console.error('TOOL EXECUTION FAILED in script: "${toolPath}" from ${sourceGarden}', e);
          return 'Error: An exception occurred while trying to run the tool: ' + e.message;
        }
      })();
    `);
    
    const tool = { name, description, path: toolPath, execute };
    toolCache.set(cacheKey, tool);
    return tool;
  } catch (e) {
    console.error(`[ToolManager] Failed to parse metadata for tool "${toolPath}":`, e);
    return null;
  }
}

export async function getAllTools(currentGardenName) {
  const allTools = new Map();
  const toolPaths = new Set(); // Start with an empty set.
  const gardensToScan = Array.from(new Set([currentGardenName, 'Settings']));

  for (const gardenName of gardensToScan) {
    const git = new Git(gardenName);
    try {
      const toolFiles = await git.pfs.readdir('/settings/tools');
      for (const fileName of toolFiles) {
        if (fileName.endsWith('.js')) {
          toolPaths.add(`/settings/tools/${fileName}`);
        }
      }
    } catch (e) {
      // It's normal for a garden not to have a tools directory.
      if (e.code !== 'ENOENT') console.warn(`[ToolManager] Could not scan tools in "${gardenName}":`, e);
    }
  }

  for (const toolPath of toolPaths) {
    const tool = await loadTool(toolPath, currentGardenName);
    if (tool) allTools.set(tool.name, tool);
  }
  
  return allTools;
}