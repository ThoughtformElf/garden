// src/editor/plugins/index.js
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
import { titleHeadingPlugin } from './title-headings.js'; // I am adding the new plugin here

// Combine all custom plugins into a single array for export.
export const allHighlightPlugins = [
  hashtagPlugin,
  wikilinkPlugin,
  checkboxPlugin,
  timestampPlugin,
  externalLinkPlugin,
  blockquotePlugin,
  rulerPlugin,
  embedPlugin,
  responseWrapperPlugin,
  promptWrapperPlugin,
  titleHeadingPlugin, // And including it in the exported array
];