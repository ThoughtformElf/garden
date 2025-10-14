import debug from '../../../util/debug.js';

export class DataChannelHandler {
    static setupDataChannel(instance, channel) { // `instance` is SyncFiles
        channel.onopen = () => {
            instance.sync.isConnected = true;
            instance.sync.ui.showMessages();
            instance.sync.addMessage('File sync data channel is open.');
            debug.log("DEBUG: SyncFiles confirmed data channel is open.");
        };

        channel.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                // --- THIS IS THE FIX ---
                // Route the message to the new central handler in the main Sync class.
                await instance.sync._handleIncomingSyncMessage(data, 'P2P');
            } catch (error) {
                console.error('Error parsing sync message from DataChannel:', error, 'Raw data:', event.data);
            }
        };

        channel.onclose = () => {
            instance.sync.isConnected = false;
            instance.sync.ui.hideMessages();
            instance.sync.addMessage('File sync data channel closed.');
            debug.log("DEBUG: SyncFiles confirmed data channel is closed.");
        };
        
        channel.onerror = (event) => {
            const error = event.error;
            if (error && error.name === 'OperationError' && error.message.includes('User-Initiated Abort')) {
                debug.log('Data channel closed intentionally by a peer.', event);
            } else {
                console.error('Data channel error:', event);
                instance.sync.addMessage('Data channel error: ' + (error ? error.message : 'Unknown error'));
            }
        };
    }
}