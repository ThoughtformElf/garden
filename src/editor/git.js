import { diffCompartment, createDiffExtension } from './diff.js';

/**
 * Manages git-related editor actions like showing diffs and historical views.
 */
export class EditorGit {
  constructor(editor) {
    this.editor = editor;
  }

  /**
   * Enables the diff view by comparing the current content to a provided original.
   * @param {string} originalContent - The base content for the diff.
   */
  async showDiff(originalContent) {
    if (originalContent === null) {
      this.hideDiff();
      return;
    }
    const diffExt = createDiffExtension(originalContent);
    this.editor.editorView.dispatch({
      effects: diffCompartment.reconfigure(diffExt)
    });
  }

  /**
   * Disables the diff view.
   */
  hideDiff() {
    this.editor.editorView.dispatch({
      effects: diffCompartment.reconfigure([])
    });
  }

  /**
   * Loads and displays a diff of a file from a specific commit against its parent.
   * @param {string} filepath - The path of the file.
   * @param {string} oid - The commit OID to view.
   * @param {string} parentOid - The parent commit OID for comparison.
   */
  async previewHistoricalFile(filepath, oid, parentOid) {
    const [currentContent, parentContent] = await Promise.all([
      this.editor.gitClient.readBlobFromCommit(oid, filepath),
      this.editor.gitClient.readBlobFromCommit(parentOid, filepath)
    ]);

    if (currentContent === null || parentContent === null) {
      await this.editor.sidebar.showAlert({ title: "Error", message: "Could not load historical diff for this file."});
      return;
    }
    
    this.editor.editorView.dispatch({
      changes: { from: 0, to: this.editor.editorView.state.doc.length, insert: currentContent },
      annotations: this.editor.programmaticChange.of(true),
    });
    this.showDiff(parentContent);
  }
}