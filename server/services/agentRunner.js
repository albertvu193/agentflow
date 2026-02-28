import { spawn } from 'child_process';

export class AgentRunner {
    constructor(memoryManager, broadcast) {
        this.memoryManager = memoryManager;
        this.broadcast = broadcast;
        this.activeProcesses = new Map();
    }

    async runAgent(agent, input, runId) {
        const agentId = agent.id;

        // Build memory context from past runs
        const memoryContext = this.memoryManager.getMemoryContext(agentId);

        // Build the full prompt with memory + input
        const fullPrompt = this._buildPrompt(agent, input, memoryContext);

        this.broadcast({
            type: 'agent:status',
            runId,
            agentId,
            status: 'working',
            action: 'Starting...',
            timestamp: new Date().toISOString(),
        });

        return new Promise((resolve, reject) => {
            const args = [
                '-p',
                '--output-format', 'json',
                '--system-prompt', agent.systemPrompt,
                '--no-session-persistence',
            ];

            if (agent.model) {
                args.push('--model', agent.model);
            }

            const child = spawn('claude', args, {
                env: { ...process.env },
                stdio: ['pipe', 'pipe', 'pipe'],
            });

            this.activeProcesses.set(`${runId}:${agentId}`, child);

            let stdout = '';
            let stderr = '';

            child.stdin.write(fullPrompt);
            child.stdin.end();

            // Stream progress updates
            const progressInterval = setInterval(() => {
                this.broadcast({
                    type: 'agent:status',
                    runId,
                    agentId,
                    status: 'working',
                    action: 'Processing with Claude...',
                    timestamp: new Date().toISOString(),
                });
            }, 2000);

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
                // Log stderr as progress
                this.broadcast({
                    type: 'agent:log',
                    runId,
                    agentId,
                    message: data.toString().trim(),
                    level: 'info',
                    timestamp: new Date().toISOString(),
                });
            });

            child.on('close', (code) => {
                clearInterval(progressInterval);
                this.activeProcesses.delete(`${runId}:${agentId}`);

                if (code !== 0) {
                    this.broadcast({
                        type: 'agent:status',
                        runId,
                        agentId,
                        status: 'error',
                        action: `Exited with code ${code}`,
                        timestamp: new Date().toISOString(),
                    });

                    this.broadcast({
                        type: 'agent:log',
                        runId,
                        agentId,
                        message: `Error: ${stderr || 'Process exited with code ' + code}`,
                        level: 'error',
                        timestamp: new Date().toISOString(),
                    });

                    reject(new Error(stderr || `Process exited with code ${code}`));
                    return;
                }

                let result = '';
                try {
                    const parsed = JSON.parse(stdout);
                    result = parsed.result || stdout;
                } catch {
                    result = stdout;
                }

                // Save to memory
                this.memoryManager.saveRunResult(agentId, {
                    input,
                    output: result,
                    timestamp: new Date().toISOString(),
                    runId,
                });

                this.broadcast({
                    type: 'agent:status',
                    runId,
                    agentId,
                    status: 'done',
                    action: 'Completed',
                    timestamp: new Date().toISOString(),
                });

                this.broadcast({
                    type: 'agent:output',
                    runId,
                    agentId,
                    output: result,
                    timestamp: new Date().toISOString(),
                });

                this.broadcast({
                    type: 'agent:log',
                    runId,
                    agentId,
                    message: `✅ Completed successfully`,
                    level: 'success',
                    timestamp: new Date().toISOString(),
                });

                resolve(result);
            });

            child.on('error', (err) => {
                clearInterval(progressInterval);
                this.activeProcesses.delete(`${runId}:${agentId}`);

                this.broadcast({
                    type: 'agent:status',
                    runId,
                    agentId,
                    status: 'error',
                    action: err.message,
                    timestamp: new Date().toISOString(),
                });

                reject(err);
            });
        });
    }

    /**
     * Run an agent with streaming — broadcasts text chunks as they arrive.
     * Does NOT use --output-format json so stdout streams in real-time.
     */
    async runAgentStreaming(agent, input, runId, onChunk) {
        const agentId = agent.id;
        const memoryContext = this.memoryManager.getMemoryContext(agentId);
        const fullPrompt = this._buildPrompt(agent, input, memoryContext);

        this.broadcast({
            type: 'agent:status',
            runId,
            agentId,
            status: 'working',
            action: 'Starting...',
            timestamp: new Date().toISOString(),
        });

        return new Promise((resolve, reject) => {
            const args = [
                '-p',
                '--system-prompt', agent.systemPrompt,
                '--no-session-persistence',
            ];

            if (agent.model) {
                args.push('--model', agent.model);
            }

            const child = spawn('claude', args, {
                env: { ...process.env },
                stdio: ['pipe', 'pipe', 'pipe'],
            });

            this.activeProcesses.set(`${runId}:${agentId}`, child);

            let accumulated = '';

            child.stdin.write(fullPrompt);
            child.stdin.end();

            child.stdout.on('data', (data) => {
                const chunk = data.toString();
                accumulated += chunk;
                if (onChunk) onChunk(chunk, accumulated);
            });

            child.stderr.on('data', (data) => {
                this.broadcast({
                    type: 'agent:log',
                    runId,
                    agentId,
                    message: data.toString().trim(),
                    level: 'info',
                    timestamp: new Date().toISOString(),
                });
            });

            child.on('close', (code) => {
                this.activeProcesses.delete(`${runId}:${agentId}`);

                if (code !== 0) {
                    this.broadcast({
                        type: 'agent:status',
                        runId,
                        agentId,
                        status: 'error',
                        action: `Exited with code ${code}`,
                        timestamp: new Date().toISOString(),
                    });
                    reject(new Error(`Process exited with code ${code}`));
                    return;
                }

                this.memoryManager.saveRunResult(agentId, {
                    input,
                    output: accumulated,
                    timestamp: new Date().toISOString(),
                    runId,
                });

                this.broadcast({
                    type: 'agent:status',
                    runId,
                    agentId,
                    status: 'done',
                    action: 'Completed',
                    timestamp: new Date().toISOString(),
                });

                resolve(accumulated);
            });

            child.on('error', (err) => {
                this.activeProcesses.delete(`${runId}:${agentId}`);
                reject(err);
            });
        });
    }

    _buildPrompt(agent, input, memoryContext) {
        let prompt = '';

        if (memoryContext) {
            prompt += `[MEMORY FROM PAST RUNS]\n${memoryContext}\n[END MEMORY]\n\n`;
        }

        if (agent.role) {
            prompt += `Your role: ${agent.role}\n\n`;
        }

        prompt += `Task input:\n${input}`;

        return prompt;
    }

    stopAll() {
        for (const [key, child] of this.activeProcesses) {
            child.kill('SIGTERM');
            this.activeProcesses.delete(key);
        }
    }
}
