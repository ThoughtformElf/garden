// src/devtools/sync.js

// A simple event emitter class to communicate with other parts of the app
class Emitter {
    constructor() {
        this._listeners = {};
    }
    on(event, callback) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(callback);
    }
    emit(event, ...args) {
        if (this._listeners[event]) {
            this._listeners[event].forEach(callback => callback(...args));
        }
    }
}

export class Sync extends Emitter {
    constructor() {
        super();
        this.name = 'sync';
        this._container = null;
    }

    init(dom) {
        this._container = dom;
        this._container.style.padding = '1rem';
        this._container.style.overflowY = 'auto';
        this.render();
    }

    render() {
        this._container.innerHTML = `
            <div id="eruda-Sync">
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
                </div>
            </div>
        `;

        this.bindEvents();
    }
    
    bindEvents() {
        const startBtn = this._container.querySelector('#start-sync-btn');
        const joinBtn = this._container.querySelector('#join-sync-btn');
        const codeInput = this._container.querySelector('#sync-join-code');

        startBtn.addEventListener('click', () => {
            this.emit('start');
        });

        joinBtn.addEventListener('click', () => {
            const code = codeInput.value.trim();
            if (code) {
                this.emit('join', code);
            }
        });
    }

    updateStatus(status, code = null) {
        const statusEl = this._container.querySelector('#sync-status');
        const sessionInfoEl = this._container.querySelector('#sync-session-info');
        const sessionCodeEl = this._container.querySelector('#sync-session-code');
        
        if (statusEl) statusEl.textContent = status;

        if (code && sessionCodeEl && sessionInfoEl) {
            sessionCodeEl.textContent = code;
            sessionInfoEl.style.display = 'block';
        } else if (sessionInfoEl) {
            sessionInfoEl.style.display = 'none';
        }
    }

    show() {
        this._container.style.display = 'block';
    }

    hide() {
        this._container.style.display = 'none';
    }

    destroy() {}
}