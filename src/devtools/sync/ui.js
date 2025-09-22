// src/devtools/sync/ui.js
export class SyncUI {
    constructor(syncInstance) {
        this.sync = syncInstance;
    }

    render() {
        // Clear and render the UI
        if (this.sync._container) {
            this.sync._container.innerHTML = `
<div id="eruda-Sync">
    <div class="eruda-sync-config" style="margin-bottom: 20px; padding: 10px; border: 1px solid #444; border-radius: 4px;">
        <h3>Signaling Server Configuration</h3>
        <label for="signaling-server-url">Server URL:</label>
        <input type="text" id="signaling-server-url" class="eruda-input" value="${this.sync.signaling.signalingServerUrl}" placeholder="ws://localhost:8080">
        <button id="save-signaling-config" class="eruda-button" style="margin-left: 10px;">Save</button>
    </div>
    <div class="eruda-sync-status">
        <strong>Status:</strong> <span id="sync-status">Disconnected</span>
    </div>
    <div class="eruda-sync-main">
        <div id="sync-initiator">
            <button id="start-sync-btn" class="eruda-button">Start Sync Session</button>
            <div id="sync-session-info" style="display: none; margin-top: 10px;">
                <p>Share this code with your other device:</p>
                <strong id="sync-session-code" class="eruda-code"></strong>
            </div>
        </div>
        <div id="sync-joiner" style="margin-top: 20px;">
            <label for="sync-join-code">Join a session:</label>
            <input type="text" id="sync-join-code" class="eruda-input" placeholder="Enter code...">
            <button id="join-sync-btn" class="eruda-button">Join</button>
        </div>
        
        <!-- Manual Send Section -->
        <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #444;">
            <h4>Debug Tools:</h4>
            <button id="force-send-test-btn" class="eruda-button" style="background-color: #555;">Force Send Test Message</button>
            <input type="text" id="test-message-input" class="eruda-input" placeholder="Test message..." style="width: 200px; margin-left: 10px;">
        </div>
        <!-- End Manual Send Section -->
        
        <!-- File Sync Buttons -->
        <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #444;">
            <h4>File Sync:</h4>
            <button id="sync-all-files-btn" class="eruda-button">Send All Files</button>
            <button id="request-all-files-btn" class="eruda-button" style="margin-left: 10px;">Request All Files</button>
        </div>
        <!-- End File Sync Buttons -->
        
    </div>
    <div class="eruda-sync-messages" id="eruda-sync-messages" style="display:none; margin-top: 20px;">
        <h3>Messages</h3>
        <div id="eruda-messages-list" style="height: 200px; overflow-y: auto; border: 1px solid #444; padding: 10px; background-color: #1a1a1a;"></div>
    </div>
</div>
            `;
        }
    }

    bindEvents() {
        // Safety check
        if (!this.sync._container) {
            console.error("SyncUI.bindEvents: Container not set");
            return;
        }

        // Get all elements
        const startBtn = this.sync._container.querySelector('#start-sync-btn');
        const joinBtn = this.sync._container.querySelector('#join-sync-btn');
        const saveConfigBtn = this.sync._container.querySelector('#save-signaling-config');
        const syncAllBtn = this.sync._container.querySelector('#sync-all-files-btn');
        const requestAllBtn = this.sync._container.querySelector('#request-all-files-btn');
        
        // Debug elements
        const forceSendBtn = this.sync._container.querySelector('#force-send-test-btn');
        const testMessageInput = this.sync._container.querySelector('#test-message-input');

        // Add listeners with safety checks
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                console.log("UI: Start Sync button clicked");
                this.sync.emit('start');
                this.sync.signaling.startSession();
            });
        }

        if (joinBtn) {
            joinBtn.addEventListener('click', () => {
                const codeInput = this.sync._container.querySelector('#sync-join-code');
                const code = codeInput ? codeInput.value.trim() : '';
                if (code) {
                    console.log("UI: Join Sync button clicked with code:", code);
                    this.sync.emit('join', code);
                    this.sync.signaling.joinSession(code);
                }
            });
        }

        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => {
                const urlInput = this.sync._container.querySelector('#signaling-server-url');
                const newUrl = urlInput ? urlInput.value.trim() : '';
                if (newUrl) {
                    console.log("UI: Save Config button clicked with URL:", newUrl);
                    this.sync.signaling.updateSignalingServerUrl(newUrl);
                    this.sync.updateStatus(`Signaling server URL updated to: ${newUrl}`);
                }
            });
        }

        if (syncAllBtn) {
            syncAllBtn.addEventListener('click', async () => {
                console.log("UI: Send All Files button clicked");
                // Call the method directly on the fileSync instance
                await this.sync.fileSync.syncAllFiles();
            });
        }

        if (requestAllBtn) {
            requestAllBtn.addEventListener('click', () => {
                console.log("UI: Request All Files button clicked");
                // Call the method directly on the fileSync instance
                this.sync.fileSync.requestAllFiles();
            });
        }
        
        // --- FIXED EVENT LISTENER FOR FORCE SEND ---
        if (forceSendBtn && testMessageInput) {
            forceSendBtn.addEventListener('click', () => {
                const message = testMessageInput.value.trim();
                if (message) {
                    console.log("UI: Force Send Test Message button clicked with message:", message);
                    // Instead of trying to send via broken data channel, 
                    // send a test sync message via the signaling server
                    if (this.sync.signaling.ws && this.sync.signaling.ws.readyState === WebSocket.OPEN) {
                        try {
                            // Send as a test sync message
                            this.sync.signaling.sendSyncMessageViaSignaling({
                                type: 'test_message',
                                content: message,
                                timestamp: Date.now()
                            });
                            this.sync.addMessage('[FORCE SENT via Signaling] Test message: ' + message);
                            testMessageInput.value = '';
                        } catch (e) {
                            this.sync.addMessage('[FORCE SEND ERROR] ' + e.message);
                            console.error('Force send error:', e);
                        }
                    } else {
                        this.sync.addMessage('No signaling connection available for force send.');
                    }
                } else {
                    this.sync.addMessage('Please enter a test message.');
                }
            });
        }
        // --- END FIXED EVENT LISTENER ---
    }

    updateStatus(message, code = null) {
        const statusEl = this.sync._container.querySelector('#sync-status');
        const sessionCodeEl = this.sync._container.querySelector('#sync-session-code');
        const sessionInfoEl = this.sync._container.querySelector('#sync-session-info');

        if (statusEl) statusEl.textContent = message;

        if (code && sessionCodeEl && sessionInfoEl) {
            sessionCodeEl.textContent = code;
            sessionInfoEl.style.display = 'block';
        } else if (sessionInfoEl) {
            sessionInfoEl.style.display = 'none';
        }
    }

    addMessage(text) {
        const messagesList = this.sync._container.querySelector('#eruda-messages-list');
        if (messagesList) {
            const messageEl = document.createElement('div');
            messageEl.textContent = text;
            messagesList.appendChild(messageEl);
            messagesList.scrollTop = messagesList.scrollHeight;
        }
    }

    showMessages() {
        const messagesDiv = this.sync._container.querySelector('#eruda-sync-messages');
        if (messagesDiv) {
            messagesDiv.style.display = 'block';
        }
    }

    hideMessages() {
        const messagesDiv = this.sync._container.querySelector('#eruda-sync-messages');
        if (messagesDiv) {
            messagesDiv.style.display = 'none';
        }
    }
}