import { useState } from 'react';
import './SLRResults.css';
import { StepOutput } from './StepOutput';

export function SLRResults({ results, onReset, dedups }) {
    const [filter, setFilter] = useState('All');
    const [expandedRow, setExpandedRow] = useState(null);

    const filteredResults = results.filter(r => {
        if (!r.step_results) return false;
        const screenStatus = r.step_results.screen?.status || 'Unknown';
        if (filter === 'All') return true;
        return screenStatus === filter;
    });

    // Stats
    const total = results.length;
    let includes = 0, excludes = 0, backgrounds = 0;
    let pathStats = {};

    results.forEach(r => {
        if (!r.step_results) return;
        const s = r.step_results.screen?.status;
        if (s === 'Include') includes++;
        else if (s === 'Exclude') excludes++;
        else if (s === 'Background') backgrounds++;

        const p = r.step_results.path?.path;
        if (p) {
            pathStats[p] = (pathStats[p] || 0) + 1;
        }
    });

    const exportCsv = () => {
        let csv = 'Article ID,Title,Authors,Year,Journal,DOI,Screen Status,Exclusion Code,Path,CG Mechanisms,ESG Outcomes,Meta Potential\\n';
        filteredResults.forEach((r, idx) => {
            const row = r._original_row || {};
            const screen = r.step_results.screen || {};
            const path = r.step_results.path || {};
            const cg = r.step_results.cg || {};
            const esg = r.step_results.esg || {};
            const meta = r.step_results.meta || {};

            let title = `"${(row.Title || row.title || '').replace(/"/g, '""')}"`;
            let cgStr = `"${(cg.cg_mechanisms || []).join('; ')}"`;
            let esgStr = `"${(esg.esg_outcomes || []).join('; ')}"`;

            csv += `${idx + 1},${title},"${row.Authors || ''}",${row.Year || ''},"${row.Journal || ''}",${row.DOI || ''},${screen.status || ''},${screen.exclusion_code || ''},${path.path || ''},${cgStr},${esgStr},${meta.meta_potential || ''}\\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'slr_results.csv';
        a.click();
    };

    return (
        <div className="slr-results-view fade-in">
            <div className="results-header">
                <h2>SLR Batch Results</h2>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={onReset}>Start New Batch</button>
                    <button className="btn btn-primary" onClick={exportCsv}>Export CSV</button>
                </div>
            </div>

            {dedups && dedups.removed > 0 && (
                <div className="alert alert-info mb-3">
                    <strong>Deduplication:</strong> Removed {dedups.removed} duplicates before processing.
                </div>
            )}

            <div className="stats-grid mb-3">
                <div className="stat-card"><h3>{total}</h3><p>Total Processed</p></div>
                <div className="stat-card success"><h3>{includes}</h3><p>Included</p></div>
                <div className="stat-card error"><h3>{excludes}</h3><p>Excluded</p></div>
                <div className="stat-card warning"><h3>{backgrounds}</h3><p>Background</p></div>
            </div>

            <div className="filter-tabs mb-2">
                {['All', 'Include', 'Exclude', 'Background'].map(f => (
                    <button
                        key={f}
                        className={`filter-tab ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="results-table-container">
                <table className="results-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Title & Details</th>
                            <th>Status (Screener)</th>
                            <th>Path</th>
                            <th>CG & ESG Tags</th>
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

                            const sClass = screen.status === 'Include' ? 'text-success' : screen.status === 'Exclude' ? 'text-error' : 'text-warning';

                            return (
                                <React.Fragment key={i}>
                                    <tr className={isExpanded ? 'row-expanded-top' : ''}>
                                        <td>{r._index + 1}</td>
                                        <td className="title-cell">
                                            <strong>{rowInfo.Title || rowInfo.title || 'Unknown Title'}</strong>
                                            <div className="sub-detail">{rowInfo.Journal || rowInfo.source} • {rowInfo.Year || rowInfo.year}</div>
                                            {r._error && <div className="text-error mt-1">{r._error}</div>}
                                        </td>
                                        <td>
                                            <div className={`status-badge ${sClass}`}>
                                                {screen.status || 'N/A'}
                                            </div>
                                            {screen.exclusion_code && <div className="sub-detail">{screen.exclusion_code}</div>}
                                        </td>
                                        <td>
                                            {path.path && <span className="chip chip-blue">{path.path.replace(/_/g, ' ')}</span>}
                                        </td>
                                        <td className="tags-cell">
                                            <div className="tag-group">
                                                {(cg.cg_mechanisms || []).slice(0, 2).map(t => <span key={t} className="chip chip-purple">{t}</span>)}
                                                {(cg.cg_mechanisms || []).length > 2 && <span className="chip chip-neutral">+{cg.cg_mechanisms.length - 2}</span>}
                                            </div>
                                            <div className="tag-group mt-1">
                                                {(esg.esg_outcomes || []).slice(0, 2).map(t => <span key={t} className="chip chip-green">{t}</span>)}
                                                {(esg.esg_outcomes || []).length > 2 && <span className="chip chip-neutral">+{esg.esg_outcomes.length - 2}</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-small"
                                                onClick={() => setExpandedRow(isExpanded ? null : i)}
                                            >
                                                {isExpanded ? 'Hide' : 'View Details'}
                                            </button>
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="row-expanded-body">
                                            <td colSpan="6">
                                                <div className="expanded-details">
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
                    <div className="empty-state">No articles match the current filter.</div>
                )}
            </div>
        </div>
    );
}
