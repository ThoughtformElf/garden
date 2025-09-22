// src/devtools/sync/files/data-channel-handler.js
import debug from '../../../util/debug.js';

// Helper class/module for setting up data channel callbacks
export class DataChannelHandler {
    static setupDataChannel(instance, channel) { // Pass the SyncFiles instance
        channel.onopen = () => {
            instance.sync.isConnected = true;
            instance.sync.updateStatus('Connected', instance.sync.sessionCode);
            instance.sync.ui.showMessages();
            instance.sync.addMessage('Data channel opened');
            debug.log("DEBUG: Data channel opened");
        };

        channel.onmessage = async (event) => { // Make async to handle async message processing
            try {
                const data = JSON.parse(event.data);
                // Delegate to message handler
                await instance.handleSyncMessage(data);
            } catch (error) {
                console.error('Error parsing sync message:', error);
                instance.sync.addMessage('Received: ' + event.data);
                debug.error('Error parsing sync message:', error);
            }
        };

        channel.onclose = () => {
            instance.sync.isConnected = false;
            instance.sync.updateStatus('Disconnected', instance.sync.sessionCode);
            instance.sync.ui.hideMessages();
            instance.sync.addMessage('Data channel closed');
            debug.log("DEBUG: Data channel closed");
        };

        channel.onerror = (error) => {
            console.error('Data channel error:', error);
            instance.sync.updateStatus('Data channel error: ' + error.message);
            instance.sync.addMessage('Data channel error: ' + error.message);
            debug.error('Data channel error:', error);
        };
    }
}