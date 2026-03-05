import React, { useState } from 'react';
import './SLRResults.css';
import { StepOutput } from './StepOutput';

/**
 * SLRResults — renders the results table after the batch is done.
 *
 * Features:
 *  - Status filter tabs (Include / Maybe / Exclude / Background)
 *  - Advanced multi-dimensional filters (Path, CG, ESG, Meta, Finding, Region, Method, Industry)
 *  - "Teach AI" button for self-improving feedback loop
 *  - master_dt-aligned CSV export with all AI screening columns
 *  - Structured expanded details panel
 */

/* ─── Collect unique values from results for filter dropdowns ── */
function collectFilterOptions(results) {
  const paths = new Set(), cgMechs = new Set(), esgOutcomes = new Set();
  const metaPotentials = new Set(), findingDirs = new Set(), regions = new Set();
  const methods = new Set(), industries = new Set();
  results.forEach(r => {
    const sr = r?.step_results; if (!sr) return;
    if (sr.path?.path) paths.add(sr.path.path);
    (sr.cg?.cg_mechanisms || []).forEach(v => cgMechs.add(v));
    (sr.esg?.esg_outcomes || []).forEach(v => esgOutcomes.add(v));
    if (sr.meta?.meta_potential) metaPotentials.add(sr.meta.meta_potential);
    if (sr.meta?.main_finding_direction) findingDirs.add(sr.meta.main_finding_direction);
    if (sr.meta?.country_region) regions.add(sr.meta.country_region);
    (sr.meta?.estimation_methods || []).forEach(v => methods.add(v));
    if (sr.meta?.industry_type && sr.meta.industry_type !== 'Not_Clear') industries.add(sr.meta.industry_type);
  });
  return {
    paths: [...paths].sort(), cgMechs: [...cgMechs].sort(), esgOutcomes: [...esgOutcomes].sort(),
    metaPotentials: [...metaPotentials], findingDirs: [...findingDirs],
    regions: [...regions].sort(), methods: [...methods].sort(), industries: [...industries].sort(),
  };
}

