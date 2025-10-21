/*
Description:
A powerful research tool that recursively explores a topic by following internal [[wikilinks]]. It starts from an initial piece of content, finds all wikilinks, reads their content, and repeats this process to build a comprehensive knowledge base.

This tool is best for broad research questions where you need to gather context from multiple connected notes within the user's garden.

**IMPORTANT**: If you just need to read a single, specific external webpage (like a reddit link or a news article), use the `readURL` tool instead. This tool is for exploring the internal knowledge base.
- IF THE USER MENTIONS "me", "I", "this", "our" - "this garden" "my notes" "yesterdays notes" "that chat" use this tool
- DO NOT USE `webSearch` to search [[wikilinks]] use this tool instead
- USE THIS TOOL TO LEARN ABOUT THE USER, YOURSELF, AND THIS INTERFACE

Arguments:
- goal: The user's original goal or research question. This helps the tool filter for relevant information later.
- initialContent: The starting text, which MUST contain one or more [[wikilinks]] for the tool to begin its exploration.

Example Call (in JSON format):
{
  "goal": "understand the project's agentic computing features",
  "initialContent": "The main features are described in the [[README]]."
}
*/

if (!args.goal || !args.initialContent) {
  return "Error: 'goal' and 'initialContent' are required.";
}

const MAX_DEPTH = 2;
const { goal, initialContent } = args;
const { git, ai, dependencies, onProgress, addSource } = context;

const { Traversal } = dependencies;
const traversal = new Traversal(git);

let finalContext = `--- Initial Content ---\n${initialContent}\n\n`;
const visited = new Set();
const initialLinks = traversal.extractWikilinks(initialContent);
const queue = initialLinks.map(link => ({ 
  link, 
  depth: 0, 
  sourceGardenName: git.gardenName 
}));

visited.add(null); 

while (queue.length > 0) {
  const { link: currentLink, depth, sourceGardenName } = queue.shift();
  if (!currentLink || depth >= MAX_DEPTH) continue;
  
  const visitedKey = `${sourceGardenName}#${currentLink}`;
  if (visited.has(visitedKey)) continue;
  visited.add(visitedKey);

  if (onProgress) onProgress(`Reading link: ${currentLink}`);

  let newContent = null;
  let sourceIdentifier = currentLink;
  let newContentSourceGarden = sourceGardenName;

  if (currentLink.startsWith('http')) {
      try {
          const baseUrl = localStorage.getItem('thoughtform_proxy_url')?.trim() || 'https://proxy.thoughtform.garden';
          const proxyUrl = `${baseUrl}?thoughtformgardenproxy=${encodeURIComponent(currentLink)}`;
          const response = await fetch(proxyUrl);
          if(response.ok) {
              newContent = await response.text();
              if (addSource) {
                  addSource(currentLink);
              }
          }
      } catch {}
  } else {
      const result = await traversal.readLinkContent(currentLink, sourceGardenName);
      if (result.content) {
          newContent = result.content;
          sourceIdentifier = result.fullIdentifier;
          newContentSourceGarden = result.gardenName;
      }
  }

  if (newContent) {
    finalContext += `--- Content from ${sourceIdentifier} ---\n${newContent}\n\n`;
    
    const nextLinks = traversal.extractWikilinks(newContent);
    if (onProgress && nextLinks.length > 0) onProgress(`... found ${nextLinks.length} new links.`);

    for (const nextLink of nextLinks) {
      const nextVisitedKey = `${newContentSourceGarden}#${nextLink}`;
      if (!visited.has(nextVisitedKey)) {
        queue.push({ 
          link: nextLink, 
          depth: depth + 1, 
          sourceGardenName: newContentSourceGarden 
        });
      }
    }
  }
}

if (onProgress) onProgress('All links read. Filtering for relevance...');

const relevancePrompt = `
  User Goal: "${goal}"
  Based ONLY on the User Goal, review the following knowledge base I have assembled. Remove any "Content from..." sections that are NOT relevant to the goal. Return only the filtered, relevant content.

  Knowledge Base:
  ${finalContext}
`;
const relevantContext = await ai.getCompletionAsString(relevancePrompt);

if (onProgress) onProgress('Relevance filtering complete.');
return relevantContext;