// src/devtools/sync/files/operations.js
import debug from '../../../util/debug.js';

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
        const gitClientToUse = instance._getGitClient();
        if (!gitClientToUse) {
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Error: Git client not available`, type: 'error' } }));
            return;
        }

        try {
            if (data.isFullSync) {
                if (instance.deletionPromise) {
                    instance.fileBuffer.push(data);
                    return;
                }

                if (!instance.isFullSyncInProgress) {
                    instance.isFullSyncInProgress = true;
                    instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: 'Full sync initiated. Deleting local .git repository...', type: 'info' } }));
                    instance.deletionPromise = gitClientToUse.rmrf('/.git');
                    
                    instance.deletionPromise.then(async () => {
                        instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: '.git repository deleted. Writing buffered files...', type: 'info' } }));
                        for (const bufferedData of instance.fileBuffer) {
                            if (!bufferedData.path.startsWith('/.git/')) {
                                instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Writing: ${bufferedData.path.substring(1)}`, type: 'info' } }));
                            }
                            const content = Buffer.from(bufferedData.content, 'base64');
                            await gitClientToUse.writeFile(bufferedData.path, content);
                        }
                        instance.fileBuffer = [];
                        instance.deletionPromise = null;
                    }).catch(err => {
                        instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `FATAL: Failed to delete .git directory: ${err.message}`, type: 'error' } }));
                    });

                    instance.fileBuffer.push(data);
                    return;
                }
                
                // This part runs for all files that arrive after the deletion is complete.
                if (!data.path.startsWith('/.git/')) {
                    instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Writing: ${data.path.substring(1)}`, type: 'info' } }));
                }
                const contentToWrite = Buffer.from(data.content, 'base64');
                await gitClientToUse.writeFile(data.path, contentToWrite);

            } else {
                // Standard logic for single file updates.
                const contentToWrite = data.isBase64 ? Buffer.from(data.content, 'base64') : data.content;
                let currentTimestamp = -1;
                try {
                    const currentContent = await gitClientToUse.readFile(data.path);
                    const parsed = JSON.parse(currentContent);
                    if (parsed && parsed.lastupdated) currentTimestamp = parsed.lastupdated;
                } catch (e) { /* File doesn't exist or isn't JSON */ }

                if (data.timestamp >= currentTimestamp) {
                    await gitClientToUse.writeFile(data.path, contentToWrite);
                    instance.sync.addMessage(`Updated file: ${data.path}`);
                    if (window.thoughtform.editor.filePath === data.path) {
                        await window.thoughtform.editor.forceReloadFile(data.path);
                    }
                }
            }
        } catch (error) {
            console.error('Error handling file update for path:', data.path, error);
            instance.dispatchEvent(new CustomEvent('syncProgress', { detail: { message: `Error updating file ${data.path}: ${error.message}`, type: 'error' } }));
        }
    }
}