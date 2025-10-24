// This script runs automatically when you navigate to a URL with `?provider=...`
// It overrides the active AI provider for the current editor session only.
// The key is case-insensitive.
//
// The 'params' variable is available and contains the parsed URL query parameters.
// The 'editor' variable is the instance for the current pane.

if (params && params.provider && editor) {
  editor.aiOverrides.activeProvider = params.provider;
}