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
                if (item === '.git') continue; // This lister is for non-clone operations
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
            let gitClientToUse;
            if (data.gardenName) {
                gitClientToUse = new Git(data.gardenName);
                await gitClientToUse.initRepo();
            } else {
                gitClientToUse = instance._getGitClient();
            }
            
            if (!gitClientToUse) {
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Error: Git client not available`, type: 'error' } }));
                return;
            }

            if (data.isFullSync) {
                // --- THIS IS THE FIX ---
                // Check if we have already deleted the .git dir for this garden in this session.
                if (data.gardenName && !instance.deletedGitDirs.has(data.gardenName)) {
                    // Mark it as deleted for this session so we only do this once.
                    instance.deletedGitDirs.add(data.gardenName);
                    instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Replacing git history for garden: ${data.gardenName}...`, type: 'info' } }));
                    try {
                        // This is the atomic deletion of the old history.
                        await gitClientToUse.rmrf('/.git');
                        instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Old history for ${data.gardenName} removed.`, type: 'info' } }));
                    } catch (e) {
                        instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Error removing old history: ${e.message}`, type: 'error' } }));
                    }
                }
                
                // Now, write the incoming file, which could be a regular file or part of the new .git history.
                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Writing: ${data.path.substring(1)} (${data.gardenName})`, type: 'info' } }));
                const contentToWrite = Buffer.from(data.content, 'base64');
                await gitClientToUse.writeFile(data.path, contentToWrite);

            } else {
                const contentToWrite = data.isBase64 ? Buffer.from(data.content, 'base64') : data.content;
                await gitClientToUse.writeFile(data.path, contentToWrite);
                instance.sync.addMessage(`Updated file: ${data.path} in garden ${data.gardenName || gitClientToUse.gardenName}`);
            }
        } catch (error) {
            console.error('Error handling file update for path:', data.path, error);
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Error updating file ${data.path}: ${error.message}`, type: 'error' } }));
        } finally {
            instance.decrementPendingWrites();
        }
    }
}