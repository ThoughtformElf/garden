// This script runs automatically whenever a new preview window is created.
//
// The 'event' variable is available in this script's scope
// and contains data about the event that triggered the hook.
// For 'window:create', it looks like: { windowId: 'preview-...', url: '/garden#file?windowed=true' }

console.log('HOOK:: on-create-window.js');
console.log('Created window:', event.windowId, 'with URL:', event.url);