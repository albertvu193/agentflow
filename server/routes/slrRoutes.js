import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import * as xlsx from 'xlsx';

export const slrRouter = Router();

const upload = multer({ dest: '/tmp/agentflow_uploads/' });

function parseUploadedFile(filepath) {
    const workbook = xlsx.readFile(filepath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    let data = xlsx.utils.sheet_to_json(sheet);
    return data;
}

function detectSource(article, filepath) {
    let keys = Object.keys(article || {}).map(k => k.toLowerCase());
    let pathLower = filepath.toLowerCase();

    if (keys.includes('ut (unique wos id)') || pathLower.includes('wos') || keys.includes('article title')) {
        return 'WoS';
    }
    if (keys.includes('eid') || pathLower.includes('scopus') || keys.includes('author(s) id') || keys.includes('source')) {
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
            let df = parseUploadedFile(file.path);
            let source = detectSource(df[0], file.path);

            // Apply alias map
            let cleanParts = df.map(row => {
                let cleanRow = { ...row };
                const aliases = {
                    "Article Title": "Title", "title": "Title", "Document Title": "Title",
                    "Author Full Names": "Authors", "authors": "Authors",
                    "Source Title": "Journal", "source": "Journal",
                    "Publication Year": "Year", "year": "Year",
                    "doi": "DOI",
                    "abstract": "Abstract",
                    "Author Keywords": "Author_Keywords"
                };
                for (let k in aliases) {
                    if (cleanRow[k] !== undefined) {
                        cleanRow[aliases[k]] = cleanRow[k];
                    }
                }
                cleanRow._source = source;
                return cleanRow;
            });

            // Filter out empty titles
            cleanParts = cleanParts.filter(r => r.Title && String(r.Title).length > 5);

            allArticles = allArticles.concat(cleanParts);
            fileInfo.push({ filename: file.originalname, rows: cleanParts.length, source });
        }

        // We will do dedup exactly before the run, or we can just send back the total array
        // For simplicity, we just store the uploaded batch in memory temporarily
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

    // Fire and forget
    slrPipeline.runBatch(jobId, articles, maxArticles, 3).then(results => {
        slrPipeline.activeJobs.get(jobId).results = results;
    }).catch(e => console.error(e));

    res.json({ jobId });
});

slrRouter.get('/status/:jobId', (req, res) => {
    let job = req.app.locals.slrPipeline.activeJobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
});
