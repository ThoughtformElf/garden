// This is a test script for the query parameter autoloader.
// It should run automatically when you navigate to a URL with `?test`
//
// The 'params' variable is available in this script's scope and contains
// the parsed URL query parameters.

console.log('HOOK::', window.location.origin + '/Settings#settings/query/test.js');
console.log('Query autoloader test script executed successfully!');

if (params) {
  console.log('The following parameters were passed in the URL:', params);
} else {
  console.log('The "params" object was not available in the script\'s scope.');
}