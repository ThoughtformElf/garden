// src/devtools/sync/files.js
import { Modal } from '../../util/modal.js';
import debug from '../../util/debug.js'; // Import the debug utility

// Do not import Git for fallback creation, as it's not working reliably

export class SyncFiles {
    constructor(syncInstance) {
        this.sync = syncInstance;
        this.gitClient = null;
    }

    setGitClient(gitClient) {
        this.gitClient = gitClient;
    }

    setupDataChannel(channel) {
        channel.onopen = () => {
            this.sync.isConnected = true;
            this.sync.updateStatus('Connected', this.sync.sessionCode);
            this.sync.ui.showMessages();
            this.sync.addMessage('Data channel opened');
            debug.log("DEBUG: Data channel opened");
        };

        channel.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleSyncMessage(data);
            } catch (error) {
                console.error('Error parsing sync message:', error);
                this.sync.addMessage('Received: ' + event.data);
                debug.error('Error parsing sync message:', error);
            }
        };

        channel.onclose = () => {
            this.sync.isConnected = false;
            this.sync.updateStatus('Disconnected', this.sync.sessionCode);
            this.sync.ui.hideMessages();
            this.sync.addMessage('Data channel closed');
            debug.log("DEBUG: Data channel closed");
        };

        channel.onerror = (error) => {
            console.error('Data channel error:', error);
            this.sync.updateStatus('Data channel error: ' + error.message);
            this.sync.addMessage('Data channel error: ' + error.message);
            debug.error('Data channel error:', error);
        };
    }

    async handleSyncMessage(data) {
        switch (data.type) {
            case 'file_update':
                await this.handleFileUpdate(data);
                break;
            case 'request_all_files':
                await this.handleRequestAllFiles();
                break;
            case 'all_files':
                await this.handleAllFiles(data);
                break;
            default:
                console.log('Unknown sync message type:', data.type);
                debug.log('Unknown sync message type:', data.type);
        }
    }

    // --- Helper to get gitClient by exhaustively searching window.thoughtform ---
    _getGitClient() {
        // Priority 1: Directly set on this instance (via setGitClient)
        if (this.gitClient) {
            return this.gitClient;
        }
        // Priority 2: Set on the parent sync instance (should be set by main app via sync.setGitClient)
        if (this.sync && this.sync.gitClient) {
            return this.sync.gitClient;
        }
        
        // Priority 3: Exhaustively search window.thoughtform
        // The structure might be window.thoughtform.gitClient or window.thoughtform.editor.gitClient
        // or even window.thoughtform.<someOtherKey>.gitClient
        if (window.thoughtform) {
            // Check direct properties
            for (const key in window.thoughtform) {
                if (window.thoughtform[key] && typeof window.thoughtform[key] === 'object') {
                    if (window.thoughtform[key].hasOwnProperty('readFile') && window.thoughtform[key].hasOwnProperty('writeFile')) {
                        // This looks like a gitClient-like object
                        debug.log(`DEBUG: Found potential gitClient-like object at window.thoughtform.${key}`);
                        return window.thoughtform[key];
                    }
                    // Check if it has a gitClient property
                    if (window.thoughtform[key].gitClient) {
                        debug.log(`DEBUG: Found gitClient at window.thoughtform.${key}.gitClient`);
                        return window.thoughtform[key].gitClient;
                    }
                }
            }
            // Specific common paths
            if (window.thoughtform.gitClient) {
                debug.log(`DEBUG: Found gitClient at window.thoughtform.gitClient`);
                return window.thoughtform.gitClient;
            }
            if (window.thoughtform.editor && window.thoughtform.editor.gitClient) {
                debug.log(`DEBUG: Found gitClient at window.thoughtform.editor.gitClient`);
                return window.thoughtform.editor.gitClient;
            }
        }

        debug.log("DEBUG: _getGitClient: No gitClient found in standard locations or window.thoughtform");
        return null;
    }
    // --- End Helper ---

    // Inside src/devtools/sync/files.js

    async handleFileUpdate(data) {
        const gitClientToUse = this._getGitClient();
        if (!gitClientToUse) {
            console.warn('Git client not set, cannot handle file update');
            this.sync.addMessage('Error: Git client not available, cannot handle file update');
            debug.warn('Git client not set, cannot handle file update');
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
                await gitClientToUse.writeFile(data.path, data.content);
                this.sync.addMessage(`Updated file: ${data.path}`);

                // Reload editor if it's the current file
                // Try various locations for the editor
                const editorsToCheck = [
                    this.sync.editor,
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
                // Optional: Add a message for skipped files
                // this.sync.addMessage(`Skipped file (not newer): ${data.path}`);
            }
        } catch (error) {
            console.error('Error handling file update for path:', data.path, error);
            this.sync.addMessage(`Error updating file ${data.path}: ${error.message}`);
            debug.error('Error handling file update for path:', data.path, error);
        }
    }

    async handleRequestAllFiles() {
        const gitClientToUse = this._getGitClient();
        if (!gitClientToUse) {
            console.warn('Git client not set, cannot send all files');
            this.sync.addMessage('Error: Git client not available, cannot send all files');
            debug.warn('Git client not set, cannot send all files');
            return;
        }

        try {
            // Use the robust getAllFiles helper
            const files = await this.getAllFiles(gitClientToUse);

            for (const file of files) {
                try {
                    const content = await gitClientToUse.readFile(file);
                    let timestamp = 0;

                    try {
                        const parsed = JSON.parse(content);
                        timestamp = parsed.lastupdated || 0;
                    } catch (e) {
                        timestamp = 0;
                    }

                    // Use signaling's send method which has the fallback logic
                    this.sync.signaling.sendSyncMessage({
                        type: 'file_update',
                        path: file,
                        content: content,
                        timestamp: timestamp
                    });
                } catch (e) {
                    console.warn(`Could not read file ${file} for sync:`, e);
                    debug.warn(`Could not read file ${file} for sync:`, e);
                }
            }

            this.sync.addMessage('Sent all files to peer');
        } catch (error) {
            console.error('Error sending all files:', error);
            this.sync.addMessage(`Error sending all files: ${error.message}`);
            debug.error('Error sending all files:', error);
        }
    }

    async handleAllFiles(data) {
        this.sync.addMessage('Received all files from peer');
        debug.log('Received all files from peer');
    }

    // --- Robust getAllFiles that works with different gitClient calling conventions ---
    async getAllFiles(gitClientToUse) {
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
            return files.filter(file => file !== '/.git');
        } catch (error) {
            console.error('Error getting file list:', error);
            debug.error('Error getting file list:', error);
            return [];
        }
    }

    // --- Internal helper for listing files, mimicking sidebar logic ---
    async _listAllFiles(gitClientToUse, dir) {
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
                if (item === '.git') continue;
                // Construct path correctly
                const path = dir === '/' ? `/${item}` : `${dir}/${item}`;
                try {
                    const stat = await pfs.stat(path);
                    if (stat.isDirectory()) {
                        fileList = fileList.concat(await this._listAllFiles(gitClientToUse, path));
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

    async syncAllFiles() {
        // --- KEY CHANGE 1: Remove isConnected check, rely on signaling fallback ---
        // if (!this.sync.isConnected || !this.gitClient) { // OLD CHECK

        // --- KEY CHANGE 2: Use helper to get gitClient ---
        const gitClientToUse = this._getGitClient();
        if (!gitClientToUse) {
            this.sync.addMessage('Git client not available. Please make sure a garden is loaded.');
            console.error('syncAllFiles: Git client not available from any source.');
            debug.error('syncAllFiles: Git client not available from any source.');
            // Log what we *do* have for debugging
            debug.log("DEBUG: this.gitClient:", this.gitClient);
            debug.log("DEBUG: this.sync.gitClient:", this.sync?.gitClient);
            debug.log("DEBUG: window.thoughtform keys:", Object.keys(window.thoughtform || {}));
            if (window.thoughtform) {
                for (const key in window.thoughtform) {
                    if (typeof window.thoughtform[key] === 'object' && window.thoughtform[key] !== null) {
                        debug.log(`DEBUG: window.thoughtform.${key} keys:`, Object.keys(window.thoughtform[key]));
                    }
                }
            }
            return;
        }
        debug.log("DEBUG: syncAllFiles: Got gitClient to use");
        // --- END KEY CHANGES ---

        try {
            // --- KEY CHANGE 3: Add Confirmation ---
            // Try to get garden name, fallback to 'unknown'
            let gardenName = 'unknown';
            if (typeof gitClientToUse.gardenName === 'string') {
                gardenName = gitClientToUse.gardenName;
            } else if (gitClientToUse.dir) { // Guess from dir property if it exists
                gardenName = gitClientToUse.dir.replace(/^\//, ''); // Remove leading slash
            }
            
            const confirmed = await Modal.confirm({
                title: 'Send All Files',
                message: `Are you sure you want to send all files from your garden '${gardenName}' to the connected peer? This will update their files if yours are newer.`,
                okText: 'Send Files',
                cancelText: 'Cancel'
            });

            if (!confirmed) {
                this.sync.addMessage('Send all files cancelled.');
                return;
            }
            // --- END KEY CHANGE 3 ---

            this.sync.addMessage('Syncing all files...');
            const files = await this.getAllFiles(gitClientToUse); // Use robust helper

            let sentCount = 0;
            for (const file of files) {
                try {
                    const content = await gitClientToUse.readFile(file);
                    let timestamp = 0;

                    try {
                        const parsed = JSON.parse(content);
                        timestamp = parsed.lastupdated || 0;
                    } catch (e) {
                        timestamp = 0;
                    }

                    // --- KEY CHANGE 4: Use signaling's send method (has fallback) ---
                    this.sync.signaling.sendSyncMessage({
                        type: 'file_update',
                        path: file,
                        content: content,
                        timestamp: timestamp
                    });
                    // --- END KEY CHANGE 4 ---
                    sentCount++;
                } catch (e) {
                    console.warn(`Could not read/send file ${file} for sync:`, e);
                    this.sync.addMessage(`Warning: Could not process file ${file}`);
                    debug.warn(`Could not read/send file ${file} for sync:`, e);
                }
            }

            this.sync.addMessage(`Synced all files with peer. Sent ${sentCount}/${files.length} files.`);
            debug.log(`DEBUG: syncAllFiles completed. Sent ${sentCount}/${files.length} files.`);
        } catch (error) {
            console.error('Error syncing all files:', error);
            this.sync.addMessage(`Error syncing all files: ${error.message}`);
            debug.error('Error syncing all files:', error);
        }
    }

    requestAllFiles() {
        // --- KEY CHANGE 5: Remove isConnected check ---
        // if (!this.sync.isConnected) { // OLD CHECK
        // --- END KEY CHANGE 5 ---
        
        // --- KEY CHANGE 6: Use signaling's send method (has fallback) ---
        this.sync.signaling.sendSyncMessage({
            type: 'request_all_files'
        });
        // --- END KEY CHANGE 6 ---

        this.sync.addMessage('Requested all files from peer');
    }

    sendFileUpdate(path, content, timestamp) {
        // --- KEY CHANGE 7: Use signaling's send method (has fallback) ---
        this.sync.signaling.sendSyncMessage({
            type: 'file_update',
            path: path,
            content: content,
            timestamp: timestamp
        });
        // --- END KEY CHANGE 7 ---
    }

    destroy() {
        // Cleanup if needed
    }
}