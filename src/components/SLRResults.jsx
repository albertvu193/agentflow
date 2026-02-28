import React, { useState } from 'react';
import './SLRResults.css';
import { StepOutput } from './StepOutput';

/**
 * SLRResults — renders the results table after the batch is done.
 *
 * Key features added beyond the original port:
 *  - "Maybe" status shown with its own color + label (not collapsed into Include)
 *  - "Teach AI" button on each row opens a correction modal that calls POST /api/slr/feedback
 *    to append a corrected example directly into the relevant agent's system prompt.
 *  - Filter tabs include "Maybe" for the researcher to focus on uncertain articles first.
 */
export function SLRResults({ results, onReset, dedups }) {
    const [filter, setFilter] = useState('All');
    const [expandedRow, setExpandedRow] = useState(null);
    const [teachModal, setTeachModal] = useState(null); // { result, step }
    const [teachStatus, setTeachStatus] = useState(null); // 'saving' | 'saved' | 'error'

    // ─── Stats ────────────────────────────────────────────────────────────────
    const total = results.length;
    let counts = { Include: 0, Maybe: 0, Exclude: 0, Background: 0 };
    results.forEach(r => {
        const s = r?.step_results?.screen?.status;
        if (s in counts) counts[s]++;
    });

    // ─── Filtering ────────────────────────────────────────────────────────────
    const filteredResults = results.filter(r => {
        if (!r?.step_results) return false;
        const s = r.step_results.screen?.status || 'Unknown';
        return filter === 'All' || s === filter;
    });

    // ─── CSV Export ───────────────────────────────────────────────────────────
    const exportCsv = () => {
        let csv = 'Article ID,Title,Authors,Year,Journal,DOI,Screen Status,Exclusion Code,Path,CG Mechanisms,ESG Outcomes,Meta Potential\n';
        filteredResults.forEach((r, idx) => {
            const row = r._original_row || {};
            const screen = r.step_results?.screen || {};
            const path = r.step_results?.path || {};
            const cg = r.step_results?.cg || {};
            const esg = r.step_results?.esg || {};
            const meta = r.step_results?.meta || {};
            const title = `"${(row.Title || row.title || '').replace(/"/g, '""')}"`;
            const cgStr = `"${(Array.isArray(cg.cg_mechanisms) ? cg.cg_mechanisms : []).join('; ')}"`;
            const esgStr = `"${(Array.isArray(esg.esg_outcomes) ? esg.esg_outcomes : []).join('; ')}"`;
            csv += `${idx + 1},${title},"${row.Authors || ''}",${row.Year || ''},"${row.Journal || ''}",${row.DOI || ''},${screen.status || ''},${screen.exclusion_code || ''},${path.path || ''},${cgStr},${esgStr},${meta.meta_potential || ''}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'slr_results.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    // ─── Teach AI (feedback / self-improving loop) ────────────────────────────
    const openTeachModal = (result) => {
        setTeachModal({ result, correctedStatus: result.step_results?.screen?.status || 'Include' });
        setTeachStatus(null);
    };

    const submitFeedback = async () => {
        if (!teachModal) return;
        const { result, correctedStatus, correctedExclusionCode } = teachModal;
        const row = result._original_row || {};
        const correctedOutput = { status: correctedStatus };
        if (correctedExclusionCode) correctedOutput.exclusion_code = correctedExclusionCode;

        setTeachStatus('saving');
        try {
            const res = await fetch('/api/slr/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId: 'slr-screener',
                    title: row.Title || row.title || '',
                    abstract: row.Abstract || row.abstract || '',
                    correctedOutput,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setTeachStatus('saved');
                setTimeout(() => setTeachModal(null), 1500);
            } else {
                setTeachStatus('error: ' + data.error);
            }
        } catch (e) {
            setTeachStatus('error: ' + e.message);
        }
    };

    // ─── Status helpers ───────────────────────────────────────────────────────
    const statusClass = (s) => ({
        'Include': 'status-include',
        'Maybe': 'status-maybe',
        'Exclude': 'status-exclude',
        'Background': 'status-background',
    }[s] || 'status-unknown');

    return (
        <div className="slr-results-view fade-in">
            {/* Header */}
            <div className="results-header">
                <h2>SLR Batch Results</h2>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={onReset}>New Batch</button>
                    <button className="btn btn-primary" onClick={exportCsv}>Export CSV</button>
                </div>
            </div>

            {/* Dedup banner */}
            {dedups?.removed > 0 && (
                <div className="alert alert-info mb-3">
                    <strong>Deduplication:</strong> Removed {dedups.removed} duplicate(s) before processing (WoS preferred over Scopus).
                </div>
            )}

            {/* Stats */}
            <div className="stats-grid mb-3">
                <div className="stat-card"><h3>{total}</h3><p>Processed</p></div>
                <div className="stat-card success"><h3>{counts.Include}</h3><p>Include</p></div>
                <div className="stat-card maybe"><h3>{counts.Maybe}</h3><p>Maybe <span className="stat-hint">(needs full-text)</span></p></div>
                <div className="stat-card error"><h3>{counts.Exclude}</h3><p>Exclude</p></div>
                <div className="stat-card warning"><h3>{counts.Background}</h3><p>Background</p></div>
            </div>

            {/* Filter tabs */}
            <div className="filter-tabs mb-2">
                {['All', 'Include', 'Maybe', 'Exclude', 'Background'].map(f => (
                    <button
                        key={f}
                        className={`filter-tab ${filter === f ? 'active' : ''} ${f === 'Maybe' ? 'tab-maybe' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f} {f !== 'All' && counts[f] != null ? `(${counts[f]})` : ''}
                    </button>
                ))}
            </div>

            {/* Results table */}
            <div className="results-table-container">
                <table className="results-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Title &amp; Details</th>
                            <th>Screen Decision</th>
                            <th>Path</th>
                            <th>CG &amp; ESG Tags</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredResults.map((r, i) => {
                            const screen = r.step_results?.screen || {};
                            const path = r.step_results?.path || {};
                            const cg = r.step_results?.cg || {};
                            const esg = r.step_results?.esg || {};
                            const rowInfo = r._original_row || {};
                            const isExpanded = expandedRow === i;

                            return (
                                <React.Fragment key={i}>
                                    <tr className={isExpanded ? 'row-expanded-top' : ''}>
                                        <td>{(r._index ?? i) + 1}</td>
                                        <td className="title-cell">
                                            <strong>{rowInfo.Title || rowInfo.title || 'Unknown Title'}</strong>
                                            <div className="sub-detail">
                                                {rowInfo.Journal || rowInfo.source} {rowInfo.Year ? `• ${rowInfo.Year}` : ''}
                                                {rowInfo._source ? <span className="source-badge">{rowInfo._source}</span> : null}
                                            </div>
                                            {r._error && <div className="text-error mt-1 text-sm">{r._error}</div>}
                                        </td>
                                        <td>
                                            <div className={`status-badge ${statusClass(screen.status)}`}>
                                                {screen.status || 'N/A'}
                                            </div>
                                            {screen.exclusion_code && (
                                                <div className="sub-detail text-sm">{screen.exclusion_code}</div>
                                            )}
                                            {screen.status === 'Maybe' && (
                                                <div className="sub-detail text-sm text-warning">⚠ Needs full-text review</div>
                                            )}
                                            {screen.confidence != null && (
                                                <div className="sub-detail text-xs">Conf: {Math.round(screen.confidence * 100)}%</div>
                                            )}
                                        </td>
                                        <td>
                                            {path.path && (
                                                <span className="chip chip-blue">
                                                    {path.path.replace(/_/g, ' ')}
                                                </span>
                                            )}
                                            {r.step_results?.path?.skipped && (
                                                <span className="chip chip-neutral">skipped</span>
                                            )}
                                        </td>
                                        <td className="tags-cell">
                                            <div className="tag-group">
                                                {(Array.isArray(cg.cg_mechanisms) ? cg.cg_mechanisms : []).slice(0, 2).map(t => (
                                                    <span key={t} className="chip chip-purple">{t.replace(/_/g, ' ')}</span>
                                                ))}
                                                {(Array.isArray(cg.cg_mechanisms) && cg.cg_mechanisms.length > 2) && (
                                                    <span className="chip chip-neutral">+{cg.cg_mechanisms.length - 2}</span>
                                                )}
                                            </div>
                                            <div className="tag-group mt-1">
                                                {(Array.isArray(esg.esg_outcomes) ? esg.esg_outcomes : []).slice(0, 2).map(t => (
                                                    <span key={t} className="chip chip-green">{t.replace(/_/g, ' ')}</span>
                                                ))}
                                                {(Array.isArray(esg.esg_outcomes) && esg.esg_outcomes.length > 2) && (
                                                    <span className="chip chip-neutral">+{esg.esg_outcomes.length - 2}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="actions-cell">
                                            <button
                                                className="btn btn-small"
                                                onClick={() => setExpandedRow(isExpanded ? null : i)}
                                            >
                                                {isExpanded ? 'Hide' : 'Details'}
                                            </button>
                                            <button
                                                className="btn btn-small btn-teach"
                                                title="Correct this prediction and teach the AI"
                                                onClick={() => openTeachModal(r)}
                                            >
                                                ✏️ Teach AI
                                            </button>
                                        </td>
                                    </tr>

                                    {/* Expanded row */}
                                    {isExpanded && (
                                        <tr className="row-expanded-body">
                                            <td colSpan="6">
                                                <div className="expanded-details">
                                                    <div className="abstract-box mb-2">
                                                        <strong>Reasoning:</strong> {screen.reasoning || 'N/A'}
                                                    </div>
                                                    <div className="abstract-box mb-2">
                                                        <strong>Abstract:</strong> {rowInfo.Abstract || rowInfo.abstract || 'N/A'}
                                                    </div>
                                                    <h4>AI Step Results</h4>
                                                    <div className="step-results-grid">
                                                        {['screen', 'path', 'cg', 'esg', 'meta'].map(step => (
                                                            <div key={step} className="detail-col">
                                                                <h5>{step.toUpperCase()}</h5>
                                                                <StepOutput stepKey={step} result={r.step_results[step]} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
                {filteredResults.length === 0 && (
                    <div className="empty-state">No articles match this filter.</div>
                )}
            </div>

            {/* Teach AI Modal */}
            {teachModal && (
                <div className="modal-overlay" onClick={() => setTeachModal(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <h3>✏️ Correct & Teach the AI</h3>
                        <p className="text-secondary text-sm">
                            The correction will be added as a few-shot example in the Screener agent's prompt.
                            It will apply to all future runs.
                        </p>
                        <div className="modal-article-title">
                            <strong>{teachModal.result._original_row?.Title || teachModal.result._original_row?.title || 'Unknown'}</strong>
                        </div>
                        <div className="modal-field mt-2">
                            <label className="text-secondary text-sm">Correct Status:</label>
                            <select
                                value={teachModal.correctedStatus}
                                onChange={e => setTeachModal(m => ({ ...m, correctedStatus: e.target.value }))}
                                className="input-select"
                            >
                                <option value="Include">Include</option>
                                <option value="Maybe">Maybe</option>
                                <option value="Exclude">Exclude</option>
                                <option value="Background">Background</option>
                            </select>
                        </div>
                        {(teachModal.correctedStatus === 'Exclude' || teachModal.correctedStatus === 'Background') && (
                            <div className="modal-field mt-1">
                                <label className="text-secondary text-sm">Exclusion/Background Code:</label>
                                <input
                                    type="text"
                                    placeholder="e.g. TA-E1, TA-B1"
                                    className="input-text"
                                    value={teachModal.correctedExclusionCode || ''}
                                    onChange={e => setTeachModal(m => ({ ...m, correctedExclusionCode: e.target.value }))}
                                />
                            </div>
                        )}
                        <div className="modal-actions mt-2">
                            {teachStatus === 'saved' && <span className="text-success">✅ Saved to agent prompt!</span>}
                            {teachStatus && teachStatus.startsWith('error') && <span className="text-error">{teachStatus}</span>}
                            {teachStatus !== 'saved' && (
                                <>
                                    <button className="btn btn-primary" onClick={submitFeedback} disabled={teachStatus === 'saving'}>
                                        {teachStatus === 'saving' ? 'Saving…' : 'Save Correction'}
                                    </button>
                                    <button className="btn btn-secondary" onClick={() => setTeachModal(null)}>Cancel</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
