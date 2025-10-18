// @name buildKnowledgeBase
// @description The ONLY tool you need for research. Give it the user's goal and the initial context. It will automatically scan for all links (internal and external), read their content, intelligently decide which ones are relevant, and return a complete knowledge base ready for synthesis.
// @arg {string} goal - The user's original goal.
// @arg {string} initialContent - The initial text to start scanning from.

if (!args.goal || !args.initialContent) {
  return "Error: 'goal' and 'initialContent' are required.";
}

const MAX_DEPTH = 2;
const { goal, initialContent } = args;
const { git, ai, dependencies } = context;

// --- THIS IS THE FIX (Part 3) ---
// Dependencies are now correctly destructured from the context object.
const { Traversal } = dependencies;
const traversal = new Traversal(git);
// --- END OF FIX ---

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

  let newContent = null;
  let sourceIdentifier = currentLink;
  let newContentSourceGarden = sourceGardenName;

  if (currentLink.startsWith('http')) {
      try {
          const proxyUrl = `https://proxy.thoughtform.garden?thoughtformgardenproxy=${encodeURIComponent(currentLink)}`;
          const response = await fetch(proxyUrl);
          if(response.ok) newContent = await response.text();
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

const relevancePrompt = `
  User Goal: "${goal}"
  Based ONLY on the User Goal, review the following knowledge base I have assembled. Remove any "Content from..." sections that are NOT relevant to the goal. Return only the filtered, relevant content.

  Knowledge Base:
  ${finalContext}
`;
const relevantContext = await ai.getCompletionAsString(relevancePrompt);

return relevantContext;