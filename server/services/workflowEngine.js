import { AgentRunner } from './agentRunner.js';
import { v4 as uuidv4 } from 'uuid';

export class WorkflowEngine {
    constructor(memoryManager, wss) {
        this.memoryManager = memoryManager;
        this.wss = wss;
        this.agentRunner = new AgentRunner(memoryManager, this.broadcast.bind(this));
        this.activeRuns = new Map();
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
