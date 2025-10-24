// This script runs automatically when you navigate to a URL with `?apiKey=...`
// It overrides the AI API key for the current editor session only.
//
// The 'params' variable is available and contains the parsed URL query parameters.
// The 'editor' variable is the instance for the current pane.

if (params && params.apiKey && editor) {
  editor.aiOverrides.customApiKey = params.apiKey;
  editor.aiOverrides.activeProvider = 'custom'; // Force use of the custom provider
}