// src/events.js

class EventBus {
  constructor() {
    this.subscribers = {};
  }

  /**
   * Subscribes a callback to a specific event.
   * @param {string} eventName - The name of the event to subscribe to.
   * @param {Function} callback - The function to call when the event is published.
   * @returns {Function} An unsubscribe function.
   */
  subscribe(eventName, callback) {
    if (!this.subscribers[eventName]) {
      this.subscribers[eventName] = [];
    }
    this.subscribers[eventName].push(callback);

    // Return an unsubscribe function
    return () => {
      this.subscribers[eventName] = this.subscribers[eventName].filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Publishes an event, calling all subscribed callbacks.
   * @param {string} eventName - The name of the event to publish.
   * @param {any} [data=null] - The data payload to pass to subscribers.
   */
  publish(eventName, data = null) {
    if (!this.subscribers[eventName]) {
      return;
    }
    this.subscribers[eventName].forEach((callback) => {
      try {
        callback(data);
      } catch (e) {
        console.error(`[EventBus] Error in subscriber for event "${eventName}":`, e);
      }
    });
  }
}

export function initializeEventBus() {
  return new EventBus();
}