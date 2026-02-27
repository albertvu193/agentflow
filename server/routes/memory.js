import { Router } from 'express';

export const memoryRouter = Router();

// Get memory for an agent
memoryRouter.get('/:agentId', (req, res) => {
    const memory = req.app.locals.memoryManager.getMemory(req.params.agentId);
    res.json(memory);
});

// Add a learning for an agent
memoryRouter.post('/:agentId/learnings', (req, res) => {
    const { learning } = req.body;
    if (!learning) return res.status(400).json({ error: 'Learning text required' });

    req.app.locals.memoryManager.addLearning(req.params.agentId, learning);
    res.status(201).json({ status: 'added' });
});
