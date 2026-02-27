import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDefaults } from '../data/defaults.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(process.env.HOME, '.agent-viz');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

export class MemoryManager {
    constructor() {
        ensureDir(DATA_DIR);
        ensureDir(path.join(DATA_DIR, 'runs'));
        this._initDefaults();
    }

    _initDefaults() {
        const agentsFile = path.join(DATA_DIR, 'agents.json');
        const workflowsFile = path.join(DATA_DIR, 'workflows.json');
        const memoryFile = path.join(DATA_DIR, 'memory.json');

        const defaults = getDefaults();

        if (!fs.existsSync(agentsFile)) {
            fs.writeFileSync(agentsFile, JSON.stringify(defaults.agents, null, 2));
        }
        if (!fs.existsSync(workflowsFile)) {
            fs.writeFileSync(workflowsFile, JSON.stringify(defaults.workflows, null, 2));
        }
        if (!fs.existsSync(memoryFile)) {
            fs.writeFileSync(memoryFile, JSON.stringify({}, null, 2));
        }
    }

    // --- Agents ---
    getAgents() {
        return this._readJSON('agents.json');
    }

    getAgent(id) {
        return this.getAgents().find((a) => a.id === id);
    }

    saveAgent(agent) {
        const agents = this.getAgents();
        const idx = agents.findIndex((a) => a.id === agent.id);
        if (idx >= 0) {
            agents[idx] = { ...agents[idx], ...agent, updatedAt: new Date().toISOString() };
        } else {
            agents.push({ ...agent, createdAt: new Date().toISOString() });
        }
        this._writeJSON('agents.json', agents);
        return agent;
    }

    deleteAgent(id) {
        const agents = this.getAgents().filter((a) => a.id !== id);
        this._writeJSON('agents.json', agents);
    }

    // --- Workflows ---
    getWorkflows() {
        return this._readJSON('workflows.json');
    }

    getWorkflow(id) {
        return this.getWorkflows().find((w) => w.id === id);
    }

    saveWorkflow(workflow) {
        const workflows = this.getWorkflows();
        const idx = workflows.findIndex((w) => w.id === workflow.id);
        if (idx >= 0) {
            workflows[idx] = { ...workflows[idx], ...workflow, updatedAt: new Date().toISOString() };
        } else {
            workflows.push({ ...workflow, createdAt: new Date().toISOString() });
        }
        this._writeJSON('workflows.json', workflows);
        return workflow;
    }

    deleteWorkflow(id) {
        const workflows = this.getWorkflows().filter((w) => w.id !== id);
        this._writeJSON('workflows.json', workflows);
    }

    // --- Memory ---
    getMemory(agentId) {
        const memory = this._readJSON('memory.json');
        return memory[agentId] || { runs: [], learnings: [] };
    }

    getMemoryContext(agentId) {
        const memory = this.getMemory(agentId);
        if (!memory.runs.length && !memory.learnings.length) return '';

        let context = '';

        if (memory.learnings.length > 0) {
            context += 'Key learnings from past runs:\n';
            memory.learnings.forEach((l) => {
                context += `- ${l}\n`;
            });
            context += '\n';
        }

        // Include summaries of last 3 runs
        const recentRuns = memory.runs.slice(-3);
        if (recentRuns.length > 0) {
            context += `Recent run summaries (${recentRuns.length} of ${memory.runs.length} total):\n`;
            recentRuns.forEach((run) => {
                context += `- [${run.timestamp}]: Input: "${run.input?.substring(0, 100)}..." → Output: "${run.output?.substring(0, 200)}..."\n`;
            });
        }

        return context;
    }

    saveRunResult(agentId, result) {
        const memory = this._readJSON('memory.json');
        if (!memory[agentId]) {
            memory[agentId] = { runs: [], learnings: [] };
        }
        memory[agentId].runs.push(result);

        // Keep only last 50 runs per agent
        if (memory[agentId].runs.length > 50) {
            memory[agentId].runs = memory[agentId].runs.slice(-50);
        }

        this._writeJSON('memory.json', memory);

        // Also save full run log
        const runDir = path.join(DATA_DIR, 'runs');
        const runFile = path.join(runDir, `${result.runId}_${agentId}.json`);
        fs.writeFileSync(runFile, JSON.stringify(result, null, 2));
    }

    addLearning(agentId, learning) {
        const memory = this._readJSON('memory.json');
        if (!memory[agentId]) {
            memory[agentId] = { runs: [], learnings: [] };
        }
        memory[agentId].learnings.push(learning);
        this._writeJSON('memory.json', memory);
    }

    saveWorkflowRun(workflowId, run) {
        const runsFile = path.join(DATA_DIR, 'runs', `workflow_${run.runId}.json`);
        fs.writeFileSync(runsFile, JSON.stringify({ workflowId, ...run }, null, 2));
    }

    // --- Helpers ---
    _readJSON(filename) {
        const filepath = path.join(DATA_DIR, filename);
        try {
            return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        } catch {
            return [];
        }
    }

    _writeJSON(filename, data) {
        const filepath = path.join(DATA_DIR, filename);
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    }
}
