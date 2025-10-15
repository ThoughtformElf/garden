import { WidgetType, Decoration, ViewPlugin } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import mermaid from 'mermaid';

// Initialize Mermaid.js
mermaid.initialize({
  startOnLoad: true,
  theme: 'base', // 'base' is required to use themeVariables
  securityLevel: 'loose',
  themeVariables: {
    /* * =========================================================================
     * Hardcoded values based on your theme's CSS variables.
     * =========================================================================
     */

    /* Base variables */
    background: '#050f0e',                // from --color-background-primary
    primaryColor: '#12ffbc',              // from --base-accent-action
    secondaryColor: '#07443b',       // from --color-border-primary
    
    primaryTextColor: '#000000',            // from --color-text-on-accent
    secondaryTextColor: '#ffffff',        // from --color-text-bright
    tertiaryTextColor: '#ffffff',         // from --color-text-bright
    
    lineColor: '#12ffbc',                 // from --base-accent-action
    textColor: '#dddddd',                 // from --color-text-primary

    mainBkg: '#12ffbc',                   // from --base-accent-action
    secondBkg: '#07443b',       // from --color-border-primary
    border1: '#12ffbc',                   // from --color-border-interactive
    border2: '#07443b',                   // from --color-border-primary
    arrowheadColor: '#dddddd',            // from --color-text-primary

    fontFamily: '"trebuchet ms", verdana, arial, sans-serif',
    fontSize: '1rem',
    labelBackground: 'rgba(0, 0, 0, 0.7)',// from --base-overlay
    THEME_COLOR_LIMIT: 12,

    /* Flowchart variables */
    nodeBkg: '#12ffbc',                   // from --base-accent-action
    nodeBorder: '#12ffbc',                // from --color-border-interactive
    clusterBkg: '#07443b',       // from --color-border-primary
    clusterBorder: '#07443b',             // from --color-border-primary
    defaultLinkColor: '#dddddd',          // from --color-text-primary
    titleColor: '#ffffff',                // from --color-text-bright
    edgeLabelBackground: '#050f0e',       // from --color-background-secondary

    /* Sequence Diagram variables */
    actorBorder: '#12ffbc',               // from --color-border-interactive
    actorBkg: '#12ffbc',                  // from --base-accent-action
    actorTextColor: '#000000',            // from --color-text-on-accent
    actorLineColor: '#3d996b',            // from --color-text-secondary
    signalColor: '#dddddd',               // from --color-text-primary
    signalTextColor: '#dddddd',           // from --color-text-primary
    labelBoxBkgColor: '#07443b',       // from --color-border-primary
    labelBoxBorderColor: '#07443b',       // from --color-border-primary
    labelTextColor: '#ffffff',            // from --color-text-bright
    loopTextColor: '#dddddd',             // from --color-text-primary
    noteBorderColor: '#eb9b27',           // from --base-accent-emphasis
    noteBkgColor: '#07443b',              // from --base-interactive
    noteTextColor: '#dddddd',             // from --color-text-primary
    activationBorderColor: '#12ffbc',     // from --color-border-interactive
    activationBkgColor: '#050f0e',        // from --color-background-tertiary
    sequenceNumberColor: '#000000',       // from --color-text-on-accent

    /* Gantt chart variables */
    sectionBkgColor: '#07443b',           // from --base-interactive
    altSectionBkgColor: '#050f0e',        // from --color-background-primary
    sectionBkgColor2: '#07443b',       // from --color-border-primary
    excludeBkgColor: 'rgba(50, 50, 50, 0.5)', // (custom value)
    taskBorderColor: '#12ffbc',           // from --color-border-interactive
    taskBkgColor: '#12ffbc',              // from --base-accent-action
    taskTextLightColor: '#000000',        // from --color-text-on-accent
    taskTextColor: '#000000',             // from --color-text-on-accent
    taskTextDarkColor: '#000000',         // from --color-text-on-accent
    taskTextOutsideColor: '#dddddd',      // from --color-text-primary
    taskTextClickableColor: '#4dc3f5',    // from --color-text-link
    activeTaskBorderColor: '#eb9b27',     // from --base-accent-emphasis
    activeTaskBkgColor: '#12ffbc',        // from --base-accent-action
    gridColor: '#07443b',                 // from --color-border-primary
    doneTaskBkgColor: '#12ffbc',          // from --base-syntax-done-bg -> --base-accent-action
    doneTaskBorderColor: '#12ffbc',       // from --base-accent-action
    critBorderColor: '#ff1342',           // from --base-accent-destructive
    critBkgColor: '#ff1342',              // from --base-accent-destructive
    todayLineColor: '#eb9b27',            // from --base-accent-emphasis
    vertLineColor: '#07443b',             // from --color-border-secondary
    
    /* C4 Diagram variables */
    personBorder: '#12ffbc',              // from --color-border-interactive
    personBkg: '#12ffbc',                 // from --base-accent-action

    /* Architecture Diagram variables */
    archEdgeColor: '#07443b',             // from --color-border-primary
    archEdgeArrowColor: '#dddddd',        // from --color-text-primary
    archEdgeWidth: '3',
    archGroupBorderColor: '#07443b',      // from --color-border-secondary
    archGroupBorderWidth: '2px',

    /* Entity Relationship Diagram variables */
    rowOdd: '#050f0e',                    // from --color-background-primary
    rowEven: '#07443b',                   // from --base-interactive
    
    /* State Diagram variables */
    labelColor: '#ffffff',                // from --color-text-bright
    errorBkgColor: '#ff1342',             // from --base-accent-destructive
    errorTextColor: '#ffffff',            // from --color-text-on-destructive
  }
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