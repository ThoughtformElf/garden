// This script runs automatically when the application finishes loading.
//
// The 'event' variable is available in this script's scope.
// For 'app:load', it is null.

(function() {
  console.log('--- HOOK: app:load ---');
  console.log('Thoughtform.Garden has finished loading.');
  console.log('You can use this hook to set up custom listeners, load data, or modify the UI.');
})();