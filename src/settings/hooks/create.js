// This script runs automatically whenever a new file is created.
//
// The 'event' variable is available in this script's scope
// and contains data about the event that triggered the hook.
// For 'file:create', it looks like: { path: '/path/to/new-file.md' }

console.log('--- HOOK: file:create ---');
console.log('A new file was created at path:', event.path);
console.log('You could use the "editor" and "git" globals here to modify it, for example, by adding a template.');