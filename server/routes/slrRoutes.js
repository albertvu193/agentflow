import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs';

export const slrRouter = Router();

const upload = multer({ dest: '/tmp/agentflow_uploads/' });

function parseUploadedFile(filepath, originalname) {
    const ext = (originalname || filepath).split('.').pop().toLowerCase();
    let workbook;
    if (ext === 'csv') {
        // For CSV: read as buffer and parse with sheet_to_json to handle encoding issues
        const buffer = fs.readFileSync(filepath);
        workbook = xlsx.read(buffer, { type: 'buffer', raw: false });
    } else {
        workbook = xlsx.readFile(filepath);
    }
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    let data = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    return data;
}


// Detect whether a file is from WoS or Scopus by checking:
// 1. The original filename (most reliable: user keeps the export name)
// 2. Unique column names from each database
function detectSource(article, originalname) {
    const nameLower = (originalname || '').toLowerCase();
    const keys = Object.keys(article || {}).map(k => k.toLowerCase());

    // WoS: filename OR unique WoS column: 'article title', 'ut (unique wos id)'
    if (nameLower.includes('wos') || nameLower.includes('web of science') ||
        keys.includes('article title') || keys.includes('ut (unique wos id)')) {
        return 'WoS';
    }

    // Scopus: filename OR unique Scopus column: 'author(s) id', 'eid'
    if (nameLower.includes('scopus') ||
        keys.includes('author(s) id') || keys.includes('eid')) {
        return 'Scopus';
    }

    return 'Other';
}


// Upload file endpoint
slrRouter.post('/upload', upload.array('files'), (req, res) => {
    try {
        let allArticles = [];
        let fileInfo = [];

        for (let file of req.files) {
            let df = parseUploadedFile(file.path, file.originalname);

            // Clean up temp file after parsing
            try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
            let source = detectSource(df[0] || {}, file.originalname);

            /*
             * Column alias map — built from actual WoS and Scopus export columns:
             *
             * WoS:    Article Title, Author Full Names, Source Title, Publication Year
             * Scopus: Title, Authors, Source title (lowercase t), Year
             *
             * Normalise to: Title, Authors, Journal, Year, DOI, Abstract, Author_Keywords
             */
            const ALIAS_MAP = [
                // WoS title
                ['Article Title', 'Title'],
                ['Document Title', 'Title'],
                // Author
                ['Author Full Names', 'Authors'],
                ['Author full names', 'Authors'],
                // Journal — Scopus uses 'Source title' (lowercase t)
                ['Source Title', 'Journal'],
                ['Source title', 'Journal'],
                // Year
                ['Publication Year', 'Year'],
                // Abstract / keywords (in case lowercased)
                ['abstract', 'Abstract'],
                ['Author Keywords', 'Author_Keywords'],
                ['Index Keywords', 'Index_Keywords'],
                ['doi', 'DOI'],
            ];

            let cleanParts = df.map(row => {
                let cleanRow = { ...row };
                for (const [src, dest] of ALIAS_MAP) {
                    if (cleanRow[src] !== undefined && cleanRow[src] !== '' && !cleanRow[dest]) {
                        cleanRow[dest] = cleanRow[src];
                    }
                }
                cleanRow._source = source;
                return cleanRow;
            });

            // Filter out rows with no usable title
            cleanParts = cleanParts.filter(r => {
                const t = r.Title;
                return t && String(t).trim().length > 5;
            });

            allArticles = allArticles.concat(cleanParts);
            fileInfo.push({ filename: file.originalname, rows: cleanParts.length, source });
        }

        const batchId = uuidv4();
        req.app.locals.slrBatches = req.app.locals.slrBatches || new Map();
        req.app.locals.slrBatches.set(batchId, allArticles);

        res.json({
            batchId,
            files: fileInfo,
            totalRows: allArticles.length
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

slrRouter.post('/run', async (req, res) => {
    let { batchId, maxArticles, model } = req.body;
    let articles = req.app.locals.slrBatches?.get(batchId);
    if (!articles) return res.status(404).json({ error: "Batch not found" });

    let jobId = uuidv4();
    let slrPipeline = req.app.locals.slrPipeline;

    // Start asynchronously
    slrPipeline.activeJobs.set(jobId, { status: 'starting', progress: 0, total: articles.length });

    // Fire and forget — pass model so pipeline can override agent defaults
    slrPipeline.runBatch(jobId, articles, maxArticles, 3, model || null).then(results => {
        slrPipeline.activeJobs.get(jobId).results = results;
    }).catch(e => {
        const job = slrPipeline.activeJobs.get(jobId);
        if (job) { job.status = 'error'; job.error = e.message; }
        console.error(e);
    });

    res.json({ jobId });
});

slrRouter.get('/status/:jobId', (req, res) => {
    let job = req.app.locals.slrPipeline.activeJobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
});

/**
 * Feedback endpoint — append a corrected example to an SLR agent's system prompt.
 * This implements the "self-improving loop": researcher corrects a prediction in the UI
 * and the correction is stored in the agent's prompt as a few-shot example.
 *
 * Body: { agentId, title, abstract, correctedOutput }
 * agentId examples: 'slr-screener', 'slr-path-classifier', 'slr-cg-tagger', etc.
 */
slrRouter.post('/feedback', (req, res) => {
    try {
        const { agentId, title, abstract, correctedOutput } = req.body;
        if (!agentId || !title || !correctedOutput) {
            return res.status(400).json({ error: 'agentId, title, and correctedOutput are required' });
        }
        const slrPipeline = req.app.locals.slrPipeline;
        const result = slrPipeline.addTrainingExample(agentId, { title, abstract, correctedOutput });
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

