import { AgentRunner } from './agentRunner.js';
import { v4 as uuidv4 } from 'uuid';
import { loadContextOverlays, detectContext, validateOutput } from './promptLoader.js';

export class WorkflowEngine {
    constructor(memoryManager, wss) {
        this.memoryManager = memoryManager;
        this.wss = wss;
        this.agentRunner = new AgentRunner(memoryManager, this.broadcast.bind(this));
        this.activeRuns = new Map();
        this.contextOverlays = loadContextOverlays();
    }

    broadcast(message) {
        const data = JSON.stringify(message);
        this.wss.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(data);
            }
        });
    }

    async runWorkflow(workflowId, initialInput) {
        const workflow = this.memoryManager.getWorkflow(workflowId);
        if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

        const runId = uuidv4();
        const agents = this.memoryManager.getAgents();

        this.activeRuns.set(runId, { workflowId, status: 'running' });

        this.broadcast({
            type: 'workflow:start',
            runId,
            workflowId,
            timestamp: new Date().toISOString(),
        });

        try {
            // --- Context-aware loading ---
            // Detect input type once upfront and build a context overlay string
            const matchedContexts = detectContext(initialInput, this.contextOverlays);
            let contextOverlay = '';
            if (matchedContexts.length > 0) {
                const labels = matchedContexts.map(c => c.label);
                contextOverlay = matchedContexts.map(c => c.body).join('\n\n');

                this.broadcast({
                    type: 'agent:log',
                    runId,
                    agentId: '_system',
                    message: `Detected context: ${labels.join(', ')}`,
                    level: 'info',
                    timestamp: new Date().toISOString(),
                });
            }

            // Execute agents in order defined by the workflow steps
            let previousOutput = initialInput;
            const totalSteps = workflow.steps.length;

            for (let i = 0; i < workflow.steps.length; i++) {
                const step = workflow.steps[i];
                const agent = agents.find((a) => a.id === step.agentId);
                if (!agent) {
                    throw new Error(`Agent ${step.agentId} not found`);
                }

                // Build input for this step
                let stepInput = previousOutput;
                if (step.inputTemplate) {
                    stepInput = step.inputTemplate.replace('{{input}}', previousOutput);
                }

                // Inject context overlay into the first agent's input (Planner)
                // so all downstream agents inherit context-aware planning
                if (i === 0 && contextOverlay) {
                    stepInput = `${stepInput}\n\n[CONTEXT OVERLAY]\n${contextOverlay}\n[END CONTEXT OVERLAY]`;
                }

                this.broadcast({
                    type: 'workflow:progress',
                    runId,
                    currentStep: i + 1,
                    totalSteps,
                    agentId: agent.id,
                    agentName: agent.name,
                    timestamp: new Date().toISOString(),
                });

                this.broadcast({
                    type: 'agent:log',
                    runId,
                    agentId: agent.id,
                    message: `🚀 Starting: ${agent.name}`,
                    level: 'info',
                    timestamp: new Date().toISOString(),
                });

                // Run the agent — use streaming mode for AI Agent workflow
                // so intermediate output is visible in real-time
                const useStreaming = agent.id.startsWith('ai-agent-');
                let output;
                if (useStreaming) {
                    output = await this.agentRunner.runAgentStreaming(agent, stepInput, runId, (chunk) => {
                        this.broadcast({
                            type: 'agent:chunk',
                            runId,
                            agentId: agent.id,
                            chunk,
                            timestamp: new Date().toISOString(),
                        });
                    });
                } else {
                    output = await this.agentRunner.runAgent(agent, stepInput, runId);
                }

                // --- Validation hook ---
                // Check output against expected sections defined in the prompt file
                if (agent.expectedSections && agent.expectedSections.length > 0) {
                    const validation = validateOutput(output, agent.expectedSections);
                    if (!validation.valid) {
                        for (const warning of validation.warnings) {
                            this.broadcast({
                                type: 'agent:log',
                                runId,
                                agentId: agent.id,
                                message: `⚠️ Validation: ${warning}`,
                                level: 'warn',
                                timestamp: new Date().toISOString(),
                            });
                        }

                        this.broadcast({
                            type: 'workflow:validation',
                            runId,
                            agentId: agent.id,
                            agentName: agent.name,
                            valid: false,
                            missing: validation.missing,
                            timestamp: new Date().toISOString(),
                        });
                    } else {
                        this.broadcast({
                            type: 'agent:log',
                            runId,
                            agentId: agent.id,
                            message: `✓ Output validated — all expected sections present`,
                            level: 'success',
                            timestamp: new Date().toISOString(),
                        });
                    }
                }

                previousOutput = output;

                // Small delay between agents for visual effect
                await new Promise((r) => setTimeout(r, 500));
            }

            // Save workflow run to memory
            this.memoryManager.saveWorkflowRun(workflowId, {
                runId,
                input: initialInput,
                output: previousOutput,
                timestamp: new Date().toISOString(),
                status: 'completed',
            });

            this.broadcast({
                type: 'workflow:complete',
                runId,
                workflowId,
                output: previousOutput,
                timestamp: new Date().toISOString(),
            });

            this.activeRuns.delete(runId);
            return { runId, output: previousOutput };
        } catch (error) {
            this.broadcast({
                type: 'workflow:error',
                runId,
                workflowId,
                error: error.message,
                timestamp: new Date().toISOString(),
            });

            this.activeRuns.delete(runId);
            throw error;
        }
    }

    stopWorkflow(runId) {
        this.agentRunner.stopAll();
        this.activeRuns.delete(runId);

        this.broadcast({
            type: 'workflow:stopped',
            runId,
            timestamp: new Date().toISOString(),
        });
    }
}
