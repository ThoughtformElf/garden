// src/devtools/sync/ui.js
import debug from '../../util/debug.js';

export class SyncUI {
    constructor(syncInstance) {
        this.sync = syncInstance;
        this.syncMethodIndicatorEl = null;
    }

    render() {
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
        <br>
        <strong>Sync Method:</strong> <span id="sync-method-indicator">None</span>
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

        <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #444;">
            <h4>File Sync:</h4>
            <button id="sync-all-files-btn" class="eruda-button">Send All Files</button>
            <button id="request-all-files-btn" class="eruda-button" style="margin-left: 10px;">Request All Files</button>
        </div>

    </div>
    <div class="eruda-sync-messages" id="eruda-sync-messages" style="display:none; margin-top: 20px;">
        <h3>Messages</h3>
        <div id="eruda-messages-list" style="height: 200px; overflow-y: auto; border: 1px solid #444; padding: 10px; background-color: #1a1a1a;"></div>
    </div>
</div>
            `;
            this.syncMethodIndicatorEl = this.sync._container.querySelector('#sync-method-indicator');
        }
    }

    bindEvents() {
        if (!this.sync._container) {
            debug.error("SyncUI.bindEvents: Container not set");
            return;
        }

        const startBtn = this.sync._container.querySelector('#start-sync-btn');
        const joinBtn = this.sync._container.querySelector('#join-sync-btn');
        const saveConfigBtn = this.sync._container.querySelector('#save-signaling-config');
        const syncAllBtn = this.sync._container.querySelector('#sync-all-files-btn');
        const requestAllBtn = this.sync._container.querySelector('#request-all-files-btn');

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                debug.log("UI: Start Sync button clicked");
                this.sync.emit('start');
                this.sync.signaling.startSession();
            });
        }

        if (joinBtn) {
            joinBtn.addEventListener('click', () => {
                const codeInput = this.sync._container.querySelector('#sync-join-code');
                const code = codeInput ? codeInput.value.trim() : '';
                if (code) {
                    debug.log("UI: Join Sync button clicked with code:", code);
                    this.sync.emit('join', code);
                    this.sync.signaling.joinSession(code);
                } else {
                     this.sync.addMessage('Please enter a session code to join.');
                }
            });
        }

        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => {
                const urlInput = this.sync._container.querySelector('#signaling-server-url');
                const newUrl = urlInput ? urlInput.value.trim() : '';
                if (newUrl) {
                    debug.log("UI: Save Config button clicked with URL:", newUrl);
                    this.sync.signaling.updateSignalingServerUrl(newUrl);
                    this.sync.updateStatus(`Signaling server URL updated to: ${newUrl}`);
                } else {
                     this.sync.addMessage('Please enter a valid URL.');
                }
            });
        }

        if (syncAllBtn) {
            syncAllBtn.addEventListener('click', async () => {
                debug.log("UI: Send All Files button clicked");
                await this.sync.fileSync.syncAllFiles();
            });
        }

        if (requestAllBtn) {
            requestAllBtn.addEventListener('click', () => {
                debug.log("UI: Request All Files button clicked");
                this.sync.fileSync.requestAllFiles();
            });
        }
    }

    updateStatus(message, code = null) {
        const statusEl = this.sync._container.querySelector('#sync-status');
        const sessionCodeEl = this.sync._container.querySelector('#sync-session-code');
        const sessionInfoEl = this.sync._container.querySelector('#sync-session-info');

        if (statusEl) {
            statusEl.textContent = message;
            debug.log("UI: Status updated to:", message);
            // Update the sync method indicator when status changes
            this.updateSyncMethodIndicator();
        }

        if (code && sessionCodeEl && sessionInfoEl) {
            sessionCodeEl.textContent = code;
            sessionInfoEl.style.display = 'block';
        } else if (sessionInfoEl) {
            sessionInfoEl.style.display = 'none';
        }
    }

    updateSyncMethodIndicator() {
        if (this.syncMethodIndicatorEl) {
            const methodState = this.sync.signaling.getCurrentSyncMethodState();
            let displayText = 'Unknown';
            let displayColor = 'var(--color-text-primary)';

            switch (methodState) {
                case 'webrtc_active':
                    displayText = 'WebRTC (P2P) - Active';
                    displayColor = 'var(--base-accent-action)'; // Green
                    break;
                case 'webrtc_inactive':
                    displayText = 'WebRTC (P2P) - Inactive';
                    displayColor = 'var(--base-accent-warning)'; // Orange
                    break;
                case 'websocket':
                    displayText = 'WebSocket (Fallback)';
                    displayColor = 'var(--base-accent-warning)'; // Orange
                    break;
                case 'none':
                default:
                    displayText = 'None';
                    displayColor = 'var(--color-text-secondary)'; // Gray
                    break;
            }
            this.syncMethodIndicatorEl.textContent = displayText;
            this.syncMethodIndicatorEl.style.color = displayColor;
            debug.log("UI: Sync method indicator updated to:", displayText);
        }
    }

    addMessage(text) {
        const messagesList = this.sync._container.querySelector('#eruda-messages-list');
        if (messagesList) {
            const messageEl = document.createElement('div');
            messageEl.textContent = text;
            messagesList.appendChild(messageEl);
            messagesList.scrollTop = messagesList.scrollHeight;
            debug.log("UI: Message added:", text);
        }
    }

    showMessages() {
        const messagesDiv = this.sync._container.querySelector('#eruda-sync-messages');
        if (messagesDiv) {
            messagesDiv.style.display = 'block';
            debug.log("UI: Messages area shown");
        }
    }

    hideMessages() {
        const messagesDiv = this.sync._container.querySelector('#eruda-sync-messages');
        if (messagesDiv) {
            messagesDiv.style.display = 'none';
            debug.log("UI: Messages area hidden");
        }
    }
}