// src/devtools/sync/files/operations.js
import debug from '../../../util/debug.js';
import { Git } from '../../../util/git-integration.js';

export class FileOperations {
    static async _listAllFiles(gitClientToUse, dir) {
        const pfs = gitClientToUse.pfs;
        if (!pfs) throw new Error('gitClient does not have pfs property');
        let fileList = [];
        try {
            const items = await pfs.readdir(dir);
            for (const item of items) {
                if (item === '.git') continue;
                const path = dir === '/' ? `/${item}` : `${dir}/${item}`;
                try {
                    const stat = await pfs.stat(path);
                    if (stat.isDirectory()) {
                        fileList = fileList.concat(await this._listAllFiles(gitClientToUse, path));
                    } else {
                        fileList.push(path);
                    }
                } catch (e) { debug.warn(`Could not stat ${path}, skipping.`, e); }
            }
        } catch (e) { debug.log(`Directory not readable: ${dir}`, e); }
        return fileList;
    }

    static async handleFileUpdate(instance, data) {
        instance.incrementPendingWrites();

        try {
            if (!data.gardenName) {
                throw new Error("Received file update without a gardenName during a full sync.");
            }

            // Always instantiate the git client for the target garden.
            const gitClientToUse = new Git(data.gardenName);

            if (data.isFullSync) {
                // --- THIS IS THE PERFORMANCE FIX (Part 1) ---
                // This block performs the slow, one-time setup operations only when the
                // first file for a garden arrives during this sync session.
                if (!instance.deletedGitDirs.has(data.gardenName)) {
                    instance.deletedGitDirs.add(data.gardenName); // Mark it so this block never runs again for this garden.
                    
                    instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Preparing to receive garden: ${data.gardenName}...`, type: 'info' } }));
                    await gitClientToUse.initRepo(); // Ensure the garden is registered and DB is ready.
                    
                    instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Replacing git history for ${data.gardenName}...`, type: 'info' } }));
                    await gitClientToUse.rmrf('/.git'); // Atomically delete the old history.
                }
                
                // --- UI FEEDBACK RESTORED ---
                // This code now runs for every file, providing the real-time feedback you wanted.
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Writing: ${data.path.substring(1)} (${data.gardenName})`, type: 'info' } }));
                
                const contentToWrite = Buffer.from(data.content, 'base64');
                await gitClientToUse.writeFile(data.path, contentToWrite);

            } else {
                // Non-full-sync logic for single file updates remains the same.
                const contentToWrite = data.isBase64 ? Buffer.from(data.content, 'base64') : data.content;
                await gitClientToUse.writeFile(data.path, contentToWrite);
                instance.sync.addMessage(`Updated file: ${data.path} in garden ${data.gardenName}`);
            }
        } catch (error) {
            console.error('Error handling file update for path:', data.path, error);
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Error updating file ${data.path}: ${error.message}`, type: 'error' } }));
        } finally {
            instance.decrementPendingWrites();
        }
    }
}