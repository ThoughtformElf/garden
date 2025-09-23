// src/devtools/sync/files/data-channel.js
import debug from '../../../util/debug.js';

// Helper class/module for setting up data channel callbacks
export class DataChannelHandler {
    static setupDataChannel(instance, channel) { // Pass the SyncFiles instance
        channel.onopen = () => {
            instance.sync.isConnected = true;
            instance.sync.ui.showMessages();
            instance.sync.addMessage('File sync data channel is open.');
            debug.log("DEBUG: SyncFiles confirmed data channel is open.");
        };

        channel.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                await instance.handleSyncMessage(data);
            } catch (error) {
                console.error('Error parsing sync message:', error);
                instance.sync.addMessage('Received: ' + event.data);
                debug.error('Error parsing sync message:', error);
            }
        };

        channel.onclose = () => {
            instance.sync.isConnected = false;
            instance.sync.ui.hideMessages();
            instance.sync.addMessage('File sync data channel closed.');
            debug.log("DEBUG: SyncFiles confirmed data channel is closed.");
        };

        /**
         * THIS IS THE FIX:
         * We make the error handler smarter. It now checks for the specific, expected
         * error that occurs when a connection is closed programmatically. This prevents
         * logging a normal disconnect as a "Data channel error".
         */
        channel.onerror = (event) => {
            const error = event.error;

            // Check for the benign "User-Initiated Abort" error.
            if (error && error.name === 'OperationError' && error.message.includes('User-Initiated Abort')) {
                // This is an expected closure, not a real error. Log it for debugging but don't alarm the user.
                debug.log('Data channel closed intentionally by a peer.', event);
            } else {
                // This is an unexpected error, so we should log it prominently.
                console.error('Data channel error:', event);
                instance.sync.addMessage('Data channel error: ' + (error ? error.message : 'Unknown error'));
                debug.error('Data channel error:', event);
            }
        };
    }
}