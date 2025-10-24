// This script runs automatically whenever a preview window is closed.
//
// The 'event' variable is available in this script's scope
// and contains data about the event that triggered the hook.
// For 'window:close', it looks like: { windowId: 'preview-...' }

console.log('HOOK:: on-close-window.js');
console.log('Closed window:', event.windowId);