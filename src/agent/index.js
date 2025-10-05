import { Traversal } from './traversal.js';
import triagePromptTemplate from './prompts/triage_links.md?raw';
import critiquePromptTemplate from './prompts/critique_context.md?raw';
import synthesizePromptTemplate from './prompts/synthesize_answer.md?raw';

const MAX_TRAVERSAL_DEPTH = 2;
const MAX_CRITIQUE_LOOPS = 2;

// --- NEW HELPER FUNCTIONS ---

/**
 * Extracts all unique external URLs from a given text content.
 * Handles both naked URLs and Markdown-style links.
 * @param {string} content - The text to parse.
 * @returns {Set<string>} A Set of unique URL strings.
 */
function extractExternalLinks(content) {
    const urls = new Set();
    // Regex for naked URLs and markdown links
    const urlRegex = /(https?:\/\/[^\s"'`\]\)]+)|\[[^\]]+\]\((https?:\/\/[^\s"'`\]\)]+)\)/g;
    let match;
    while ((match = urlRegex.exec(content))) {
        // match[2] is the captured group for markdown links, match[1] for naked links.
        let url = match[2] || match[1];
        if (url) {
            // --- THIS IS THE FIX (Part 1) ---
            // Trim common trailing punctuation that might be accidentally included by the regex.
            url = url.replace(/[.,;:`\])\s]+$/, '');
            urls.add(url);
        }
    }
    return urls;
}

/**
 * Fetches the content of a URL via the configured proxy.
 * @param {string} targetUrl - The external URL to fetch.
 * @returns {Promise<string>} A formatted string for the context buffer.
 */
async function fetchExternalContent(targetUrl) {
    try {
        const userDefinedProxy = localStorage.getItem('thoughtform_proxy_url');
        const proxyRoot = userDefinedProxy || 'https://proxy.thoughtform.garden';
        
        // Ensure there's no trailing slash on the root and add one before the query
        const proxyUrl = `${proxyRoot.replace(/\/$/, '')}?thoughtformgardenproxy=${encodeURIComponent(targetUrl)}`;

        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Proxy request failed with status ${response.status}: ${errorText}`);
        }
        
        const cleanedText = await response.text();
        return `<context><website src="${targetUrl}">${cleanedText}</website></context>\n\n---\n\n`;

    } catch (error) {
        console.error(`[Agent] Failed to fetch URL via proxy: ${targetUrl}`, error);
        // Return a formatted error message to be included in the context
        return `<context><website src="${targetUrl}">Error: Could not retrieve content. ${error.message}</website></context>\n\n---\n\n`;
    }
}


export class Agent {
    constructor({ gitClient, aiService, startingFilePath }) {
        this.gitClient = gitClient;
        this.aiService = aiService;
        this.traversal = new Traversal(this.gitClient);
        this.startingFilePath = startingFilePath;
    }

    run(goal) {
        const streamController = {
            controller: null,
            enqueue(chunk) { this.controller?.enqueue(chunk); },
            close() { this.controller?.close(); },
            error(e) { this.controller?.error(e); }
        };
        
        const stream = new ReadableStream({
            start(controller) {
                streamController.controller = controller;
            }
        });

        this._orchestrate(goal, streamController).catch(e => {
            console.error("[Agent] Orchestration failed:", e);
            streamController.enqueue(`**Agent Error:**\n> ${e.message}`);
            streamController.close();
        });

        return stream;
    }

    async _orchestrate(goal, stream) {
        console.log(`%c[Agent] Starting run with goal: "${goal}"`, 'font-weight: bold; color: blue;');

        let contextBuffer = '';
        const visited = new Set();
        let critiqueLoops = 0;

        const initialContent = await this.gitClient.readFile(this.startingFilePath);
        contextBuffer += `## Context from ${this.startingFilePath}\n\n${initialContent}\n\n---\n\n`;
        visited.add(this.startingFilePath);
        console.log(`[Agent] Reading starting file: ${this.startingFilePath}`);
        
        // --- THIS IS THE FIX (Part 2) ---
        // This set now tracks any URL we have *attempted* to fetch, success or fail.
        const attemptedExternalFetches = new Set();

        while (critiqueLoops < MAX_CRITIQUE_LOOPS) {
            critiqueLoops++;
            console.log(`[Agent] Starting critique loop #${critiqueLoops}`);

            // 1. Traverse internal wikilinks first to gather more local context.
            console.log(`[Agent] Traversing knowledge graph (Depth limit: ${MAX_TRAVERSAL_DEPTH})...`);
            const traversalContext = await this._traverse(goal, initialContent, visited, 0, this.gitClient.gardenName);
            contextBuffer += traversalContext;

            // 2. Triage and fetch external links based on the goal and gathered context.
            const availableExternalLinks = extractExternalLinks(contextBuffer + '\n' + goal);
            const unfetchedLinks = Array.from(availableExternalLinks).filter(link => !attemptedExternalFetches.has(link));

            if (unfetchedLinks.length > 0) {
                console.log(`[Agent] Found ${unfetchedLinks.length} un-fetched external link(s). Triaging...`);
                const triagePrompt = this._fillPrompt(triagePromptTemplate, {
                    goal,
                    context_summary: contextBuffer.substring(0, 2000) + '...',
                    links: JSON.stringify(unfetchedLinks)
                });
                const triageResult = await this._getJsonCompletion(triagePrompt);
                const relevantLinks = triageResult.relevant_links || [];
                
                if (relevantLinks.length > 0) {
                    console.log(`%c[Agent] Found relevant external links: ${relevantLinks.join(', ')}. Fetching sequentially...`, 'color: green');
                    for (const link of relevantLinks) {
                        // Add to the set *before* fetching to prevent retries.
                        attemptedExternalFetches.add(link);
                        const externalContext = await fetchExternalContent(link);
                        contextBuffer += externalContext;
                    }
                } else {
                    console.log('[Agent] No relevant external links found by triage.');
                }
            }

            // 3. Critique the combined context.
            console.log(`[Agent] Critiquing gathered context...`);
            const critique = await this._critique(goal, contextBuffer);

            if (critique.is_sufficient) {
                console.log("%c[Agent] Critique passed. Context is sufficient.", 'color: green;');
                break;
            } else {
                console.warn(`[Agent] Critique failed. Gaps identified:`, critique.gaps);
                if (critiqueLoops >= MAX_CRITIQUE_LOOPS) {
                     console.warn(`[Agent] Max critique loops reached. Synthesizing with available info.`);
                }
            }
        }

        console.log(`%c[Agent] Synthesizing final answer...`, 'font-weight: bold; color: blue;');
        const synthesisPrompt = this._fillPrompt(synthesizePromptTemplate, { goal, context_buffer: contextBuffer });
        const finalAnswerStream = await this.aiService.getCompletion(synthesisPrompt);
        
        const reader = finalAnswerStream.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            stream.enqueue(value);
        }
        
        stream.close();
        console.log("%c[Agent] Run finished.", 'font-weight: bold;');
    }
    
    async _traverse(goal, currentFileContent, visited, depth, currentGardenName) {
        if (depth >= MAX_TRAVERSAL_DEPTH) return '';

        const links = this.traversal.extractWikilinks(currentFileContent);
        if (links.length === 0) return '';
        
        const unvisitedLinks = links.filter(link => !visited.has(link));
        if (unvisitedLinks.length === 0) return '';

        console.log(`[Agent] Depth ${depth} (in ${currentGardenName}): Found unvisited links:`, unvisitedLinks);
        
        const triagePrompt = this._fillPrompt(triagePromptTemplate, {
            goal,
            context_summary: currentFileContent.substring(0, 2000) + '...',
            links: JSON.stringify(unvisitedLinks)
        });

        const triageResult = await this._getJsonCompletion(triagePrompt);
        const relevantLinks = triageResult.relevant_links || [];
        
        if (relevantLinks.length === 0) {
            console.log(`[Agent] Depth ${depth}: No relevant links found by triage.`);
            return '';
        }
        
        console.log(`%c[Agent] Depth ${depth}: Found relevant links: ${relevantLinks.join(', ')}`, 'color: green');
        
        let newContext = '';
        for (const link of relevantLinks) {
            const { content, fullIdentifier, gardenName: fileGarden } = await this.traversal.readLinkContent(link, currentGardenName);
            
            if (content !== null && !visited.has(fullIdentifier)) {
                visited.add(fullIdentifier);
                console.log(`[Agent] Reading content from: ${fullIdentifier}`);
                newContext += `## Context from ${fullIdentifier}\n\n${content}\n\n---\n\n`;
                
                newContext += await this._traverse(goal, content, visited, depth + 1, fileGarden);
            }
        }
        return newContext;
    }

    async _critique(goal, contextBuffer) {
        const critiquePrompt = this._fillPrompt(critiquePromptTemplate, {
            goal,
            context_buffer: contextBuffer
        });
        return this._getJsonCompletion(critiquePrompt);
    }
    
    async _getJsonCompletion(prompt) {
        const stream = await this.aiService.getCompletion(prompt);
        const reader = stream.getReader();
        let fullResponse = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullResponse += value;
        }

        try {
            const jsonMatch = fullResponse.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})/);
            if (!jsonMatch) throw new Error("No JSON object found in the LLM response.");
            const jsonString = jsonMatch[1] || jsonMatch[2];
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("[Agent] Failed to parse JSON from LLM response:", e);
            console.error("[Agent] Raw response was:", fullResponse);
            throw new Error("The AI assistant did not return valid JSON. Please try again.");
        }
    }
    
    _fillPrompt(template, vars) {
        let filled = template;
        for (const [key, value] of Object.entries(vars)) {
            filled = filled.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        }
        return filled;
    }
}