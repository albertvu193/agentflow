import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import fs from 'fs';
import { PDFParse } from 'pdf-parse';

export const kristenRouter = Router();

const upload = multer({
    dest: '/tmp/agentflow_uploads/',
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Upload PDF and extract text
kristenRouter.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const buffer = fs.readFileSync(req.file.path);
        const parser = new PDFParse({ data: buffer });
        const textResult = await parser.getText();

        const fullText = textResult.text || '';
        const pageCount = textResult.total || 0;

        const paperId = uuidv4();
        req.app.locals.kristenPapers = req.app.locals.kristenPapers || new Map();
        req.app.locals.kristenPapers.set(paperId, {
            text: fullText,
            filename: req.file.originalname,
            pages: pageCount,
        });

        // Clean up temp file
        fs.unlinkSync(req.file.path);

        res.json({
            paperId,
            filename: req.file.originalname,
            pages: pageCount,
            textLength: fullText.length,
            preview: fullText.substring(0, 500),
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Run the insights pipeline on an uploaded paper
kristenRouter.post('/run', async (req, res) => {
    const { paperId } = req.body;
    const paper = req.app.locals.kristenPapers?.get(paperId);
    if (!paper) return res.status(404).json({ error: 'Paper not found' });

    const jobId = uuidv4();
    const workflowEngine = req.app.locals.workflowEngine;
    const memoryManager = req.app.locals.memoryManager;
    const agentRunner = workflowEngine.agentRunner;
    const broadcast = workflowEngine.broadcast.bind(workflowEngine);

    // Store job state
    req.app.locals.kristenJobs = req.app.locals.kristenJobs || new Map();
    req.app.locals.kristenJobs.set(jobId, { status: 'running', result: null });

    // Run asynchronously
    (async () => {
        try {
            const agent = memoryManager.getAgent('paper-insights');
            if (!agent) throw new Error('paper-insights agent not found');

            broadcast({
                type: 'kristen:start',
                jobId,
                filename: paper.filename,
                timestamp: new Date().toISOString(),
            });

            const input = `Analyze this research paper (${paper.filename}, ${paper.pages} pages):\n\n${paper.text}`;
            const result = await agentRunner.runAgent(agent, input, jobId);

            req.app.locals.kristenJobs.get(jobId).status = 'done';
            req.app.locals.kristenJobs.get(jobId).result = result;

            broadcast({
                type: 'kristen:done',
                jobId,
                result,
                timestamp: new Date().toISOString(),
            });
        } catch (e) {
            req.app.locals.kristenJobs.get(jobId).status = 'error';
            req.app.locals.kristenJobs.get(jobId).error = e.message;

            broadcast({
                type: 'kristen:error',
                jobId,
                error: e.message,
                timestamp: new Date().toISOString(),
            });
        }
    })();

    res.json({ jobId });
});

kristenRouter.get('/status/:jobId', (req, res) => {
    const job = req.app.locals.kristenJobs?.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
});
