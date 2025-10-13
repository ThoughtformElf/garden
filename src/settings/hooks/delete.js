// This script runs automatically whenever a file or folder is deleted.
//
// The 'event' variable is available in this script's scope
// and contains data about the event that triggered the hook.
// For 'file:delete', it looks like: { path: '/path/to/deleted-item', isDirectory: false }

console.log('HOOK::', window.location.origin + '/Settings#settings/hooks/delete.js');
console.log('Deleted item:', event.path, 'isDirectory:', event.isDirectory);