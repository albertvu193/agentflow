import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const agentsRouter = Router();

// Get all agents
agentsRouter.get('/', (req, res) => {
    const agents = req.app.locals.memoryManager.getAgents();
    res.json(agents);
});

// Get single agent
agentsRouter.get('/:id', (req, res) => {
    const agent = req.app.locals.memoryManager.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
});

// Create agent
agentsRouter.post('/', (req, res) => {
    const agent = {
        id: uuidv4(),
        name: req.body.name || 'New Agent',
        role: req.body.role || '',
        systemPrompt: req.body.systemPrompt || 'You are a helpful assistant.',
        icon: req.body.icon || '🤖',
        model: req.body.model || 'sonnet',
        ...req.body,
    };
    req.app.locals.memoryManager.saveAgent(agent);
    res.status(201).json(agent);
});

// Update agent
agentsRouter.put('/:id', (req, res) => {
    const existing = req.app.locals.memoryManager.getAgent(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Agent not found' });

    const updated = { ...existing, ...req.body, id: req.params.id };
    req.app.locals.memoryManager.saveAgent(updated);
    res.json(updated);
});

// Delete agent
agentsRouter.delete('/:id', (req, res) => {
    req.app.locals.memoryManager.deleteAgent(req.params.id);
    res.status(204).send();
});
