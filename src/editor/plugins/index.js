// src/editor/plugins/index.js
import { hashtagPlugin } from './hashtags.js';
import { wikilinkPlugin } from './wikilinks.js';
import { checkboxPlugin } from './checkboxes.js';
import { timestampPlugin } from './timestamps.js';
import { linkPlugin } from './links.js';
import { blockquotePlugin } from './blockquotes.js';
import { rulerPlugin } from './ruler.js';

export const allHighlightPlugins = [
  hashtagPlugin,
  wikilinkPlugin,
  checkboxPlugin,
  timestampPlugin,
  linkPlugin,
  blockquotePlugin,
  rulerPlugin,
];
