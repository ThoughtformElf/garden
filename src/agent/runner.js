import { getAllTools } from './manager/tool-manager.js';
import { Traversal } from './traversal.js';
import { Git } from '../util/git-integration.js';
import selectToolPromptTemplate from '../settings/prompts/select-tool.md?raw';
import critiqueStepPromptTemplate from '../settings/prompts/critique-step.md?raw';
import synthesizeAnswerPromptTemplate from '../settings/prompts/synthesize-answer.md?raw';

const MAX_LOOPS = 8;

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
            description: 'Call this tool with no arguments when you have gathered all necessary information and are ready to synthesize the final answer.',
            execute: async () => "Signal to finish task received.",
        });
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
            console.error("[TaskRunner] Orchestration failed:", e);
            streamController.enqueue(`**Agent Error:**\n> ${e.message}`);
            streamController.close();
        });

        return stream;
    }

    _sendStatus(stream, message) {
        stream.enqueue(`[STATUS] ${message}`);
    }

    _fillPrompt(template, vars) {
        return Object.entries(vars).reduce((acc, [key, value]) => acc.replace(new RegExp(`{{${key}}}`, 'g'), String(value)), template);
    }

    async _getJsonCompletion(prompt) {
        const responseText = await this.aiService.getCompletionAsString(prompt);
        try {
            const jsonMatch = responseText.match(/{\s*"thought":[\s\S]*}/);
            if (!jsonMatch) {
                 throw new Error("No valid JSON object with a 'thought' key found in the LLM response.");
            }
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("[TaskRunner] Failed to parse JSON from LLM response:", e);
            console.error("[TaskRunner] Raw response was:", responseText);
            throw new Error(`The AI assistant did not return a valid JSON plan. Raw response: ${responseText}`);
        }
    }

    async _orchestrate(goal, stream) {
        await this._initialize();
        this._sendStatus(stream, `Starting with goal: "${goal}"`);

        let scratchpad = `USER GOAL: ${goal}\n---\nINITIAL CONTEXT:\n${this.initialContext}\n---`;
        let loopCount = 0;
        let shouldFinish = false;
        
        const dependencies = { Traversal, Git };

        while (loopCount < MAX_LOOPS && !shouldFinish) {
            loopCount++;
            
            const toolList = Array.from(this.tools.values()).map(t => `- ${t.name}: ${t.description}`).join('\n');
            const selectToolPrompt = this._fillPrompt(selectToolPromptTemplate, { scratchpad, tool_list: toolList });
            
            this._sendStatus(stream, `Loop ${loopCount}/${MAX_LOOPS}: Thinking...`);
            
            let responseJson;
            try {
                responseJson = await this._getJsonCompletion(selectToolPrompt);
            } catch (error) {
                this._sendStatus(stream, `Error: AI returned an invalid plan. Retrying.`);
                scratchpad += `\nOBSERVATION: My previous response was not valid JSON. I must correct my output to follow the required format exactly. Error: ${error.message}`;
                continue;
            }
            
            const thought = responseJson.thought;
            const toolChoice = responseJson.action;

            this._sendStatus(stream, `Thought: ${thought}`);
            scratchpad += `\nTHOUGHT: ${thought}`;

            if (!toolChoice || !toolChoice.tool || !this.tools.has(toolChoice.tool)) {
                this._sendStatus(stream, `Error: AI chose an invalid tool. Retrying.`);
                scratchpad += `\nOBSERVATION: The last tool choice ('${toolChoice.tool}') was invalid. I must choose a tool from the provided list.`;
                continue;
            }

            if (toolChoice.tool === 'finish') {
                shouldFinish = true;
                scratchpad += `\nASSESSMENT: The goal is met. I will now synthesize the final answer.`;
                continue;
            }

            this._sendStatus(stream, `Action: ${toolChoice.tool}`);
            const tool = this.tools.get(toolChoice.tool);
            
            const context = { 
                git: this.gitClient, 
                ai: this.aiService,
                dependencies: dependencies
            };
            
            const observation = await tool.execute(toolChoice.args || {}, context);

            // --- THIS IS THE FIX ---
            // The arbitrary .substring(0, 2000) has been removed.
            scratchpad += `\nACTION: Called tool '${toolChoice.tool}' with args: ${JSON.stringify(toolChoice.args || {})}\nOBSERVATION: ${String(observation)}\n---`;
            // --- END OF FIX ---
        }

        if (shouldFinish) {
            this._sendStatus(stream, `Information gathering complete. Synthesizing final answer...`);
        } else {
            this._sendStatus(stream, `Max loops reached. Synthesizing answer with available context...`);
        }
        
        const synthesisPrompt = this._fillPrompt(synthesizeAnswerPromptTemplate, { goal, context_buffer: scratchpad });
        const finalAnswerStream = await this.aiService.getCompletion(synthesisPrompt);
        
        const reader = finalAnswerStream.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            stream.enqueue(value);
        }
        stream.close();
    }
}