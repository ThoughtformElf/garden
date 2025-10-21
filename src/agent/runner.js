import { getAllTools } from './manager/tool-manager.js';
import { Traversal } from './traversal.js';
import { Git } from '../util/git-integration.js';
import { countTokens } from 'gpt-tokenizer';
import selectToolPromptTemplate from '../settings/prompts/select-tool.md?raw';
import critiqueStepPromptTemplate from '../settings/prompts/critique-step.md?raw';
import synthesizeAnswerPromptTemplate from '../settings/prompts/synthesize-answer.md?raw';

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
            description: 'Call this tool when you have completed all research, verified your findings from multiple sources, and are ready to synthesize the final, comprehensive answer.',
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
            // Propagate the error to the stream so the UI handler can catch it.
            streamController.error(e);
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

    async _orchestrate(goal, stream, signal) {
        await this._initialize();
        this._sendStreamEvent(stream, 'status', `Starting with goal: "${goal}"`);

        let scratchpad = `USER GOAL: ${goal}\n---\nINITIAL CONTEXT:\n${this.initialContext}\n---`;
        let loopCount = 0;
        let shouldFinish = false;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        
        const onTokenCountholder = ({ input, output }) => {
            totalInputTokens += input;
            totalOutputTokens += output;
        };
        
        const trackedAiService = {
            getCompletion: (prompt, onTokenCount) => this.aiService.getCompletion(prompt, onTokenCount, signal),
            getCompletionAsString: (prompt, onTokenCount) => this.aiService.getCompletionAsString(prompt, onTokenCount, signal),
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
                const result = await this._getJsonCompletion(selectToolPrompt, trackedAiService, signal);
                responseJson = result.responseJson;
            } catch (error) {
                if (error.name === 'AbortError') throw error;
                if (error.message.includes('API key')) throw error;
                
                this._sendStreamEvent(stream, 'status', `Error: AI returned an invalid plan. Retrying.`);
                scratchpad += `\nOBSERVATION: My previous response was not valid JSON. I must correct my output to follow the required format exactly. Error: ${error.message}`;
                continue;
            }
            
            const stepInput = totalInputTokens - tokensBefore.input;
            const stepOutput = totalOutputTokens - tokensBefore.output;
            this._sendStreamEvent(stream, 'status', `Step ${loopCount}: Planning...\n[Step: ${stepInput.toLocaleString()} in / ${stepOutput.toLocaleString()} out]\n[Total: ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out]`);
            
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
                signal: signal
            };
            
            const tokensBeforeTool = { input: totalInputTokens, output: totalOutputTokens };

            const observation = await tool.execute(toolArgs, context);
            const observationString = String(observation);
            
            let observationForDisplay;
            const observationTokens = countTokens(observationString);
            if (observationTokens > 250) {
                observationForDisplay = `[Observation received (${observationTokens.toLocaleString()} tokens) and added to context.]`;
            } else {
                observationForDisplay = observationString;
            }
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
        
        stream.enqueue(`\n<!-- Total Tokens: ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out -->`);
        stream.close();
    }
}