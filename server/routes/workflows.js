import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const workflowsRouter = Router();

// Get all workflows
workflowsRouter.get('/', (req, res) => {
    const workflows = req.app.locals.memoryManager.getWorkflows();
    res.json(workflows);
});

// Get single workflow
workflowsRouter.get('/:id', (req, res) => {
    const workflow = req.app.locals.memoryManager.getWorkflow(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json(workflow);
});

// Create workflow
workflowsRouter.post('/', (req, res) => {
    const workflow = {
        id: uuidv4(),
        name: req.body.name || 'New Workflow',
        description: req.body.description || '',
        steps: req.body.steps || [],
        ...req.body,
    };
    req.app.locals.memoryManager.saveWorkflow(workflow);
    res.status(201).json(workflow);
});

// Update workflow
workflowsRouter.put('/:id', (req, res) => {
    const existing = req.app.locals.memoryManager.getWorkflow(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Workflow not found' });

    const updated = { ...existing, ...req.body, id: req.params.id };
    req.app.locals.memoryManager.saveWorkflow(updated);
    res.json(updated);
});

// Delete workflow
workflowsRouter.delete('/:id', (req, res) => {
    req.app.locals.memoryManager.deleteWorkflow(req.params.id);
    res.status(204).send();
});

// Run a workflow
workflowsRouter.post('/:id/run', async (req, res) => {
    try {
        const input = req.body.input || 'Begin the workflow.';
        const result = await req.app.locals.workflowEngine.runWorkflow(req.params.id, input);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stop a running workflow
workflowsRouter.post('/stop/:runId', (req, res) => {
    req.app.locals.workflowEngine.stopWorkflow(req.params.runId);
    res.json({ status: 'stopped' });
});
