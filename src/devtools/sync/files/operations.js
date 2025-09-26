// src/devtools/sync/files/file-operations.js
import debug from '../../../util/debug.js';

// Helper class/module for file operations logic
export class FileOperations {
    // --- Robust getAllFiles that works with different gitClient calling conventions ---
    static async getAllFiles(gitClientToUse) {
        if (!gitClientToUse) {
            return [];
        }

        try {
            let files = [];
            // Try the standard way first: gitClient.listFiles(gitClient, '/')
            try {
                files = await gitClientToUse.listFiles(gitClientToUse, '/');
                debug.log("DEBUG: getAllFiles succeeded with listFiles(gitClient, '/')");
            } catch (method1Error) {
                debug.log("DEBUG: listFiles(gitClient, '/') failed, trying listFiles('/')", method1Error);
                // Fallback 1: gitClient.listFiles('/')
                try {
                    files = await gitClientToUse.listFiles('/');
                } catch (method2Error) {
                    debug.log("DEBUG: listFiles('/') failed, trying internal _listFiles helper", method2Error);
                    // Fallback 2: Use an internal helper similar to sidebar's approach
                    files = await this._listAllFiles(gitClientToUse, '/');
                }
            }
            return files;
        } catch (error) {
            console.error('Error getting file list:', error);
            debug.error('Error getting file list:', error);
            return [];
        }
    }

    // --- Internal helper for listing files, mimicking sidebar logic ---
    static async _listAllFiles(gitClientToUse, dir) {
        // This mimics the logic from src/sidebar/ui-interactions.js listAllFiles
        // and src/util/git-integration.js listFiles
        const pfs = gitClientToUse.pfs; // Assuming pfs is available
        if (!pfs) {
            throw new Error('gitClient does not have pfs property for file listing');
        }

        let fileList = [];
        try {
            const items = await pfs.readdir(dir);
            for (const item of items) {
                // Construct path correctly
                const path = dir === '/' ? `/${item}` : `${dir}/${item}`;
                try {
                    const stat = await pfs.stat(path);
                    if (stat.isDirectory()) {
                        fileList = fileList.concat(await this._listAllFiles(gitClientToUse, path)); // Recurse
                    } else {
                        fileList.push(path);
                    }
                } catch (e) {
                    debug.warn(`Could not stat ${path}, skipping.`, e);
                }
            }
        } catch (e) {
            // If root directory '/' is not found, it might be empty or not initialized in a way pfs expects.
            // This can happen if the garden is brand new.
            debug.log(`Directory not found or not readable: ${dir}. It might be empty.`, e);
        }
        return fileList;
    }
    // --- End Internal helper ---

    // Core logic for handling a file update message
    static async handleFileUpdate(instance, data) { // Pass the SyncFiles instance and data
         const gitClientToUse = instance._getGitClient(); // Use the helper method on the instance
        if (!gitClientToUse) {
            console.warn('Git client not set, cannot handle file update');
            instance.sync.addMessage('Error: Git client not available, cannot handle file update');
            debug.warn('Git client not set, cannot handle file update');
            // --- ADDITION: Dispatch error event ---
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Error: Git client not available, cannot handle file update for ${data.path}`, type: 'error' } }));
            // --- END ADDITION ---
            return;
        }

        try {
            let currentContent = null;
            let currentTimestamp = 0; // Default to 0, but we'll adjust logic

            try {
                currentContent = await gitClientToUse.readFile(data.path);
                // If readFile succeeds, try to parse the timestamp
                try {
                    const parsed = JSON.parse(currentContent);
                    if (parsed && typeof parsed.content !== 'undefined' && typeof parsed.lastupdated !== 'undefined') {
                        currentTimestamp = parsed.lastupdated;
                    } else {
                        // It's JSON but not our format, treat content as is, timestamp stays 0?
                        // Or should we treat this as an old raw file? Let's assume timestamp 0 for now.
                        // A raw file being synced should ideally be sent with a meaningful timestamp.
                        // If the sender sends timestamp 123 and we have a raw local file (timestamp 0),
                        // the sender's version should win. So, timestamp 0 for local raw file is okay.
                    }
                } catch (parseError) {
                    // Not JSON, it's a raw file. Treat as timestamp 0.
                    // Same logic as above applies.
                }
            } catch (readError) {
                // --- KEY FIX 1: File not found locally ---
                // If readFile fails (e.g., file not found), it means the file doesn't exist locally.
                // We should treat this as the OLDEST possible state, so it should accept any update.
                // The condition should be "if (incoming_timestamp >= oldest_possible)".
                // By setting currentTimestamp to -1, any incoming timestamp >= 0 will win.
                debug.log(`DEBUG: File ${data.path} not found locally, will accept incoming update.`);
                currentTimestamp = -1; // Represents oldest possible
                // --- END KEY FIX 1 ---
            }

            // --- KEY FIX 2: Change comparison logic ---
            // Use >= instead of > to ensure files with timestamp 0 (newly created/sent)
            // overwrite files that don't exist locally (timestamp -1).
            // This also means if both sides have timestamp 0, it will still update (idempotent).
            if (data.timestamp >= currentTimestamp) {
            // --- END KEY FIX 2 ---
                debug.log(`DEBUG: Updating file ${data.path} (remote: ${data.timestamp}, local: ${currentTimestamp})`);
                // --- ADDITION: Dispatch progress event ---
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Updating file: ${data.path}`, type: 'info' } }));
                // --- END ADDITION ---
                await gitClientToUse.writeFile(data.path, data.content);
                instance.sync.addMessage(`Updated file: ${data.path}`);
                // --- ADDITION: Dispatch progress event ---
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Successfully updated file: ${data.path}`, type: 'info' } }));
                // --- END ADDITION ---

                // Reload editor if it's the current file
                // Try various locations for the editor
                const editorsToCheck = [
                    instance.sync.editor,
                    window.thoughtform && window.thoughtform.editor,
                    window.thoughtform && window.thoughtform.activeEditor // Hypothetical
                ];
                for (const editor of editorsToCheck) {
                    if (editor && editor.filePath === data.path && typeof editor.forceReloadFile === 'function') {
                        await editor.forceReloadFile(data.path);
                        break;
                    }
                }
            } else {
                debug.log(`DEBUG: Skipped updating file ${data.path} (remote: ${data.timestamp}, local: ${currentTimestamp})`);
                // --- ADDITION: Dispatch progress event ---
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Skipped file (not newer): ${data.path}`, type: 'info' } }));
                // --- END ADDITION ---
                // Optional: Add a message for skipped files
                // instance.sync.addMessage(`Skipped file (not newer): ${data.path}`);
            }
        } catch (error) {
            console.error('Error handling file update for path:', data.path, error);
            instance.sync.addMessage(`Error updating file ${data.path}: ${error.message}`);
            debug.error('Error handling file update for path:', data.path, error);
            // --- ADDITION: Dispatch error event ---
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Error updating file ${data.path}: ${error.message}`, type: 'error' } }));
            // --- END ADDITION ---
        }
    }
}