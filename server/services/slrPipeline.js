import { v4 as uuidv4 } from 'uuid';
import { getSLRPrompt } from '../data/slrPrompts.js';

// --- DOI / Title normalization (same logic as legacy Python app) ---
function normalize_doi(d) {
    if (!d) return null;
    let ds = String(d).trim();
    if (!ds) return null;
    let m = /HYPERLINK\("https?:\/\/(?:dx\.)?doi\.org\/([^"]+)"/i.exec(ds);
    if (m) return m[1].toLowerCase().trim();
    ds = ds.replace(/https?:\/\/(?:dx\.)?doi\.org\//i, '');
    return ds.toLowerCase().trim() || null;
}

function normalize_title(t) {
    if (!t) return '';
    let ts = String(t).toLowerCase().trim();
    ts = ts.replace(/[^a-z0-9\s]/g, '');
    ts = ts.replace(/\s+/g, ' ').trim();
    return ts;
}

function title_similarity(a, b) {
    const wa = new Set(a.split(' ').filter(Boolean));
    const wb = new Set(b.split(' ').filter(Boolean));
    if (wa.size === 0 || wb.size === 0) return 0.0;
    const intersection = new Set([...wa].filter(x => wb.has(x)));
    const union = new Set([...wa, ...wb]);
    return intersection.size / union.size;
}

// Robust JSON extraction from text that may contain markdown fences
function extractJson(text) {
    text = String(text).trim();
    try { return JSON.parse(text); } catch (e) { }
    const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenced) {
        try { return JSON.parse(fenced[1].trim()); } catch (e) { }
    }
    const braced = text.match(/\{[\s\S]*\}/);
    if (braced) {
        try { return JSON.parse(braced[0]); } catch (e) { }
    }
    throw new Error(`No valid JSON found in response: ${text.substring(0, 200)}`);
}

/** Steps: id maps to agent id, key is the result key used in liveFeed */
const SLR_STEPS = [
    { agentId: 'slr-screener', key: 'screen' },
    { agentId: 'slr-path-classifier', key: 'path' },
    { agentId: 'slr-cg-tagger', key: 'cg' },
    { agentId: 'slr-esg-tagger', key: 'esg' },
    { agentId: 'slr-meta-scorer', key: 'meta' },
];

export class SLRPipeline {
    constructor(memoryManager, wss, agentRunner) {
        this.memoryManager = memoryManager;
        this.wss = wss;
        this.agentRunner = agentRunner;
        this.activeJobs = new Map();
    }

    broadcast(jobId, message) {
        const data = JSON.stringify({ ...message, jobId, type: `slr:${message.type}` });
        this.wss.clients.forEach((client) => {
            if (client.readyState === 1) client.send(data);
        });
    }

    // ── Deduplication ──────────────────────────────────────────────────────────
    deduplicateArticles(articles) {
        const sourcePriority = { 'WoS': 0, 'Scopus': 1, 'Other': 2 };
        articles = [...articles].sort((a, b) =>
            (sourcePriority[a._source] ?? 2) - (sourcePriority[b._source] ?? 2)
        );

        const dupDetails = [];
        let dupCount = 0;
        const doiSeen = new Set();
        const titleSeen = new Set();
        const normTitles = [];
        const clean = [];

        for (const row of articles) {
            const title = row.Title || row.title || '';
            const doi = row.DOI || row.doi || '';
            const ndoi = normalize_doi(doi);
            const ntitle = normalize_title(title);
            let isDup = false;
            let reason = '';

            if (ndoi) {
                if (doiSeen.has(ndoi)) { isDup = true; reason = `Duplicate DOI: ${ndoi}`; }
                else doiSeen.add(ndoi);
            }

            if (!isDup && ntitle && ntitle.length > 10) {
                if (titleSeen.has(ntitle)) { isDup = true; reason = 'Duplicate title'; }
                else {
                    // Fuzzy match
                    for (const existing of normTitles) {
                        if (title_similarity(ntitle, existing) >= 0.85) {
                            isDup = true; reason = 'Fuzzy title match'; break;
                        }
                    }
                    if (!isDup) { titleSeen.add(ntitle); normTitles.push(ntitle); }
                }
            }

            if (isDup) { dupCount++; dupDetails.push({ title: String(title).substring(0, 80), reason }); }
            else clean.push(row);
        }

        return { clean, dupCount, dupDetails };
    }

