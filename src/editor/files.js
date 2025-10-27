import { Modal } from '../util/modal.js';
import { getLanguageExtension } from './languages.js';
import { generateUniqueScratchpadPath } from '../workspace/scratchpad.js';

/**
 * Manages file operations within the editor, such as loading, creating, and duplicating.
 */
export class EditorFiles {
  constructor(editor) {
    this.editor = editor;
  }

  /**
   * Parses a URL hash to determine a valid file path string.
   * @param {string} hash - The URL hash (e.g., '#/path/to/file').
   * @returns {string} A normalized file path.
   */
  getFilePath(hash) {
    let filepath = hash.startsWith('#') ? hash.substring(1) : hash;
    filepath = decodeURIComponent(filepath);
    if (!filepath) filepath = 'home';
    return filepath;
  }

  /**
   * Reads the content of a file from the git file system.
   * @param {string} filepath - The path to the file.
   * @returns {Promise<string>} The file content.
   */
  async loadFileContent(filepath) {
    try {
      const rawContent = await this.editor.gitClient.readFile(filepath);
      // --- THIS IS THE CONSOLE LOG YOU DEMANDED ---
      console.log(`%c[loadFileContent] Content for ${filepath}:`, 'font-weight: bold; color: #12ffbc;', rawContent);
      return rawContent;
    } catch (e) {
      if (e.message && e.message.includes('does not exist')) {
        // This is expected for a new file.
      } else {
        console.warn(`An unexpected error occurred while reading ${filepath}:`, e);
      }
      const placeholder = `// "${filepath.substring(1)}" does not exist. Start typing to create it.`;
      console.log(`%c[loadFileContent] Placeholder for ${filepath}:`, 'font-weight: bold; color: orange;', placeholder);
      return placeholder;
    }
  }

