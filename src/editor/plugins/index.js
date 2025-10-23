import { hashtagPlugin } from './hashtags.js';
import { wikilinkPlugin } from './wikilinks.js';
import { checkboxPlugin } from './checkboxes.js';
import { timestampPlugin } from './timestamps.js';
import { externalLinkPlugin } from './external-links.js';
import { blockquotePlugin } from './blockquotes.js';
import { rulerPlugin } from './ruler.js';
import { embedPlugin } from './embeds.js';
import { responseWrapperPlugin } from './response-wrapper.js';
import { promptWrapperPlugin } from './prompt-wrapper.js';
import { titleHeadingPlugin } from './title-headings.js';
import { mermaidPlugin } from './mermaid.js';

/**
 * A list of all syntax highlighting plugins that are safe to use inside
 * an embedded editor. This list explicitly EXCLUDES the embedPlugin itself
 * to prevent infinite recursion (embeds within embeds).
 */
export const highlightPluginsForEmbeds = [
  hashtagPlugin,
  wikilinkPlugin,
  checkboxPlugin,
  timestampPlugin,
  externalLinkPlugin,
  blockquotePlugin,
  rulerPlugin,
  responseWrapperPlugin,
  promptWrapperPlugin,
  titleHeadingPlugin,
  mermaidPlugin,
];

/**
 * The complete list of all custom plugins for the main editor.
 * It includes the embed plugin.
 */
export const allHighlightPlugins = [
  ...highlightPluginsForEmbeds,
  embedPlugin,
];