import { WidgetType, Decoration, ViewPlugin } from '@codemirror/view';
import { RangeSetBuilder, EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Git } from '../../util/git-integration.js';
import { appContextField } from '../navigation.js';
import { EditorView } from '@codemirror/view';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { basicDark } from '../../util/theme.js';
import { getLanguageExtension } from '../languages.js';
import { highlightPluginsForEmbeds } from './index.js';


const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif'];
const videoExtensions = ['mp4', 'webm', 'mov', 'ogg'];
const audioExtensions = ['mp3', 'wav', 'flac'];
const mediaExtensions = [...imageExtensions, ...videoExtensions, ...audioExtensions];

function getMimeType(extension) {
  const ext = extension.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'webp': return 'image/webp';
    case 'avif': return 'image/avif';
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'mov': return 'video/quicktime';
    case 'ogg': return 'video/ogg';
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'flac': return 'audio/flac';
    default: return 'application/octet-stream';
  }
}

class EmbedWidget extends WidgetType {
  constructor(linkTarget, altText, type, view) {
    super();
    this.linkTarget = linkTarget;
    this.altText = altText;
    this.type = type; // 'internal' or 'external'
    this.view = view;
    this.objectURL = null;
  }

  eq(other) {
    return this.linkTarget === other.linkTarget && this.type === other.type;
  }

  toDOM() {
    const container = document.createElement('span');
    container.className = 'cm-embed-container';
    const extension = this.linkTarget.split('.').pop()?.toLowerCase().split('?')[0];

    if (this.type === 'external') {
      let element;
      if (videoExtensions.includes(extension)) {
        element = document.createElement('video');
        element.className = 'cm-embedded-video';
        element.controls = true;
      } else if (audioExtensions.includes(extension)) {
        element = document.createElement('audio');
        element.className = 'cm-embedded-audio';
        element.controls = true;
      } else {
        element = document.createElement('img');
        element.className = 'cm-embedded-image';
        element.alt = this.altText;
      }
      element.src = this.linkTarget;
      container.appendChild(element);
    } else { // 'internal'
      const placeholder = document.createElement('span');
      placeholder.className = 'cm-embed-placeholder';
      placeholder.textContent = `Loading: ${this.linkTarget}`;
      container.appendChild(placeholder);
      
      this.loadInternalContent(container).catch(err => {
        console.error(`Failed to load internal embed for ${this.linkTarget}:`, err);
        placeholder.textContent = `Error: ${this.linkTarget} not found.`;
        container.classList.add('cm-embed-error');
      });
    }
    
    return container;
  }
  
  async loadInternalContent(container) {
    const decodedTarget = decodeURIComponent(this.linkTarget);
    let path = decodedTarget;
    let garden = null;

    if (path.includes('#')) {
      [garden, path] = path.split('#');
    }
    
    const extension = path.split('.').pop()?.toLowerCase();
    
    const appContext = this.view.state.field(appContextField);
    let gitClient;

    if (garden && garden !== appContext.gitClient.gardenName) {
      gitClient = new Git(garden);
    } else {
      gitClient = appContext.gitClient;
    }
    
    const fullPath = path.startsWith('/') ? path : `/${path}`;

    if (mediaExtensions.includes(extension)) {
      const buffer = await gitClient.readFileAsBuffer(fullPath);

      if (!buffer) {
        throw new Error('File could not be read as a buffer.');
      }
      
      const mimeType = getMimeType(extension);
      const blob = new Blob([buffer], { type: mimeType });
      this.objectURL = URL.createObjectURL(blob);

      let element;
      if (imageExtensions.includes(extension)) {
          element = document.createElement('img');
          element.className = 'cm-embedded-image';
          element.alt = this.linkTarget;
      } else if (videoExtensions.includes(extension)) {
          element = document.createElement('video');
          element.className = 'cm-embedded-video';
          element.controls = true;
      } else if (audioExtensions.includes(extension)) {
          element = document.createElement('audio');
          element.className = 'cm-embedded-audio';
          element.controls = true;
      }

      element.src = this.objectURL;
      container.innerHTML = ''; // Clear placeholder
      container.appendChild(element);

      if (element.tagName === 'VIDEO' || element.tagName === 'AUDIO') {
          element.onerror = (e) => {
              console.error("Embedded media playback error:", e);
              container.innerHTML = `<span class="cm-embed-error">Error playing: ${this.linkTarget}</span>`;
          };
          element.load();
      }
    } else {
      // Handle text/code content
      const content = await gitClient.readFile(fullPath);
      
      if (content === null || content === undefined) {
           throw new Error('File content could not be read.');
      }

      container.innerHTML = ''; // Clear the "Loading..." placeholder
      container.classList.add('cm-embedded-content'); // Add class for styling

      // Create a minimal, read-only CodeMirror instance for the embed
      const embeddedEditorState = EditorState.create({
          doc: content,
          extensions: [
              basicDark,
              syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
              getLanguageExtension(path),
              EditorView.lineWrapping,
              EditorView.editable.of(false), // Make it read-only
              ...highlightPluginsForEmbeds // <-- THIS IS THE REFACTORED FIX
          ]
      });
      
      new EditorView({
          state: embeddedEditorState,
          parent: container
      });
    }
  }

  destroy() {
    if (this.objectURL) {
      URL.revokeObjectURL(this.objectURL);
    }
  }
}

function buildDecorations(view) {
  const builder = new RangeSetBuilder();
  const tree = syntaxTree(view.state);

  const selection = view.state.selection;
  const cursorLines = new Set();
  for (const range of selection.ranges) {
    cursorLines.add(view.state.doc.lineAt(range.head).number);
  }

  const isInsideCodeBlock = (pos) => {
    let node = tree.resolve(pos, 1);
    while (node) {
      if (node.name.includes('Code')) {
        return true;
      }
      node = node.parent;
    }
    return false;
  };

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    
    const internalEmbedRegex = /!\[\[([^\[\]]+?)\]\]/g;
    let match;
    while ((match = internalEmbedRegex.exec(text))) {
      const start = from + match.index;
      const line = view.state.doc.lineAt(start);
      
      if (isInsideCodeBlock(start) || cursorLines.has(line.number)) continue;

      const end = start + match[0].length;
      const linkTarget = match[1];
      
      // Always create the widget; it will handle whether to render as media or text.
      builder.add(
        start,
        end,
        Decoration.replace({
          widget: new EmbedWidget(linkTarget, linkTarget, 'internal', view),
        })
      );
    }

    const externalEmbedRegex = /!\[(.*?)\]\((.*?)\)/g;
    while ((match = externalEmbedRegex.exec(text))) {
      const start = from + match.index;
      const line = view.state.doc.lineAt(start);

      if (isInsideCodeBlock(start) || cursorLines.has(line.number)) continue;

      const end = start + match[0].length;
      const altText = match[1];
      const url = match[2];
      
      const extension = url.split('.').pop()?.toLowerCase()?.split('?')[0];
      if (url.startsWith('http') && mediaExtensions.includes(extension)) {
        builder.add(
          start,
          end,
          Decoration.replace({
            widget: new EmbedWidget(url, altText, 'external', view)
          })
        );
      }
    }
  }
  return builder.finish();
}

export const embedPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = buildDecorations(view);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged || update.selectionSet || syntaxTree(update.startState) !== syntaxTree(update.state)) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: v => v.decorations,
  }
);