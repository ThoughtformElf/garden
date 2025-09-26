import { WidgetType, Decoration, ViewPlugin } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Git } from '../../util/git-integration.js';
import { appContextField } from '../navigation.js';

const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif'];

function getMimeType(extension) {
  const ext = extension.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'webp': return 'image/webp';
    case 'avif': return 'image/avif';
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

    if (this.type === 'external') {
      const image = document.createElement('img');
      image.src = this.linkTarget;
      image.alt = this.altText;
      image.className = 'cm-embedded-image';
      container.appendChild(image);
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
    // FIX: Decode the URI component to handle spaces and other characters.
    const decodedTarget = decodeURIComponent(this.linkTarget);
    let path = decodedTarget;
    let garden = null;

    if (path.includes('#')) {
      [garden, path] = path.split('#');
    }
    
    const extension = path.split('.').pop()?.toLowerCase();
    if (!imageExtensions.includes(extension)) {
        container.textContent = ``; // Phase 2: Handle non-image transclusion. For now, hide.
        container.style.display = 'none';
        return;
    }

    const appContext = this.view.state.field(appContextField);
    let gitClient;

    if (garden && garden !== appContext.gitClient.gardenName) {
      gitClient = new Git(garden);
    } else {
      gitClient = appContext.gitClient;
    }
    
    const fullPath = path.startsWith('/') ? path : `/${path}`;
    const buffer = await gitClient.readFileAsBuffer(fullPath);

    if (!buffer) {
      throw new Error('File could not be read as a buffer.');
    }
    
    const mimeType = getMimeType(extension);
    const blob = new Blob([buffer], { type: mimeType });
    this.objectURL = URL.createObjectURL(blob);

    const image = document.createElement('img');
    image.src = this.objectURL;
    image.alt = this.linkTarget;
    image.className = 'cm-embedded-image';

    container.innerHTML = ''; // Clear placeholder
    container.appendChild(image);
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

  const isInsideCodeBlock = (pos) => {
    let node = tree.resolve(pos, 1); // Bias to the right, important for start of a token
    while (node) {
      // Check for FencedCode, CodeBlock, InlineCode, etc.
      if (node.name.includes('Code')) {
        return true;
      }
      node = node.parent;
    }
    return false;
  };

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    
    // --- Internal Embeds: ![[wikilink.png]] ---
    const internalEmbedRegex = /!\[\[([^\[\]]+?)\]\]/g;
    let match;
    while ((match = internalEmbedRegex.exec(text))) {
      const start = from + match.index;
      
      // --- SYNTAX CHECK: Skip if inside a code block ---
      if (isInsideCodeBlock(start)) continue;

      const end = start + match[0].length;
      const linkTarget = match[1];

      builder.add(
        start,
        end,
        Decoration.replace({
          widget: new EmbedWidget(linkTarget, linkTarget, 'internal', view),
        })
      );
    }

    // --- External Embeds: ![alt](url) ---
    const externalEmbedRegex = /!\[(.*?)\]\((.*?)\)/g;
    while ((match = externalEmbedRegex.exec(text))) {
      const start = from + match.index;
      
      // --- SYNTAX CHECK: Skip if inside a code block ---
      if (isInsideCodeBlock(start)) continue;

      const end = start + match[0].length;
      const altText = match[1];
      const url = match[2];
      
      const extension = url.split('.').pop()?.toLowerCase()?.split('?')[0];
      if (url.startsWith('http') && imageExtensions.includes(extension)) {
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
      if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: v => v.decorations,
  }
);