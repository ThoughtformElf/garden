/*
Description:
Generates a list of all available files (pages). It can operate in two scopes: listing files only within the current garden or listing files across all gardens. This is useful for getting an overview of available documents before deciding which ones to read. After using this tool, you can use the `readFile` tool on the most relevant-looking file paths.

Arguments:
- scope: The scope of the file search. Can be either "current" (default) or "all".
  - "current": Lists all files in the garden the agent was started in.
  - "all": Lists all files across all known gardens, prefixed with their garden name (e.g., GardenName#/path/to/file).

Example Call (in JSON format):
{
  "scope": "all"
}
*/

// --- Helper function to recursively list files ---
// This function is designed to be self-contained within the tool.
async function listFilesRecursive(pfs, dir) {
    let fileList = [];
    try {
        const items = await pfs.readdir(dir);
        for (const item of items) {
            if (item === '.git') continue; // Skip the git directory
            const path = `${dir === '/' ? '' : dir}/${item}`;
            try {
                const stat = await pfs.stat(path);
                if (stat.isDirectory()) {
                    fileList = fileList.concat(await listFilesRecursive(pfs, path));
                } else {
                    fileList.push(path);
                }
            } catch (e) {
                // Silently ignore errors for individual files that might not be stat-able
            }
        }
    } catch (e) {
        // Silently ignore errors for directories that might not be readable
    }
    return fileList;
}


// --- Main execution logic ---
const { git, dependencies, onProgress } = context;
const { Git } = dependencies;
const scope = args.scope || 'current';

if (scope === 'current') {
    if (onProgress) onProgress(`Listing files in current garden: ${git.gardenName}...`);
    const files = await listFilesRecursive(git.pfs, '/');
    if (onProgress) onProgress(`Found ${files.length} files.`);
    return `Files in garden "${git.gardenName}":\n` + files.join('\n');
}

if (scope === 'all') {
    if (onProgress) onProgress('Listing files across all gardens...');
    const gardensRaw = localStorage.getItem('thoughtform_gardens');
    const gardens = gardensRaw ? JSON.parse(gardensRaw) : ['home'];
    let allFilesOutput = '';
    let totalFiles = 0;

    for (const gardenName of gardens) {
        if (onProgress) onProgress(`... scanning garden: ${gardenName}`);
        const gardenGit = new Git(gardenName);
        const files = await listFilesRecursive(gardenGit.pfs, '/');
        totalFiles += files.length;
        files.forEach(file => {
            allFilesOutput += `${gardenName}#${file}\n`;
        });
    }

    if (onProgress) onProgress(`Found ${totalFiles} files across ${gardens.length} gardens.`);
    return `List of all files across all gardens:\n` + allFilesOutput;
}

return 'Error: Invalid scope. Use "current" or "all".';