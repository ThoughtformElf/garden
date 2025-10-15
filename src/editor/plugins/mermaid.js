import { WidgetType, Decoration, ViewPlugin } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import mermaid from 'mermaid';

// Initialize Mermaid.js
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

// A cache to store rendered SVGs for performance.
const svgCache = new Map();

/**
 * The definitive, robust rendering function.
 * It uses the modern, promise-based version of the Mermaid API which correctly handles its
 * rendering context and avoids the `createElementNS` error.
 * @param {string} code - The Mermaid diagram source code.
 * @returns {Promise<string>} A promise that resolves with the SVG string or an error message.
 */
async function renderMermaidSvg(code) {
    if (svgCache.has(code)) {
        return svgCache.get(code);
    }

    try {
        const uniqueId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        
        // **THE DEFINITIVE FIX**:
        // We use the modern, promise-based mermaidAPI.render(). This version is designed for
        // asynchronous environments and correctly manages its own rendering context,
        // which completely solves the 'createElementNS' error.
        const { svg } = await mermaid.mermaidAPI.render(uniqueId, code);
        
        svgCache.set(code, svg);
        return svg;

    } catch (error) {
        // Create and cache an error message to display instead of a diagram.
        const errorMessage = `<div class="cm-mermaid-error-container"><pre class="cm-mermaid-error">Mermaid Error:\n${error.message}</pre></div>`;
        svgCache.set(code, errorMessage);
        return errorMessage;
    }
}

/**
 * The CodeMirror widget that will contain our rendered diagram.
 */
class MermaidWidget extends WidgetType {
  constructor(code) {
    super();
    this.code = code;
  }

  eq(other) {
    // Only re-render the widget if the source code has actually changed.
    return this.code === other.code;
  }

  toDOM() {
    const container = document.createElement('div');
    container.className = 'cm-mermaid-container';
    container.innerHTML = '<p>Loading diagram...</p>';

    // Defer the rendering to ensure the container is in the DOM.
    setTimeout(() => {
        if (container.isConnected) {
            renderMermaidSvg(this.code).then(svg => {
                container.innerHTML = svg;
            });
        }
    }, 0);
    
    return container;
  }
}

/**
 * Finds all mermaid code blocks and creates the appropriate widget decorations.
 */
function findMermaidBlocks(view) {
  const builder = new RangeSetBuilder();
  const tree = syntaxTree(view.state);

  tree.iterate({
    enter: (node) => {
      if (node.name === 'FencedCode') {
        const infoNode = node.node.getChild('CodeInfo');
        if (infoNode) {
          const infoText = view.state.doc.sliceString(infoNode.from, infoNode.to);
          
          if (infoText.trim() === 'mermaid') {
            const codeNode = node.node.getChild('CodeText');
            if (codeNode) {
              const code = view.state.doc.sliceString(codeNode.from, codeNode.to);
              
              builder.add(
                node.to,
                node.to,
                Decoration.widget({
                  widget: new MermaidWidget(code),
                  side: 1, // Place it after the content at this position.
                })
              );
            }
          }
        }
      }
    },
  });
  return builder.finish();
}

/**
 * The main ViewPlugin that orchestrates finding and decorating Mermaid blocks.
 */
export const mermaidPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = findMermaidBlocks(view);
    }
    update(update) {
      if (update.docChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
        this.decorations = findMermaidBlocks(update.view);
      }
    }
  },
  {
    decorations: v => v.decorations,
  }
);