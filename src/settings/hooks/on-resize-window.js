// This script runs automatically whenever a preview window is resized.
// This event is debounced to avoid excessive firing during a resize operation.
//
// The 'event' variable is available in this script's scope
// and contains data about the event that triggered the hook.
// For 'window:resize', it looks like: { windowId: 'preview-...', width: 640, height: 424 }

console.log('HOOK:: on-resize-window.js');
console.log(`Resized window ${event.windowId} to ${event.width}x${event.height}`);