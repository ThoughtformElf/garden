import { getAllTools } from './manager/tool-manager.js';
import { Traversal } from './traversal.js';
import { Git } from '../util/git-integration.js';
import { countTokens } from 'gpt-tokenizer';
import selectToolPromptTemplate from '../gardens/settings/settings/prompts/select-tool.md?raw';
import critiqueStepPromptTemplate from '../gardens/settings/settings/prompts/critique-step.md?raw';
import synthesizeAnswerPromptTemplate from '../gardens/settings/settings/prompts/synthesize-answer.md?raw';

export class TaskRunner {
    constructor({ gitClient, aiService, initialContext }) {
        if (!gitClient || !aiService || initialContext === undefined) {
            throw new Error("TaskRunner requires gitClient, aiService, and initialContext.");
        }
        this.gitClient = gitClient;
        this.aiService = aiService;
        this.initialContext = initialContext;
        this.tools = new Map();
    }

    async _initialize() {
        this.tools = await getAllTools(this.gitClient.gardenName);
        this.tools.set('finish', {
            name: 'finish',
            description: 'Call this tool with NO ARGUMENTS when you have completed all research and are ready to synthesize the final answer.',
            execute: async () => "Signal to finish task received.",
        });
    }

    run(goal, signal) {
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

        this._orchestrate(goal, streamController, signal).catch(e => {
            if (e.name !== 'AbortError') {
                console.error("[TaskRunner] Orchestration failed:", e);
            }
            if (!streamController.controller.desiredSize === null) {
                streamController.error(e);
            }
        });

        return stream;
    }

    _sendStreamEvent(stream, type, message) {
        stream.enqueue(`[${type.toUpperCase()}] ${message}`);
    }

    _fillPrompt(template, vars) {
        return Object.entries(vars).reduce((acc, [key, value]) => acc.replace(new RegExp(`{{${key}}}`, 'g'), String(value)), template);
    }

    async _getJsonCompletion(prompt, aiService, signal) {
        const responseText = await aiService.getCompletionAsString(prompt, null, signal);
        try {
            const jsonMatch = responseText.match(/{\s*"thought":[\s\S]*}/);
            if (!jsonMatch) {
                 throw new Error("No valid JSON object with a 'thought' key found in the LLM response.");
            }
            return { responseText, responseJson: JSON.parse(jsonMatch[0]) };
        } catch (e) {
            console.error("[TaskRunner] Failed to parse JSON from LLM response:", e);
            console.error("[TaskRunner] Raw response was:", responseText);
            throw new Error(`The AI assistant did not return a valid JSON plan. Raw response: ${responseText}`);
        }
    }

    async _classifyError(errorMessage, ai, signal) {
        const classificationPrompt = `
You are an error analysis bot. Analyze the following error message from an API call.
Respond with ONLY ONE of the following classifications: CONTEXT_OVERFLOW, RATE_LIMIT, INVALID_JSON, API_KEY_ERROR, UNKNOWN_FAILURE.

- If the error indicates the input was too large, context window was exceeded, or a token quota was hit, classify as CONTEXT_OVERFLOW.
- If the error indicates too many requests are being sent too quickly, classify as RATE_LIMIT.
- If the error indicates a problem with the AI's own JSON output, classify as INVALID_JSON.
- If the error mentions an invalid or missing API key, classify as API_KEY_ERROR.
- For all other errors, classify as UNKNOWN_FAILURE.

Error Message: "${errorMessage}"

Classification:`;

        const classification = await ai.getCompletionAsString(classificationPrompt, null, signal);
        return classification.trim();
    }
    
