import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');

/**
 * Parse a markdown file with YAML-style frontmatter.
 * Returns { meta: { ...frontmatter }, body: "prompt text" }
 */
function parsePromptFile(filepath) {
    const raw = fs.readFileSync(filepath, 'utf-8');
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) {
        return { meta: {}, body: raw.trim() };
    }

    const meta = {};
    const fmLines = fmMatch[1].split('\n');
    let currentKey = null;
    let currentList = null;

    for (const line of fmLines) {
        const kvMatch = line.match(/^(\w+):\s*(.*)$/);
        if (kvMatch) {
            const [, key, value] = kvMatch;
            if (value.trim() === '') {
                // Could be start of a list — wait for next lines
                currentKey = key;
                currentList = [];
                meta[key] = currentList;
            } else {
                // Simple key-value
                currentKey = null;
                currentList = null;
                // Handle quoted strings
                const unquoted = value.replace(/^["']|["']$/g, '');
                meta[key] = unquoted;
            }
        } else if (currentList !== null && line.match(/^\s+-\s+/)) {
            const item = line.replace(/^\s+-\s+/, '').replace(/^["']|["']$/g, '');
            currentList.push(item);
        }
    }

    return { meta, body: fmMatch[2].trim() };
}

/**
 * Load all agent prompt files from a directory.
 * Returns an array of agent definitions with systemPrompt from file body.
 */
export function loadAgentPrompts(subdir) {
    const dir = path.join(PROMPTS_DIR, subdir);
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    return files.map(f => {
        const { meta, body } = parsePromptFile(path.join(dir, f));
        return {
            id: meta.id,
            name: meta.name,
            role: meta.role,
            icon: meta.icon,
            model: meta.model,
            systemPrompt: body,
            expectedSections: Array.isArray(meta.expectedSections) ? meta.expectedSections : [],
            _promptFile: path.join(subdir, f),
        };
    });
}

/**
 * Load all context overlay files.
 * Returns an array of { label, detect: string[], body: string }
 */
export function loadContextOverlays() {
    const dir = path.join(PROMPTS_DIR, 'context');
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    return files.map(f => {
        const { meta, body } = parsePromptFile(path.join(dir, f));
        return {
            label: meta.label || f.replace('.md', ''),
            detect: Array.isArray(meta.detect) ? meta.detect : [],
            body,
        };
    });
}

/**
 * Detect which context overlays apply to a given input string.
 * Returns matched overlays sorted by number of keyword hits (most relevant first).
 */
export function detectContext(input, overlays) {
    const lower = input.toLowerCase();
    const scored = overlays.map(overlay => {
        const hits = overlay.detect.filter(keyword => lower.includes(keyword.toLowerCase()));
        return { overlay, hits: hits.length };
    }).filter(s => s.hits > 0);

    scored.sort((a, b) => b.hits - a.hits);
    return scored.map(s => s.overlay);
}

/**
 * Validate that an agent's output contains the expected sections.
 * Returns { valid: boolean, missing: string[], warnings: string[] }
 */
export function validateOutput(output, expectedSections) {
    if (!expectedSections || expectedSections.length === 0) {
        return { valid: true, missing: [], warnings: [] };
    }

    const missing = [];
    const warnings = [];

    for (const section of expectedSections) {
        if (!output.includes(section)) {
            missing.push(section);
        }
    }

    if (missing.length > 0) {
        warnings.push(`Output missing expected sections: ${missing.join(', ')}`);
    }

    return {
        valid: missing.length === 0,
        missing,
        warnings,
    };
}

/**
 * Hot-reload a single agent's prompt from its file.
 * Useful for editing prompts without restarting the server.
 */
export function reloadPrompt(promptFile) {
    const filepath = path.join(PROMPTS_DIR, promptFile);
    if (!fs.existsSync(filepath)) return null;
    const { meta, body } = parsePromptFile(filepath);
    return {
        id: meta.id,
        systemPrompt: body,
        expectedSections: Array.isArray(meta.expectedSections) ? meta.expectedSections : [],
    };
}
