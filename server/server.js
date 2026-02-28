import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { agentsRouter } from './routes/agents.js';
import { workflowsRouter } from './routes/workflows.js';
import { memoryRouter } from './routes/memory.js';
import { slrRouter } from './routes/slrRoutes.js';
import { kristenRouter } from './routes/kristenRoutes.js';
import { WorkflowEngine } from './services/workflowEngine.js';
import { SLRPipeline } from './services/slrPipeline.js';
import { MemoryManager } from './services/memoryManager.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

// Initialize services
const memoryManager = new MemoryManager();
const workflowEngine = new WorkflowEngine(memoryManager, wss);
const slrPipeline = new SLRPipeline(memoryManager, wss, workflowEngine.agentRunner);

// Make services available to routes
app.locals.memoryManager = memoryManager;
app.locals.workflowEngine = workflowEngine;
app.locals.slrPipeline = slrPipeline;

// Routes
app.use('/api/agents', agentsRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/slr', slrRouter);
app.use('/api/kristen', kristenRouter);

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('🔌 Client connected');

    // Send current state on connect
    ws.send(JSON.stringify({
        type: 'init',
        agents: memoryManager.getAgents(),
        workflows: memoryManager.getWorkflows(),
    }));

    ws.on('close', () => {
        console.log('🔌 Client disconnected');
    });
});

// Prevent server crash on unhandled errors
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception (server staying alive):', err.message);
});
process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection (server staying alive):', err?.message || err);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`\n🚀 Agent Workflow Server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws\n`);
});
