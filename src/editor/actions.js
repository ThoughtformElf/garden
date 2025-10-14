import { EditorState } from './state.js';
import { EditorGit } from './git.js';
import { EditorFiles } from './files.js';

/**
 * A composite class that groups all editor-related actions.
 * This is done to keep the main Editor class cleaner and more focused on initialization.
 */
export class EditorActions {
  constructor(editor) {
    // These are not individual properties but namespaces for clarity.
    this.state = new EditorState(editor);
    this.git = new EditorGit(editor);
    this.files = new EditorFiles(editor);
  }
}