    async _compressScratchpad(scratchpad, errorMessage, ai, signal, onProgress) {
        onProgress('Cognitive compression initiated...');
        
        const limitDetectionPrompt = `From the following error message, extract only the integer value for the token limit. If you cannot find one, respond with '8000'. Error: "${errorMessage}"`;
        onProgress('Analyzing context limit...');
        const limitStr = await ai.getCompletionAsString(limitDetectionPrompt, null, signal);
        const detectedLimit = parseInt(limitStr, 10) || 8000;
        onProgress(`Context limit detected: ~${detectedLimit.toLocaleString()} tokens.`);

        const safeBudget = detectedLimit * 0.5;

        const headerEndMarker = '---';
        const initialContextEnd = scratchpad.indexOf(headerEndMarker, scratchpad.indexOf('INITIAL CONTEXT'));
        if (initialContextEnd === -1) throw new Error("Compression failed: Could not find end of initial context.");
        
        const header = scratchpad.substring(0, initialContextEnd + headerEndMarker.length);
        let history = scratchpad.substring(initialContextEnd + headerEndMarker.length);

        const summaryMarker = '[COMPRESSED MEMORY]:';
        let existingSummary = '';
        const summaryIndex = history.indexOf(summaryMarker);
        if (summaryIndex !== -1) {
            const summaryEndIndex = history.indexOf('\n---', summaryIndex);
            existingSummary = history.substring(summaryIndex, summaryEndIndex);
            history = history.substring(summaryEndIndex);
        }
        
        if (history.trim().length === 0) throw new Error("Compression failed: No uncompressed history to process.");

        let chunkToSummarize = '';
        let remainingHistory = '';
        const allCycles = history.split('---').filter(c => c.trim());
        let tokensForChunk = 0;
        let cyclesInChunk = 0;

        for (const cycle of allCycles) {
            const cycleTokens = countTokens(cycle);
            if (tokensForChunk + cycleTokens < safeBudget) {
                chunkToSummarize += cycle + '---';
                tokensForChunk += cycleTokens;
                cyclesInChunk++;
            } else {
                remainingHistory += cycle + '---';
            }
        }
        
        if (cyclesInChunk === 0 && allCycles.length > 0) {
            onProgress('Warning: A single memory item is larger than the safe summarization budget. Truncating.');
            chunkToSummarize = allCycles[0].substring(0, safeBudget * 4); 
            remainingHistory = allCycles.slice(1).join('---');
        }

        const summarizationPrompt = `# Persona: You are a Memory Compression Module.\n# Your task is to read a sequence of an AI agent's memories and distill them into a concise, factual summary, preserving all key findings, decisions, and data points.\n\n# Memories to Summarize:\n---\n${chunkToSummarize}\n---\n\n# Concise Summary:`;
        onProgress(`Generating summary of oldest ${cyclesInChunk} steps...`);
        const newSummary = await ai.getCompletionAsString(summarizationPrompt, null, signal);
        onProgress('Memory compression complete.');
        
        const combinedSummary = `${existingSummary}\n- ${newSummary.trim()}`.replace(summaryMarker, '').trim();
        return `${header}\n\n${summaryMarker} ${combinedSummary}\n---${remainingHistory}`;
    }