    // ── Batch runner ───────────────────────────────────────────────────────────
    async runBatch(jobId, articles, maxArticles, concurrency = 3, model = null) {
        const job = this.activeJobs.get(jobId);
        if (!job) return;

        // Store model override so classifyArticle can use it
        job.model = model;

        const { clean, dupCount, dupDetails } = this.deduplicateArticles(articles);
        job.dedup = { removed: dupCount, kept: clean.length, details: dupDetails };

        const targetArticles = maxArticles > 0 ? clean.slice(0, maxArticles) : clean;
        job.total = targetArticles.length;
        job.progress = 0;
        job.status = 'screening';
        job.results = new Array(targetArticles.length).fill(null);

        // Send article titles so the UI can show them in the live feed
        const articleTitles = targetArticles.map(r => r.Title || r.title || '');
        this.broadcast(jobId, { type: 'start', total: job.total, dedup: job.dedup, articleTitles });

        // Get live agents so edits to systemPrompt in the UI are respected
        const getAgent = (id) => this.memoryManager.getAgent(id);

        const queue = targetArticles.map((row, index) => ({ row, index }));
        let running = 0;

        return new Promise((resolve, reject) => {
            const processNext = async () => {
                if (queue.length === 0 && running === 0) {
                    job.status = 'done';
                    this.broadcast(jobId, { type: 'done', results: job.results });
                    resolve(job.results);
                    return;
                }
                if (queue.length === 0) return;

                running++;
                const item = queue.shift();

                try {
                    job.results[item.index] = await this.classifyArticle(item, getAgent, jobId, model);
                } catch (e) {
                    job.results[item.index] = { _error: e.message, _original_row: item.row, step_results: {} };
                }

                job.progress++;
                this.broadcast(jobId, { type: 'progress', progress: job.progress, total: job.total });
                running--;
                processNext();
            };

            for (let i = 0; i < Math.min(concurrency, targetArticles.length); i++) {
                processNext();
            }
        });
    }

    // ── Article classification ─────────────────────────────────────────────────
    /**
     * Classifies a single article through the 5-step pipeline.
     *
     * Key design decisions:
     *  1. Use agent.systemPrompt directly — includes any edits made in Agent Editor.
     *  2. If screener returns Exclude or Background, skip steps 2–5 (saves cost, same as legacy).
     *  3. Maybe is treated the same as Include for subsequent steps (article needs full-text review,
     *     but we still extract what we can from the abstract).
     */
    async classifyArticle({ row, index }, getAgent, jobId, model = null) {
        const title = row.Title || row.title || '';
        const abstract = row.Abstract || row.abstract || '';
        const keywords = row.Author_Keywords || row.author_keywords || '';
        const articleText = `Title: ${title}\nKeywords: ${keywords}\nAbstract: ${String(abstract).substring(0, 2000)}`;

        const result = {
            _original_row: row,
            _index: index,
            step_results: {},
            raw: {},
        };

        let screenStatus = null;

        for (const step of SLR_STEPS) {
            const agent = getAgent(step.agentId);
            if (!agent) {
                result.step_results[step.key] = { error: `Agent ${step.agentId} not found. Ensure agents are initialized.` };
                continue;
            }

            // Gate: skip steps 2–5 for clearly excluded/background articles
            // Maybe articles still proceed — they need classification for priority review queue
            if (step.key !== 'screen' && (screenStatus === 'Exclude' || screenStatus === 'Background')) {
                result.step_results[step.key] = {
                    skipped: true,
                    reason: `Article screened as ${screenStatus}. Steps 2–5 skipped to conserve API calls.`
                };
                continue;
            }

            this.broadcast(jobId, { type: 'item_step', index, step: step.agentId, status: 'started' });

            try {
                // Use the agent's system prompt as stored (includes user edits + few-shot examples)
                // Fall back to the canonical prompt from slrPrompts.js only if the agent is missing
                const systemPrompt = (agent.systemPrompt && agent.systemPrompt.length > 100)
                    ? agent.systemPrompt
                    : getSLRPrompt(step.agentId.replace('slr-', '').replace('-', '_')
                        .replace('path_classifier', 'path')
                        .replace('cg_tagger', 'cg')
                        .replace('esg_tagger', 'esg')
                        .replace('meta_scorer', 'meta'));

                const agentConfig = { ...agent, systemPrompt };
                if (model) agentConfig.model = model;

                const rawOutput = await this.agentRunner.runAgent(
                    agentConfig,
                    articleText,
                    `slr-${jobId}-${index}`
                );

                result.raw[step.key] = rawOutput;

                let parsed;
                try {
                    parsed = extractJson(rawOutput);
                } catch (e) {
                    parsed = { error: `JSON parse failed: ${e.message}`, raw: rawOutput };
                }
                result.step_results[step.key] = parsed;

                // Track screen status to implement the Exclude/Background gate
                if (step.key === 'screen') {
                    screenStatus = parsed.status || null;
                }

            } catch (e) {
                result.step_results[step.key] = { error: e.message };
                if (step.key === 'screen') screenStatus = 'ERROR';
            }

            this.broadcast(jobId, {
                type: 'item_step',
                index,
                step: step.agentId,
                status: 'done',
                result: result.step_results[step.key],
            });
        }

        return result;
    }

    // ── Feedback / Self-improving loop ─────────────────────────────────────────
    /**
     * Appends a corrected example to the target agent's system prompt (in the few-shot section).
     * The correction becomes part of the agent's prompt for future runs.
     *
     * @param {string} agentId   - e.g. 'slr-screener'
     * @param {object} example   - { title, abstract, correctedOutput }
     */
    addTrainingExample(agentId, example) {
        const agent = this.memoryManager.getAgent(agentId);
        if (!agent) throw new Error(`Agent ${agentId} not found`);

        const exampleBlock = `\n### Correction Example (added by researcher)\nTitle: ${example.title}\nAbstract: ${String(example.abstract).substring(0, 500)}\nExpected output: ${JSON.stringify(example.correctedOutput)}\n`;

        // Append the example to the agent's system prompt
        const updatedPrompt = agent.systemPrompt + exampleBlock;
        this.memoryManager.saveAgent({ ...agent, systemPrompt: updatedPrompt });

        return { success: true, agentId, exampleAppended: exampleBlock };
    }
}
