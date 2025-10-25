/*
Description:
Reads the full, raw content of one or more files from within the user's gardens. This is the primary tool for directly accessing and understanding specific notes, scripts, or documents in the knowledge base.

Use this after `listFiles` to investigate promising file paths, or whenever you know the exact path of a file you need to read.

Arguments:
- files: An array of file paths to read. Paths can be for the current garden (e.g., "/path/to/file.md") or cross-garden (e.g., "OtherGarden#/path/to/file.md").

Example Call (in JSON format):
{
  "files": [
    "/README.md",
    "Settings#/settings/keymaps.yml"
  ]
}
*/

if (!args.files || !Array.isArray(args.files) || args.files.length === 0) {
  return "Error: The 'files' argument must be a non-empty array of file paths.";
}

const { git, dependencies, onProgress } = context;
const { Git } = dependencies;
const filePaths = args.files;

let combinedContent = "";
let filesRead = 0;

for (const path of filePaths) {
  let content = `Error: Could not read file at "${path}".`;
  let sourceGardenName = git.gardenName;
  let filePathInGarden = path;

  if (onProgress) onProgress(`Reading file: ${path}`);

  try {
    if (path.includes('#')) {
      [sourceGardenName, filePathInGarden] = path.split('#', 2);
    }
    
    // Ensure the path within the garden starts with a slash
    if (!filePathInGarden.startsWith('/')) {
        filePathInGarden = `/${filePathInGarden}`;
    }

    const gitClientToUse = sourceGardenName === git.gardenName ? git : new Git(sourceGardenName);
    content = await gitClientToUse.readFile(filePathInGarden);
    filesRead++;
  } catch (e) {
    content = `Error reading "${path}": ${e.message}`;
  }
  
  combinedContent += `--- Content from ${path} ---\n${content}\n\n`;
}

if (onProgress) onProgress(`Successfully read ${filesRead} of ${filePaths.length} files.`);

return combinedContent;