    async _orchestrate(goal, stream, signal) {
        await this._initialize();
        this._sendStreamEvent(stream, 'status', `Starting with goal: "${goal}"`);

        let scratchpad = `USER GOAL: ${goal}\n---\nINITIAL CONTEXT:\n${this.initialContext}\n---`;
        let loopCount = 0;
        let shouldFinish = false;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        const readSources = new Set();
        
        const onTokenCounter = ({ input, output }) => {
            totalInputTokens += input;
            totalOutputTokens += output;
        };
        
        const trackedAiService = {
            getCompletion: (prompt, onTokenCount, passedSignal) => this.aiService.getCompletion(prompt, (d) => { onTokenCounter(d); if(onTokenCount) onTokenCount(d); }, passedSignal || signal),
            getCompletionAsString: (prompt, onTokenCount, passedSignal) => this.aiService.getCompletionAsString(prompt, (d) => { onTokenCounter(d); if(onTokenCount) onTokenCount(d); }, passedSignal || signal),
        };
        
        const dependencies = { Traversal, Git };

        while (!shouldFinish) {
            loopCount++;
            if (signal.aborted) throw new DOMException('Agent run was cancelled by the user.', 'AbortError');
            
            const toolList = Array.from(this.tools.values()).map(t => `- ${t.name}: ${t.description}`).join('\n');
            const selectToolPrompt = this._fillPrompt(selectToolPromptTemplate, { scratchpad, tool_list: toolList });
            
            const tokensBefore = { input: totalInputTokens, output: totalOutputTokens };

            let responseJson;
            try {
                // --- THIS IS THE FIX (Part 1): Send status update BEFORE the blocking call ---
                this._sendStreamEvent(stream, 'status', `Step ${loopCount}: Generating plan... (This may take a moment for local models)`);
                const result = await this._getJsonCompletion(selectToolPrompt, trackedAiService, signal);
                responseJson = result.responseJson;

            } catch (error) {
                if (error.name === 'AbortError') throw error;
                const errorMessage = error.message;

                this._sendStreamEvent(stream, 'status', 'An error occurred during planning. Analyzing...');
                const errorType = await this._classifyError(errorMessage, trackedAiService, signal);
                this._sendStreamEvent(stream, 'status', `Error classified as: ${errorType}`);

                switch (errorType) {
                    case 'CONTEXT_OVERFLOW':
                        scratchpad += `\nOBSERVATION: CRITICAL API FAILURE. The context window is full. You must compress your memory to continue. Error Details: "${errorMessage}"\n---`;
                        continue;

                    case 'RATE_LIMIT':
                        this._sendStreamEvent(stream, 'status', 'API rate limit reached. Waiting 5 seconds before retry...');
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        continue;

                    case 'INVALID_JSON':
                        scratchpad += `\nOBSERVATION: My previous response was not valid JSON. I must correct my output to follow the required format exactly. Error: ${errorMessage}\n---`;
                        continue;

                    case 'API_KEY_ERROR':
                        throw error;

                    case 'UNKNOWN_FAILURE':
                    default:
                        scratchpad += `\nOBSERVATION: An unknown API error occurred. I will retry the step. Error: ${errorMessage}\n---`;
                        continue;
                }
            }
            
            const stepInput = totalInputTokens - tokensBefore.input;
            const stepOutput = totalOutputTokens - tokensBefore.output;
            this._sendStreamEvent(stream, 'status', `[Step: ${stepInput.toLocaleString()} in / ${stepOutput.toLocaleString()} out]\n[Total: ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out]`);
            
            const thought = responseJson.thought;
            const toolChoice = responseJson.action;

            this._sendStreamEvent(stream, 'thought', thought);
            scratchpad += `\nTHOUGHT: ${thought}`;

            if (!toolChoice || !toolChoice.tool || !this.tools.has(toolChoice.tool)) {
                this._sendStreamEvent(stream, 'status', `Error: AI chose an invalid tool ('${toolChoice.tool}'). Retrying.`);
                scratchpad += `\nOBSERVATION: The last tool choice ('${toolChoice.tool}') was invalid. I must choose a tool from the provided list.`;
                continue;
            }

            if (toolChoice.tool === 'finish') {
                shouldFinish = true;
                scratchpad += `\nASSESSMENT: The goal is met. I will now synthesize the final answer.`;
                continue;
            }
            
            const toolToCall = toolChoice.tool;
            const toolArgs = toolChoice.args || {};
            
            this._sendStreamEvent(stream, 'action', `Using tool \`${toolToCall}\` with args: ${JSON.stringify(toolArgs)}`);
            const tool = this.tools.get(toolToCall);
            
            const context = { 
                git: this.gitClient, 
                ai: trackedAiService,
                dependencies: dependencies,
                onProgress: (message) => this._sendStreamEvent(stream, 'status', message),
                signal: signal,
                addSource: (url) => { if (url && typeof url === 'string') readSources.add(url); }
            };
            
            const tokensBeforeTool = { input: totalInputTokens, output: totalOutputTokens };

            let observation = await tool.execute(toolArgs, context);

            if (toolToCall === 'requestMemoryCompression') {
                try {
                    const signalData = JSON.parse(observation);
                    if (signalData.action === 'request_memory_compression') {
                        scratchpad = await this._compressScratchpad(scratchpad, signalData.details.errorMessage, trackedAiService, signal, (msg) => this._sendStreamEvent(stream, 'status', msg));
                        continue;
                    }
                } catch(e) { /* Not a valid signal */ }
            }

            const observationString = String(observation);
            const observationTokens = countTokens(observationString);
            const observationForDisplay = observationTokens > 250 ? `[Observation received (${observationTokens.toLocaleString()} tokens) and added to context.]` : observationString;
            this._sendStreamEvent(stream, 'observation', observationForDisplay);
            
            const toolInput = totalInputTokens - tokensBeforeTool.input;
            const toolOutput = totalOutputTokens - tokensBeforeTool.output;

            if (toolInput > 0 || toolOutput > 0) {
                this._sendStreamEvent(stream, 'status', `Tool LLM Usage:\n[Step: ${toolInput.toLocaleString()} in / ${toolOutput.toLocaleString()} out]\n[Total: ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out]`);
            }

            scratchpad += `\nACTION: Called tool '${toolToCall}' with args: ${JSON.stringify(toolArgs)}\nOBSERVATION: ${observationString}\n---`;
        }
        
        this._sendStreamEvent(stream, 'status', `Agent has finished its work. Synthesizing final answer...`);
        
        const synthesisPrompt = this._fillPrompt(synthesizeAnswerPromptTemplate, { goal, context_buffer: scratchpad });
        const finalAnswerStream = await trackedAiService.getCompletion(synthesisPrompt);
        
        const reader = finalAnswerStream.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            stream.enqueue(value);
        }
        
        if (readSources.size > 0) {
            stream.enqueue(`\n<!-- Sources: ${Array.from(readSources).join(', ')} -->`);
        }
        
        stream.enqueue(`\n<!-- Total Tokens: ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out -->`);
        stream.close();
    }
}