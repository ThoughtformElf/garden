import { WidgetType, Decoration, ViewPlugin } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import mermaid from 'mermaid';

// Initialize Mermaid.js. This configuration tells it to wait for our explicit render calls,
// sets a dark theme to match the editor, and uses a loose security level to allow for complex diagrams.
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

/**
 * A CodeMirror Widget that renders a Mermaid diagram.
 */
class MermaidWidget extends WidgetType {
  constructor(code, view) {
    super();
    this.code = code;
    this.view = view;
  }

  eq(other) {
    return this.code === other.code;
  }

  toDOM() {
    const container = document.createElement('div');
    container.className = 'cm-mermaid-container';

    try {
      // Generate a unique ID for each diagram to avoid conflicts.
      const uniqueId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      
      // Use the Mermaid API to render the diagram from the code.
      // The callback receives the SVG code and we inject it into our container.
      mermaid.render(uniqueId, this.code, (svgCode, bindFunctions) => {
        container.innerHTML = svgCode;
        if (bindFunctions) {
          bindFunctions(container);
        }
      });
    } catch (error) {
      // If Mermaid fails to parse the diagram, show an error message.
      container.innerHTML = `<pre class="cm-mermaid-error">Mermaid Error:\n${error.message}</pre>`;
    }
    
    return container;
  }

  // Clicks inside the rendered SVG should not move the editor cursor.
  ignoreEvent() {
    return true;
  }
}

/**
 * Finds all mermaid code blocks in the document and creates decorations.
 * @param {EditorView} view - The current CodeMirror editor view.
 * @returns {DecorationSet} A set of decorations to apply.
 */
function findMermaidBlocks(view) {
  const builder = new RangeSetBuilder();
  const tree = syntaxTree(view.state);
  
  // Get the line number of the current cursor to avoid rendering the block being edited.
  const cursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;

  tree.iterate({
    enter: (node) => {
      // We're looking for fenced code blocks in the Markdown syntax tree.
      if (node.name === 'FencedCode') {
        const infoNode = node.node.getChild('CodeInfo');
        if (infoNode) {
          const infoText = view.state.doc.sliceString(infoNode.from, infoNode.to);
          
          // Check if the language is 'mermaid'.
          if (infoText.trim() === 'mermaid') {
            const codeNode = node.node.getChild('CodeText');
            if (codeNode) {
              const code = view.state.doc.sliceString(codeNode.from, codeNode.to);
              const blockStartLine = view.state.doc.lineAt(node.from).number;
              const blockEndLine = view.state.doc.lineAt(node.to).number;

              // Only create the widget if the user's cursor is outside this block.
              if (cursorLine < blockStartLine || cursorLine > blockEndLine) {
                builder.add(
                  node.from,
                  node.to,
                  Decoration.replace({
                    widget: new MermaidWidget(code, view),
                  })
                );
              }
            }
          }
        }
      }
    },
  });
  return builder.finish();
}

/**
 * The main CodeMirror ViewPlugin for rendering Mermaid diagrams.
 */
export const mermaidPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = findMermaidBlocks(view);
    }
    update(update) {
      // Re-evaluate decorations if the document, viewport, or selection changes.
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = findMermaidBlocks(update.view);
      }
    }
  },
  {
    decorations: v => v.decorations,
  }
);