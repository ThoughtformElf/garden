/*
Description:
A specialized exploration tool that recursively follows [[wikilinks]] to discover and assemble related information. Start with a piece of text that already contains wikilinks, and this tool will automatically read the content of those links, find more links within them, and repeat the process up to a certain depth.

This tool is best used *after* you have already used `readFile` to get initial content. It allows you to go deeper into the connections between notes.

**IMPORTANT**: The `initialContent` you provide MUST contain one or more `[[wikilinks]]` for the tool to have a starting point for its exploration.

Arguments:
- goal: The user's original goal or research question. This helps the tool filter for relevant information during its exploration.
- initialContent: The starting text, which MUST contain one or more [[wikilinks]] for the tool to begin.

Example Call (in JSON format):
{
  "goal": "understand the project's agentic computing features",
  "initialContent": "The main features are described in the [[README]]. It talks about [[P2P]] sync and [[Agentic Loop]]."
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

  if (onProgress) onProgress(`Exploring link: ${currentLink}`);

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

if (onProgress) onProgress('All links explored. Filtering for relevance...');

const relevancePrompt = `
  User Goal: "${goal}"
  Based ONLY on the User Goal, review the following knowledge base I have assembled. Remove any "Content from..." sections that are NOT relevant to the goal. Return only the filtered, relevant content.

  Knowledge Base:
  ${finalContext}
`;
const relevantContext = await ai.getCompletionAsString(relevancePrompt);

if (onProgress) onProgress('Relevance filtering complete.');
return relevantContext;