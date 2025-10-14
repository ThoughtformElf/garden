import debug from '../../../util/debug.js';

// Helper class/module for gitClient logic
export class GitClientHelper {
    // --- Helper to get gitClient by exhaustively searching window.thoughtform ---
    static getGitClient(instance) { // Pass the SyncFiles instance or relevant context
        // Priority 1: Directly set on this instance (via setGitClient)
        if (instance.gitClient) {
            return instance.gitClient;
        }
        // Priority 2: Set on the parent sync instance (should be set by main app via sync.setGitClient)
        if (instance.sync && instance.sync.gitClient) {
            return instance.sync.gitClient;
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
}