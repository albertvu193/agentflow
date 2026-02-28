import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getSLRPrompt } from '../data/slrPrompts.js';
import { Worker } from 'worker_threads'; // or we can use the existing AgentRunner

// For agent runner, we will emulate the thread pool by running them concurrently
// using Promise.all or similar, since AgentRunner spawns a child process for each.

function normalize_doi(d) {
    if (!d) return null;
    let ds = String(d).trim();
    if (!ds) return null;
    let m = /HYPERLINK\("https?:\/\/(?:dx\.)?doi\.org\/([^"]+)"/i.exec(ds);
    if (m) return m[1].toLowerCase().trim();
    ds = ds.replace(/https?:\/\/(?:dx\.)?doi\.org\//i, '');
    return ds.toLowerCase().trim();
}

function normalize_title(t) {
    if (!t) return "";
    let ts = String(t).toLowerCase().trim();
    ts = ts.replace(/[^a-z0-9\s]/g, '');
    ts = ts.replace(/\s+/g, ' ').trim();
    return ts;
}

function title_similarity(a, b) {
    const wa = new Set(a.split(' '));
    const wb = new Set(b.split(' '));
    if (wa.size === 0 || wb.size === 0) return 0.0;
    const intersection = new Set([...wa].filter(x => wb.has(x)));
    const union = new Set([...wa, ...wb]);
    return intersection.size / union.size;
}

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
            if (client.readyState === 1) {
                client.send(data);
            }
        });
    }

    deduplicateArticles(articles) {
        let dupDetails = [];
        let dupCount = 0;
        let originalCount = articles.length;

        // Ensure WoS is ranked first if present
        const sourcePriority = { "WoS": 0, "Scopus": 1, "Other": 2 };
        articles.forEach(a => {
            a._source_rank = sourcePriority[a.Database || a._source] ?? 2;
        });
        articles.sort((a, b) => a._source_rank - b._source_rank);

        let clean = [];
        let doiSeen = new Set();
        let titleSeen = new Set();
        let norms = [];

        for (let row of articles) {
            let titleCol = row.Title || row.title || "";
            let doiCol = row.DOI || row.doi || "";

            let ndoi = normalize_doi(doiCol);
            let ntitle = normalize_title(titleCol);

            let isDup = false;
            let reason = "";

            if (ndoi && ndoi.length > 0) {
                if (doiSeen.has(ndoi)) {
                    isDup = true;
                    reason = `Duplicate DOI: ${ndoi}`;
                } else {
                    doiSeen.add(ndoi);
                }
            }

            if (!isDup && ntitle) {
                if (titleSeen.has(ntitle)) {
                    isDup = true;
                    reason = `Duplicate title`;
                } else {
                    titleSeen.add(ntitle);
                }
            }

            // Fuzzy check
            if (!isDup && ntitle) {
                for (let existing of norms) {
                    if (title_similarity(ntitle, existing) >= 0.85) {
                        isDup = true;
                        reason = `Fuzzy title match`;
                        break;
                    }
                }
            }

            if (isDup) {
                dupCount++;
                dupDetails.push({ title: String(titleCol).substring(0, 80), reason });
            } else {
                if (ntitle) norms.push(ntitle);
                clean.push(row);
            }
        }

        return { clean, dupCount, dupDetails };
    }

    async runBatch(jobId, articles, maxArticles, concurrency = 3) {
        let job = this.activeJobs.get(jobId);
        if (!job) return;

        let { clean, dupCount, dupDetails } = this.deduplicateArticles(articles);
        job.dedup = { removed: dupCount, kept: clean.length, details: dupDetails };

        let targetArticles = clean;
        if (maxArticles > 0) {
            targetArticles = targetArticles.slice(0, maxArticles);
        }

        job.total = targetArticles.length;
        job.progress = 0;
        job.status = 'screening';
        job.results = [];

        this.broadcast(jobId, { type: 'start', total: job.total, dedup: job.dedup });

        const agents = this.memoryManager.getAgents();
        const getAgent = (id) => agents.find(a => a.id === id);

        const steps = [
            { id: 'slr-screener', key: 'screen' },
            { id: 'slr-path-classifier', key: 'path' },
            { id: 'slr-cg-tagger', key: 'cg' },
            { id: 'slr-esg-tagger', key: 'esg' },
            { id: 'slr-meta-scorer', key: 'meta' }
        ];

        // Process concurrently
        let queue = [...targetArticles].map((r, i) => ({ row: r, index: i }));
        let running = 0;

        return new Promise((resolve) => {
            const processNext = async () => {
                if (queue.length === 0 && running === 0) {
                    job.status = 'done';
                    this.broadcast(jobId, { type: 'done', results: job.results });
                    resolve(job.results);
                    return;
                }
                if (queue.length === 0) return;

                running++;
                let item = queue.shift();

                try {
                    let articleResult = await this.classifyArticle(item, steps, getAgent, jobId);
                    job.results[item.index] = articleResult;
                } catch (e) {
                    job.results[item.index] = { _error: e.message, _original_row: item.row };
                }

                job.progress++;
                this.broadcast(jobId, { type: 'progress', progress: job.progress });

                running--;
                processNext();
            };

            for (let i = 0; i < concurrency; i++) {
                processNext();
            }
        });
    }

    async classifyArticle(item, steps, getAgent, jobId) {
        let { row, index } = item;
        let title = row.Title || row.title || "";
        let abstract = row.Abstract || row.abstract || "";
        let keywords = row.Author_Keywords || row.author_keywords || "";

        let articleText = `Title: ${title}\nKeywords: ${keywords}\nAbstract: ${abstract.substring(0, 2000)}`;
        let result = { _original_row: row, _index: index, step_results: {}, raw: {} };

        for (let step of steps) {
            let agent = getAgent(step.id);
            if (!agent) {
                result.step_results[step.key] = { error: `Agent ${step.id} not found` };
                continue;
            }

            this.broadcast(jobId, { type: 'item_step', index, step: step.id, status: 'started' });

            try {
                // In AgentFlow, runAgent handles the system prompt inside the agent object.
                // We will temporarily overwrite it with the embedded few-shot prompt for SLR.
                let tempAgent = { ...agent, systemPrompt: getSLRPrompt(step.id.replace('slr-', '')) || agent.systemPrompt };

                let outputJsonString = await this.agentRunner.runAgent(tempAgent, articleText, `slr-${jobId}-${index}`);
                result.raw[step.key] = outputJsonString;

                try {
                    result.step_results[step.key] = JSON.parse(outputJsonString);
                } catch (e) {
                    // Try to extract JSON if it was wrapped in markdown
                    let m = outputJsonString.match(/```json\n([\s\S]*?)\n```/);
                    if (m) {
                        try { result.step_results[step.key] = JSON.parse(m[1]); } catch (e2) { }
                    }
                }
            } catch (e) {
                result.step_results[step.key] = { error: e.message };
            }

            this.broadcast(jobId, { type: 'item_step', index, step: step.id, status: 'done', result: result.step_results[step.key] });
        }

        return result;
    }
}