  /**
   * Loads a file into the editor, handling both text and media previews.
   * @param {string} filepath - The path of the file to load.
   */
  async loadFile(filepath) {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif'];
    const videoExtensions = ['mp4', 'webm', 'mov', 'ogg'];
    const audioExtensions = ['mp3', 'wav', 'flac'];
    const mediaExtensions = [...imageExtensions, ...videoExtensions, ...audioExtensions];
    const extension = filepath.split('.').pop()?.toLowerCase();

    if (mediaExtensions.includes(extension)) {
      this.editor.hideDiff();
      this.editor.targetElement.classList.remove('is-editor');
      this.editor.targetElement.classList.add('is-media-preview');
      this.editor.mediaViewerElement.innerHTML = '<p>Loading media...</p>';

      const buffer = await this.editor.gitClient.readFileAsBuffer(filepath);
      if (buffer) {
        const mimeTypeMap = {
          'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif',
          'svg': 'image/svg+xml', 'webp': 'image/webp', 'avif': 'image/avif',
          'mp4': 'video/mp4', 'webm': 'video/webm', 'mov': 'video/quicktime', 'ogg': 'video/ogg',
          'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'flac': 'audio/flac',
        };
        const mimeType = mimeTypeMap[extension] || 'application/octet-stream';
        const blob = new Blob([buffer], { type: mimeType });
        
        if (this.editor.currentMediaObjectUrl) URL.revokeObjectURL(this.editor.currentMediaObjectUrl);
        
        this.editor.currentMediaObjectUrl = URL.createObjectURL(blob);

        let mediaElementHTML = '';
        if (imageExtensions.includes(extension)) {
          mediaElementHTML = `<img src="${this.editor.currentMediaObjectUrl}" alt="${filepath}" />`;
        } else if (videoExtensions.includes(extension)) {
          mediaElementHTML = `<video src="${this.editor.currentMediaObjectUrl}" controls></video>`;
        } else if (audioExtensions.includes(extension)) {
          mediaElementHTML = `<audio src="${this.editor.currentMediaObjectUrl}" controls></audio>`;
        }
        this.editor.mediaViewerElement.innerHTML = mediaElementHTML;
        const mediaElement = this.editor.mediaViewerElement.querySelector('video, audio');
        if (mediaElement) mediaElement.load();
      } else {
        this.editor.mediaViewerElement.innerHTML = `<p class="error">Could not load media: ${filepath}</p>`;
      }
      this.editor.filePath = filepath;
      if (this.editor.sidebar) await this.editor.sidebar.refresh();
      await this.editor._applyUserSettings();
      return;
    }

    this.editor.targetElement.classList.remove('is-media-preview');
    this.editor.targetElement.classList.add('is-editor');

    if (this.editor.currentMediaObjectUrl) {
      URL.revokeObjectURL(this.editor.currentMediaObjectUrl);
      this.editor.currentMediaObjectUrl = null;
    }
    
    this.editor.hideDiff();
    const newContent = await this.loadFileContent(filepath);
    this.editor.filePath = filepath;

    const newLanguage = getLanguageExtension(filepath);
    this.editor.editorView.dispatch({
      effects: this.editor.languageCompartment.reconfigure(newLanguage)
    });
    
    const currentDoc = this.editor.editorView.state.doc;
    this.editor.editorView.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: newContent },
      annotations: this.editor.programmaticChange.of(true),
    });

    if (this.editor.sidebar) await this.editor.sidebar.refresh();
    await this.editor._applyUserSettings();
  }
  
  /**
   * Forces a reload of the current file from disk, preserving scroll and selection.
   * @param {string} filepath - The path of the file to reload.
   */
  async forceReloadFile(filepath) {
    if (this.editor.filePath !== filepath || !this.editor.editorView) {
      await this.loadFile(filepath);
      return;
    }

    const oldSelection = this.editor.editorView.state.selection;
    const oldScrollTop = this.editor.editorView.scrollDOM.scrollTop;

    const newContent = await this.loadFileContent(filepath);
    const currentDoc = this.editor.editorView.state.doc;

    if (newContent === currentDoc.toString()) {
      return;
    }

    const newDocLength = newContent.length;
    const transactionSpec = {
      changes: { from: 0, to: currentDoc.length, insert: newContent },
      annotations: this.editor.programmaticChange.of(true),
      selection: {
        anchor: Math.min(oldSelection.main.anchor, newDocLength),
        head: Math.min(oldSelection.main.head, newDocLength),
      }
    };

    this.editor.editorView.dispatch(transactionSpec);

    requestAnimationFrame(() => {
      if (this.editor.editorView && this.editor.editorView.scrollDOM) {
        this.editor.editorView.scrollDOM.scrollTop = oldScrollTop;
      }
    });
  }
  
  /**
   * Initiates the workflow for creating a new file via a modal.
   */
  async newFile() {
    try {
      const newName = await Modal.prompt({
        title: 'New File',
        label: 'Enter file name (or leave blank for a scratchpad):',
      });
      
      if (newName === null) {
        this.editor.editorView?.focus();
        return;
      }
      
      let newPath;

      if (!newName.trim()) {
        newPath = await generateUniqueScratchpadPath(this.editor.gitClient);
      } else {
        const finalName = newName.trim();
        newPath = `/${finalName}`;
        
        try {
          const stat = await this.editor.gitClient.pfs.stat(newPath);
          const itemType = stat.isDirectory() ? 'folder' : 'file';
          await this.editor.sidebar.showAlert({ title: 'Creation Failed', message: `A ${itemType} named "${finalName}" already exists.` });
          return;
        } catch (e) {
          if (e.code !== 'ENOENT') {
            console.error('Error checking for file:', e);
            await this.editor.sidebar.showAlert({ title: 'Error', message: 'An unexpected error occurred.' });
            return;
          }
        }
      }

      window.thoughtform.workspace.openFile(this.editor.gitClient.gardenName, newPath);

    } finally {
    }
  }

  /**
   * Initiates the workflow for duplicating a file via a modal.
   * @param {string} path - The path of the file to duplicate.
   */
  async duplicateFile(path) {
    if (!path) return;
    
    try {
      const stat = await this.editor.gitClient.pfs.stat(path);
      if (stat.isDirectory()) {
        await this.editor.sidebar.showAlert({ title: 'Action Not Supported', message: 'Duplicating folders is not yet supported.' });
        return;
      }
    
      const directory = path.substring(0, path.lastIndexOf('/'));
      const originalFilename = path.substring(path.lastIndexOf('/') + 1);
      const defaultName = `${originalFilename.split('.').slice(0, -1).join('.') || originalFilename} (copy)${originalFilename.includes('.') ? '.' + originalFilename.split('.').pop() : ''}`;
        
      const newFilename = await Modal.prompt({
        title: 'Duplicate File',
        label: 'Enter name for duplicated file:',
        defaultValue: defaultName
      });
      
      if (newFilename === null) {
          this.editor.editorView?.focus();
          return;
      }
      
      if (!newFilename.trim()) return;
    
      const newPath = `${directory}/${newFilename.trim()}`;
      try {
        const rawContent = await this.editor.gitClient.readFile(path);
        await this.editor.gitClient.writeFile(newPath, rawContent);
        window.thoughtform.workspace.openFile(this.editor.gitClient.gardenName, newPath);
      } catch (e) {
        console.error('Error duplicating file:', e);
        await this.editor.sidebar.showAlert({ title: 'Error', message: `Failed to duplicate file: ${e.message}` });
      }
    } finally {
    }
  }
}