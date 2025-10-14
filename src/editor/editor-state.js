// src/editor/editor-state.js

/**
 * Manages getting and restoring the state of an editor pane,
 * including selection and scroll position.
 */
export class EditorState {
  constructor(editor) {
    this.editor = editor;
  }

  /**
   * Captures the current editor's state.
   * @returns {object|null} The state object or null if the editor is not ready.
   */
  getCurrentState() {
    if (!this.editor.editorView) return null;
    return {
      selection: {
        main: {
          anchor: this.editor.editorView.state.selection.main.anchor,
          head: this.editor.editorView.state.selection.main.head,
        }
      },
      scrollTop: this.editor.editorView.scrollDOM.scrollTop
    };
  }

  /**
   * Restores a previously captured state to the editor.
   * @param {object} state - The state object to restore.
   */
  restoreState(state) {
    if (!this.editor.editorView || !state) return;

    const transaction = this.editor.editorView.state.update({
      selection: {
        anchor: state.selection.main.anchor,
        head: state.selection.main.head
      }
    });
    this.editor.editorView.dispatch(transaction);
    
    requestAnimationFrame(() => {
      if (this.editor.editorView.scrollDOM) {
        this.editor.editorView.scrollDOM.scrollTop = state.scrollTop;
      }
    });
  }
}