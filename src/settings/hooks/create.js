// This script runs automatically whenever a new file is created.
//
// The 'event' variable is available in this script's scope
// and contains data about the event that triggered the hook.
// For 'file:create', it looks like: { path: '/path/to/new-file.md' }

console.log('HOOK::', window.location.origin + '/Settings#hooks/create.js');