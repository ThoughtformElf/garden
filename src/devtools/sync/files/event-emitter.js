// Provides basic event emitter functionality as a mixin or base class
export class EventEmitterMixin {
    constructor() {
        // Basic event target functionality
        this._listeners = {};
    }

    addEventListener(type, callback) {
        if (!(type in this._listeners)) {
            this._listeners[type] = [];
        }
        this._listeners[type].push(callback);
    }

    removeEventListener(type, callback) {
        if (!(type in this._listeners)) {
            return;
        }
        const stack = this._listeners[type];
        for (let i = 0, l = stack.length; i < l; i++) {
            if (stack[i] === callback) {
                stack.splice(i, 1);
                return;
            }
        }
    }

    dispatchEvent(event) {
        if (!(event.type in this._listeners)) {
            return true;
        }
        const stack = this._listeners[event.type].slice();

        for (let i = 0, l = stack.length; i < l; i++) {
            stack[i].call(this, event);
        }
        return !event.defaultPrevented;
    }

    destroy() {
        // Clear listeners to prevent memory leaks
        this._listeners = {};
    }
}