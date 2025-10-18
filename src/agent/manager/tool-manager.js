import { Git } from '../../util/git-integration.js';
import { Traversal } from '../traversal.js';
import { defaultFiles } from '../../settings/defaults.js';

const toolCache = new Map();
const hardcodedTools = new Map(
  defaultFiles
    .filter(([path]) => path.startsWith('/settings/tools/'))
    .map(([path, content]) => [path, content])
);

function parseToolMetadata(code) {
  const metadata = { name: '', description: '' };
  const nameMatch = code.match(/@name\s+(.*)/);
  const descriptionMatch = code.match(/@description\s+(.*)/);
  if (nameMatch) metadata.name = nameMatch[1].trim();
  if (descriptionMatch) metadata.description = descriptionMatch[1].trim();
  if (!metadata.name) throw new Error('Tool code is missing a required @name declaration.');
  return metadata;
}

async function loadTool(toolPath, contextGarden) {
  const cacheKey = `${contextGarden}#${toolPath}`;
  if (toolCache.has(cacheKey)) {
    return toolCache.get(cacheKey);
  }

  let code;
  let sourceGarden = contextGarden;

  try {
    const git = new Git(contextGarden);
    code = await git.readFile(toolPath);
  } catch (e) {
    if (!e.message.includes('does not exist')) throw e;
    try {
      sourceGarden = 'Settings';
      const git = new Git(sourceGarden);
      code = await git.readFile(toolPath);
    } catch (e2) {
      if (!e2.message.includes('does not exist')) throw e2;
      code = hardcodedTools.get(toolPath);
      sourceGarden = 'Default';
    }
  }

  if (!code) return null;

  try {
    const metadata = parseToolMetadata(code);
    
    // --- THIS IS THE FIX (Part 1) ---
    // The sandboxed function is now simpler. It only expects 'args' and 'context'.
    // The 'dependencies' will be a property *of* the context object.
    const execute = new Function('args', 'context', `
      return (async () => {
        try { ${code} } catch (e) {
          console.error('TOOL EXECUTION FAILED in script: "${toolPath}" from ${sourceGarden}', e);
          return 'Error: ' + e.message;
        }
      })();
    `);
    
    const tool = { ...metadata, path: toolPath, execute };
    toolCache.set(cacheKey, tool);
    return tool;
  } catch (e) {
    console.error(`[ToolManager] Failed to parse metadata for tool "${toolPath}":`, e);
    return null;
  }
}

export async function getAllTools(currentGardenName) {
  const allTools = new Map();
  const toolPaths = new Set(hardcodedTools.keys());
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
      if (e.code !== 'ENOENT') console.warn(`[ToolManager] Could not scan tools in "${gardenName}":`, e);
    }
  }

  for (const toolPath of toolPaths) {
    const tool = await loadTool(toolPath, currentGardenName);
    if (tool) allTools.set(tool.name, tool);
  }
  
  return allTools;
}