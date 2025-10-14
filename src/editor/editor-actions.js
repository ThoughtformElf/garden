// src/editor/editor-actions.js
import { EditorState } from './editor-state.js';
import { EditorGit } from './editor-git.js';
import { EditorFiles } from './editor-files.js';

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