export function SLRResults({ results, onReset, dedups }) {
    const [filter, setFilter] = useState('All');
    const [advancedFilters, setAdvancedFilters] = useState({
        path: '', cgMech: '', esgOutcome: '', metaPotential: '', findingDir: '', region: '', method: '', industry: '',
    });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);
    const [teachModal, setTeachModal] = useState(null);
    const [teachStatus, setTeachStatus] = useState(null);

    // ─── Stats ────────────────────────────────────────────────────────────────
    const total = results.length;
    let counts = { Include: 0, Maybe: 0, Exclude: 0, Background: 0 };
    results.forEach(r => {
        const s = r?.step_results?.screen?.status;
        if (s in counts) counts[s]++;
    });

    const filterOptions = collectFilterOptions(results);
    const activeFilterCount = Object.values(advancedFilters).filter(v => v).length;

    // ─── Filtering ────────────────────────────────────────────────────────────
    const filteredResults = results.filter(r => {
        if (!r?.step_results) return false;
        const sr = r.step_results;
        const s = sr.screen?.status || 'Unknown';
        if (filter !== 'All' && s !== filter) return false;
        if (advancedFilters.path && sr.path?.path !== advancedFilters.path) return false;
        if (advancedFilters.cgMech && !(sr.cg?.cg_mechanisms || []).includes(advancedFilters.cgMech)) return false;
        if (advancedFilters.esgOutcome && !(sr.esg?.esg_outcomes || []).includes(advancedFilters.esgOutcome)) return false;
        if (advancedFilters.metaPotential && sr.meta?.meta_potential !== advancedFilters.metaPotential) return false;
        if (advancedFilters.findingDir && sr.meta?.main_finding_direction !== advancedFilters.findingDir) return false;
        if (advancedFilters.region && sr.meta?.country_region !== advancedFilters.region) return false;
        if (advancedFilters.method && !(sr.meta?.estimation_methods || []).includes(advancedFilters.method)) return false;
        if (advancedFilters.industry && sr.meta?.industry_type !== advancedFilters.industry) return false;
        return true;
    });

    const clearAdvancedFilters = () => setAdvancedFilters({
        path: '', cgMech: '', esgOutcome: '', metaPotential: '', findingDir: '', region: '', method: '', industry: '',
    });

    // ─── master_dt-aligned CSV Export ──────────────────────────────────────────
    const csvEscape = (val) => {
        const s = String(val ?? '');
        if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
        return s;
    };
    const arrJoin = (arr) => (Array.isArray(arr) ? arr : []).join('; ');

    const exportCsv = () => {
        const headers = [
            'Record_ID','Title','Authors','Year','Journal','DOI','Source_DB','Document_Type','Abstract','Author_Keywords','Index_Keywords',
            'AI_Screen_Status','AI_Screen_Reason','AI_Confidence','AI_Reasoning','AI_Record_Type',
            'AI_Path_Category','AI_Relation_Type','AI_FP_Included','AI_FP_Measure_Type','AI_Moderation_Tested','AI_Mediation_Tested',
            'AI_CG_Mechanism_Group','AI_CG_Mechanism_Detail',
            'AI_ESG_Outcome_Type','AI_ESG_Measure_Type',
            'AI_Meta_Potential','AI_Meta_Path_Fit','AI_Finding_Direction','AI_Finding_Note',
            'AI_Study_Design','AI_Estimation_Method','AI_Endogeneity','AI_Theory_Used',
            'AI_Country_Region','AI_Country_Name','AI_Market_Type','AI_Industry_Type',
            'User_Screen_Status','User_Notes','User_Changed',
        ];
        let csv = headers.map(csvEscape).join(',') + '\n';
        filteredResults.forEach((r, idx) => {
            const row = r._original_row || {};
            const screen = r.step_results?.screen || {};
            const path = r.step_results?.path || {};
            const cg = r.step_results?.cg || {};
            const esg = r.step_results?.esg || {};
            const meta = r.step_results?.meta || {};
            csv += [
                idx + 1, row.Title || row.title || '', row.Authors || row['Author full names'] || '',
                row.Year || '', row.Journal || row['Source title'] || row.source || '', row.DOI || '',
                row._source || '', row['Document Type'] || '', row.Abstract || row.abstract || '',
                row['Author Keywords'] || '', row['Index Keywords'] || row['Keywords Plus'] || '',
                screen.status || '', screen.exclusion_code || '',
                screen.confidence != null ? Math.round(screen.confidence * 100) : '', screen.reasoning || '', screen.record_type || '',
                path.path || '', arrJoin(path.relation_types), path.firm_perf_included || '',
                arrJoin(path.firm_perf_measure_type), path.moderation_tested || '', path.mediation_tested || '',
                arrJoin(cg.cg_mechanisms), arrJoin(cg.cg_mechanism_details),
                arrJoin(esg.esg_outcomes), arrJoin(esg.esg_measure_types),
                meta.meta_potential || '', meta.meta_path_fit || '', meta.main_finding_direction || '', meta.main_finding_note || '',
                meta.study_design || '', arrJoin(meta.estimation_methods), meta.endogeneity_addressed || '', arrJoin(meta.theories_used),
                meta.country_region || '', meta.country_name || '', meta.market_type || '', meta.industry_type || '',
                '', '', '',
            ].map(csvEscape).join(',') + '\n';
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'master_dt.csv'; a.click();
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
                <button
                    className={`filter-tab ${showAdvancedFilters ? 'active' : ''}`}
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    style={{ marginLeft: 'auto' }}
                >
                    Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
                </button>
            </div>

            {/* Advanced filter panel */}
            {showAdvancedFilters && (
                <div className="advanced-filters-panel mb-2">
                    <div className="advanced-filters-grid">
                        {[
                            { key: 'path', label: 'Path', opts: filterOptions.paths },
                            { key: 'cgMech', label: 'CG Mechanism', opts: filterOptions.cgMechs },
                            { key: 'esgOutcome', label: 'ESG Outcome', opts: filterOptions.esgOutcomes },
                            { key: 'metaPotential', label: 'Meta Potential', opts: filterOptions.metaPotentials },
                            { key: 'findingDir', label: 'Finding', opts: filterOptions.findingDirs },
                            { key: 'region', label: 'Region', opts: filterOptions.regions },
                            { key: 'method', label: 'Method', opts: filterOptions.methods },
                            { key: 'industry', label: 'Industry', opts: filterOptions.industries },
                        ].map(({ key, label, opts }) => (
                            <div key={key} className="adv-filter-group">
                                <label className="text-xs">{label}</label>
                                <select className="input-select" value={advancedFilters[key]}
                                    onChange={e => setAdvancedFilters(f => ({ ...f, [key]: e.target.value }))}>
                                    <option value="">All</option>
                                    {opts.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                    {activeFilterCount > 0 && (
                        <button className="btn btn-small mt-1" onClick={clearAdvancedFilters}>Clear all filters</button>
                    )}
                </div>
            )}

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
                            <th>Meta &amp; Finding</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredResults.map((r, i) => {
                            const screen = r.step_results?.screen || {};
                            const path = r.step_results?.path || {};
                            const cg = r.step_results?.cg || {};
                            const esg = r.step_results?.esg || {};
                            const meta = r.step_results?.meta || {};
                            const rowInfo = r._original_row || {};
                            const isExpanded = expandedRow === i;

                            const findingBadgeCls = meta.main_finding_direction === 'Positive' ? 'badge-success' :
                                meta.main_finding_direction === 'Negative' ? 'badge-error' :
                                meta.main_finding_direction === 'Mixed' ? 'badge-warning' : 'badge-neutral';

                            return (
                                <React.Fragment key={i}>
                                    <tr className={isExpanded ? 'row-expanded-top' : ''}>
                                        <td>{(r._index ?? i) + 1}</td>
                                        <td className="title-cell">
                                            <strong>{rowInfo.Title || rowInfo.title || 'Unknown Title'}</strong>
                                            <div className="sub-detail">
                                                {rowInfo.Journal || rowInfo.source} {rowInfo.Year ? `\u2022 ${rowInfo.Year}` : ''}
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
                                            {screen.confidence != null && (
                                                <div className="sub-detail text-xs">{Math.round(screen.confidence * 100)}%</div>
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
                                        <td>
                                            {meta.meta_potential && (
                                                <span className={`badge ${meta.meta_potential === 'High' ? 'badge-success' : meta.meta_potential === 'Low' ? 'badge-error' : 'badge-warning'}`}
                                                    style={{ fontSize: 10 }}>{meta.meta_potential}</span>
                                            )}
                                            {meta.main_finding_direction && (
                                                <span className={`badge ${findingBadgeCls}`} style={{ fontSize: 10, marginLeft: 4 }}>
                                                    {meta.main_finding_direction}
                                                </span>
                                            )}
                                            {meta.country_region && meta.country_region !== 'Not_Clear' && (
                                                <div className="sub-detail text-xs">{meta.country_name || meta.country_region.replace(/_/g, ' ')}</div>
                                            )}
                                            {meta.study_design && meta.study_design !== 'Not_Clear' && (
                                                <div className="sub-detail text-xs">{meta.study_design}</div>
                                            )}
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
                                                Teach AI
                                            </button>
                                        </td>
                                    </tr>

                                    {/* Expanded row with structured details */}
                                    {isExpanded && (
                                        <tr className="row-expanded-body">
                                            <td colSpan="7">
                                                <div className="expanded-details">
                                                    <div className="expanded-panels-grid">
                                                        {/* Screening */}
                                                        <div className="expanded-panel">
                                                            <h5>SCREENING</h5>
                                                            <div className="detail-kv"><span>Status</span><span>{screen.status}</span></div>
                                                            {screen.exclusion_code && <div className="detail-kv"><span>Code</span><span>{screen.exclusion_code}</span></div>}
                                                            {screen.record_type && <div className="detail-kv"><span>Type</span><span>{screen.record_type.replace(/_/g, ' ')}</span></div>}
                                                            <div className="detail-kv"><span>Confidence</span><span>{screen.confidence != null ? Math.round(screen.confidence * 100) + '%' : 'N/A'}</span></div>
                                                            {screen.reasoning && <div className="abstract-box mt-1">{screen.reasoning}</div>}
                                                        </div>
                                                        {/* Path */}
                                                        <div className="expanded-panel">
                                                            <h5>PATH & RELATIONS</h5>
                                                            <div className="detail-kv"><span>Path</span><span>{path.path?.replace(/_/g, ' ') || 'N/A'}</span></div>
                                                            {(path.relation_types || []).length > 0 && (
                                                                <div className="tag-group mt-1">{path.relation_types.map(t => <span key={t} className="chip chip-blue">{t.replace(/_/g, ' ')}</span>)}</div>
                                                            )}
                                                            <div className="detail-kv"><span>FP Included</span><span>{path.firm_perf_included || 'N/A'}</span></div>
                                                            <div className="detail-kv"><span>Moderation</span><span>{path.moderation_tested || 'N/A'}</span></div>
                                                            <div className="detail-kv"><span>Mediation</span><span>{path.mediation_tested || 'N/A'}</span></div>
                                                        </div>
                                                        {/* CG */}
                                                        <div className="expanded-panel">
                                                            <h5>CG MECHANISMS</h5>
                                                            <div className="tag-group">{(cg.cg_mechanisms || []).map(t => <span key={t} className="chip chip-purple">{t.replace(/_/g, ' ')}</span>)}</div>
                                                            {(cg.cg_mechanism_details || []).length > 0 && (
                                                                <div className="tag-group mt-1">{cg.cg_mechanism_details.map(t => <span key={t} className="chip chip-outline">{t.replace(/_/g, ' ')}</span>)}</div>
                                                            )}
                                                            {cg.reasoning && <div className="abstract-box mt-1">{cg.reasoning}</div>}
                                                        </div>
                                                        {/* ESG */}
                                                        <div className="expanded-panel">
                                                            <h5>ESG OUTCOMES</h5>
                                                            <div className="tag-group">{(esg.esg_outcomes || []).map(t => <span key={t} className="chip chip-green">{t.replace(/_/g, ' ')}</span>)}</div>
                                                            {(esg.esg_measure_types || []).length > 0 && (
                                                                <div className="tag-group mt-1">{esg.esg_measure_types.map(t => <span key={t} className="chip chip-outline">{t.replace(/_/g, ' ')}</span>)}</div>
                                                            )}
                                                            {esg.reasoning && <div className="abstract-box mt-1">{esg.reasoning}</div>}
                                                        </div>
                                                        {/* Meta */}
                                                        <div className="expanded-panel">
                                                            <h5>META-ANALYSIS & CONTEXT</h5>
                                                            <div className="detail-kv"><span>Potential</span><span>{meta.meta_potential || 'N/A'}</span></div>
                                                            <div className="detail-kv"><span>Path Fit</span><span>{meta.meta_path_fit?.replace(/_/g, ' ') || 'N/A'}</span></div>
                                                            <div className="detail-kv"><span>Finding</span><span>{meta.main_finding_direction || 'N/A'}</span></div>
                                                            <div className="detail-kv"><span>Design</span><span>{meta.study_design || 'N/A'}</span></div>
                                                            <div className="detail-kv"><span>Endogeneity</span><span>{meta.endogeneity_addressed || 'N/A'}</span></div>
                                                            <div className="detail-kv"><span>Region</span><span>{meta.country_name || meta.country_region || 'N/A'}</span></div>
                                                            <div className="detail-kv"><span>Market</span><span>{meta.market_type || 'N/A'}</span></div>
                                                            <div className="detail-kv"><span>Industry</span><span>{meta.industry_type?.replace(/_/g, ' ') || 'N/A'}</span></div>
                                                            {(meta.estimation_methods || []).length > 0 && (
                                                                <div className="tag-group mt-1">{meta.estimation_methods.map(t => <span key={t} className="chip chip-neutral">{t}</span>)}</div>
                                                            )}
                                                            {(meta.theories_used || []).length > 0 && (
                                                                <div className="tag-group mt-1">{meta.theories_used.map(t => <span key={t} className="chip chip-outline">{t.replace(/_/g, ' ')}</span>)}</div>
                                                            )}
                                                            {meta.main_finding_note && <div className="abstract-box mt-1">{meta.main_finding_note}</div>}
                                                        </div>
                                                    </div>
                                                    {/* Abstract */}
                                                    <div className="abstract-box mt-1">
                                                        <strong>Abstract:</strong> {rowInfo.Abstract || rowInfo.abstract || 'N/A'}
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
