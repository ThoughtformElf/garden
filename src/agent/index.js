import { Traversal } from './traversal.js';
import triagePromptTemplate from './prompts/triage_links.md?raw';
import critiquePromptTemplate from './prompts/critique_context.md?raw';
import synthesizePromptTemplate from './prompts/synthesize_answer.md?raw';

const MAX_TRAVERSAL_DEPTH = 2;
const MAX_CRITIQUE_LOOPS = 2;

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

        while (critiqueLoops < MAX_CRITIQUE_LOOPS) {
            critiqueLoops++;
            console.log(`[Agent] Starting critique loop #${critiqueLoops}`);

            console.log(`[Agent] Traversing knowledge graph (Depth limit: ${MAX_TRAVERSAL_DEPTH})...`);
            // --- FIX: Pass the initial content and garden name to start the traversal ---
            const traversalContext = await this._traverse(goal, initialContent, visited, 0, this.gitClient.gardenName);
            contextBuffer += traversalContext;

            console.log(`[Agent] Critiquing gathered context...`);
            const critique = await this._critique(goal, contextBuffer);

            if (critique.is_sufficient) {
                console.log("%c[Agent] Critique passed. Context is sufficient.", 'color: green;');
                break;
            } else {
                console.warn(`[Agent] Critique failed. Gaps identified:`, critique.gaps);
                if (critiqueLoops >= MAX_CRITIQUE_LOOPS) {
                     console.warn(`[Agent] Max critique loops reached. Synthesizing with available info.`);
                } else {
                    console.log("[Agent] No re-entry mechanism. Proceeding to synthesis.");
                    break;
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
    
    // --- FIX: Method signature now includes currentGardenName ---
    async _traverse(goal, currentFileContent, visited, depth, currentGardenName) {
        if (depth >= MAX_TRAVERSAL_DEPTH) return '';

        // --- FIX: Links are extracted ONLY from the current file's content ---
        const links = this.traversal.extractWikilinks(currentFileContent);
        if (links.length === 0) return '';
        
        // Unvisited check is still against the global visited set
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
            // --- FIX: Pass the currentGardenName to resolve relative links correctly ---
            const { content, fullIdentifier, gardenName: fileGarden } = await this.traversal.readLinkContent(link, currentGardenName);
            
            if (content !== null && !visited.has(fullIdentifier)) {
                visited.add(fullIdentifier);
                console.log(`[Agent] Reading content from: ${fullIdentifier}`);
                newContext += `## Context from ${fullIdentifier}\n\n${content}\n\n---\n\n`;
                
                // --- FIX: Recurse with the NEW file's content and the garden it came from ---
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