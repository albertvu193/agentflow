import React, { useState, useRef, useEffect } from 'react';
import './LiteratureReview.css';

export function LiteratureReview({ slr }) {
  const [maxArticles, setMaxArticles] = useState(3);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    if (e.target.files?.length) {
      try {
        await slr.uploadFiles(e.target.files);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
  };

  const handleRun = async () => {
    try {
      await slr.startRun(maxArticles);
    } catch (err) {
      console.error('Run failed:', err);
    }
  };

  // ─── Done state with results ────────────────────────────────────────
  if (slr.jobStatus === 'done' && slr.results.length > 0) {
    return <SLRResultsView results={slr.results} onReset={slr.reset} dedups={slr.dedups} />;
  }

  return (
    <div className="lr r-fade-in">
      <div className="r-section-header">
        <div className="r-section-title-group">
          <h1>Literature Review Pipeline</h1>
          <p className="r-text-secondary r-text-sm">
            Upload bibliographic data from Web of Science or Scopus to run the 5-step SLR classification.
          </p>
        </div>
      </div>

      {/* Upload */}
      {!slr.batchId && (
        <div className="r-mt-2">
          <div
            className="r-dropzone"
            role="button"
            tabIndex={0}
            aria-label="Upload bibliographic CSV or Excel files"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
          >
            <div className="r-dropzone__icon">L</div>
            <h3>Upload Bibliographic Data</h3>
            <p>CSV or Excel files from Web of Science or Scopus</p>
            <p className="r-text-xs r-text-muted">Automatic source detection and deduplication</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept=".csv,.xlsx,.xls"
              hidden
            />
          </div>

          {/* Supported sources */}
          <div className="lr__sources r-mt-2">
            <div className="lr__source-card r-card r-card-padded">
              <h4>Web of Science</h4>
              <p className="r-text-sm r-text-muted">Export as CSV or Excel from search results. Detected by filename pattern.</p>
            </div>
            <div className="lr__source-card r-card r-card-padded">
              <h4>Scopus</h4>
              <p className="r-text-sm r-text-muted">Export bibliographic data as CSV. Automatically merged with WoS data.</p>
            </div>
          </div>
        </div>
      )}

      {/* Batch ready */}
      {slr.batchId && slr.jobStatus === 'idle' && (
        <div className="lr__batch r-card r-card-padded r-mt-2 r-slide-up">
          <h3>Data Uploaded</h3>
          <div className="r-stat-grid r-mt-2">
            <div className="r-stat-card">
              <div className="r-stat-card__label">Files</div>
              <div className="r-stat-card__value accent">{slr.uploadStats?.files?.length}</div>
            </div>
            <div className="r-stat-card">
              <div className="r-stat-card__label">Articles Found</div>
              <div className="r-stat-card__value">{slr.uploadStats?.totalRows}</div>
            </div>
          </div>

          <div className="lr__run-controls r-mt-2">
            <div className="lr__max-input">
              <label className="r-label">Max articles to process (0 = all)</label>
              <input
                type="number"
                className="r-input"
                value={maxArticles}
                onChange={(e) => setMaxArticles(Number(e.target.value))}
                min={0}
                style={{ width: '120px' }}
              />
            </div>
            <div className="r-flex r-gap-1 r-mt-2">
              <button className="r-btn r-btn-primary r-btn-lg" onClick={handleRun}>
                Start Pipeline
              </button>
              <button className="r-btn r-btn-secondary" onClick={slr.reset}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Running */}
      {slr.jobStatus !== 'idle' && slr.jobStatus !== 'done' && (
        <div className="lr__running r-mt-2 r-slide-up">
          {/* Progress card */}
          <div className="lr__progress-card r-card r-card-padded">
            <div className="r-flex r-items-center r-justify-between">
              <div className="r-flex r-items-center r-gap-1">
                <div className="r-pulse-dot" />
                <span style={{ fontWeight: 600 }}>Processing Articles</span>
              </div>
              <span className="r-text-sm r-text-muted">{slr.progress} / {slr.total} completed</span>
            </div>
            <div className="r-progress-track r-mt-2">
              <div
                className="r-progress-fill"
                style={{ width: `${(slr.progress / slr.total) * 100 || 0}%` }}
              />
            </div>
            {slr.dedups && (
              <div className="r-alert r-alert-info r-mt-2">
                Deduplication: Kept {slr.dedups.kept}, removed {slr.dedups.removed} duplicate(s).
              </div>
            )}
          </div>

          {/* Live feed */}
          <div className="lr__feed r-mt-2">
            {Array.from({ length: slr.total }).map((_, idx) => {
              const feed = slr.liveFeed[idx] || {};
              if (Object.keys(feed).length === 0) return null;

              const steps = ['screen', 'path', 'cg', 'esg', 'meta'];
              const completedSteps = steps.filter(s => feed[s]);

              return (
                <div key={idx} className="lr__feed-item r-card r-card-padded">
                  <div className="r-flex r-items-center r-justify-between r-mb-1">
                    <h4>Article #{idx + 1}</h4>
                    <span className="r-text-xs r-text-muted">
                      {completedSteps.length}/{steps.length} steps
                    </span>
                  </div>

                  {/* Step progress dots */}
                  <div className="lr__feed-steps">
                    {steps.map(step => {
                      const data = feed[step];
                      return (
                        <div key={step} className={`lr__feed-step ${data ? 'done' : ''}`}>
                          <div className="lr__feed-step-dot" />
                          <span className="lr__feed-step-name">{step.toUpperCase()}</span>
                          {data && (
                            <StepSummary stepKey={step} result={data.result} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Step summary (compact) ──────────────────────────────────────────── */
function StepSummary({ stepKey, result }) {
  if (!result) return null;
  if (result.error) return <span className="r-badge r-badge-danger">Error</span>;
  if (result.skipped) return <span className="r-badge r-badge-neutral">Skipped</span>;

  if (stepKey === 'screen') {
    const cls = result.status === 'Include' ? 'r-badge-success' :
                result.status === 'Maybe' ? 'r-badge-warning' :
                result.status === 'Exclude' ? 'r-badge-danger' : 'r-badge-neutral';
    return <span className={`r-badge ${cls}`}>{result.status}</span>;
  }
  if (stepKey === 'path') {
    return result.path ? <span className="r-chip r-chip-sky">{result.path.replace(/_/g, ' ')}</span> : null;
  }
  if (stepKey === 'cg') {
    const count = Array.isArray(result.cg_mechanisms) ? result.cg_mechanisms.length : 0;
    return <span className="r-chip r-chip-indigo">{count} tags</span>;
  }
  if (stepKey === 'esg') {
    const count = Array.isArray(result.esg_outcomes) ? result.esg_outcomes.length : 0;
    return <span className="r-chip r-chip-emerald">{count} tags</span>;
  }
  if (stepKey === 'meta') {
    const cls = result.meta_potential === 'High' ? 'r-badge-success' :
                result.meta_potential === 'Low' ? 'r-badge-danger' : 'r-badge-warning';
    return <span className={`r-badge ${cls}`}>{result.meta_potential}</span>;
  }
  return null;
}

/* ─── Helper: collect unique values from results for filter dropdowns ── */
function collectFilterOptions(results) {
  const paths = new Set();
  const cgMechs = new Set();
  const esgOutcomes = new Set();
  const metaPotentials = new Set();
  const findingDirs = new Set();
  const regions = new Set();
  const methods = new Set();
  const industries = new Set();

  results.forEach(r => {
    const sr = r?.step_results;
    if (!sr) return;
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
    paths: [...paths].sort(),
    cgMechs: [...cgMechs].sort(),
    esgOutcomes: [...esgOutcomes].sort(),
    metaPotentials: [...metaPotentials],
    findingDirs: [...findingDirs],
    regions: [...regions].sort(),
    methods: [...methods].sort(),
    industries: [...industries].sort(),
  };
}

/* ─── Structured detail panel for expanded rows ──────────────────────── */
function ExpandedDetails({ result }) {
  const screen = result.step_results?.screen || {};
  const path = result.step_results?.path || {};
  const cg = result.step_results?.cg || {};
  const esg = result.step_results?.esg || {};
  const meta = result.step_results?.meta || {};
  const rowInfo = result._original_row || {};

  const DetailRow = ({ label, children }) => (
    children ? <div className="lr__detail-row"><span className="lr__detail-label">{label}</span><span className="lr__detail-value">{children}</span></div> : null
  );

  const ChipList = ({ items, cls }) => (
    items && items.length > 0 ? (
      <div className="r-flex" style={{ flexWrap: 'wrap', gap: 4 }}>
        {items.map(t => <span key={t} className={`r-chip ${cls || ''}`}>{t.replace(/_/g, ' ')}</span>)}
      </div>
    ) : null
  );

  return (
    <div className="lr__expanded">
      {/* Screening */}
      <div className="lr__detail-panel">
        <h4 className="lr__detail-panel-title">Screening</h4>
        <DetailRow label="Status">{screen.status}</DetailRow>
        <DetailRow label="Exclusion Code">{screen.exclusion_code}</DetailRow>
        <DetailRow label="Record Type">{screen.record_type?.replace(/_/g, ' ')}</DetailRow>
        <DetailRow label="Confidence">{screen.confidence != null ? `${Math.round(screen.confidence * 100)}%` : null}</DetailRow>
        <DetailRow label="Reasoning">{screen.reasoning}</DetailRow>
      </div>

      {/* Path & Relations */}
      <div className="lr__detail-panel">
        <h4 className="lr__detail-panel-title">Path & Relations</h4>
        <DetailRow label="Path Category">{path.path?.replace(/_/g, ' ')}</DetailRow>
        <DetailRow label="Relation Types"><ChipList items={path.relation_types} cls="r-chip-sky" /></DetailRow>
        <DetailRow label="Firm Perf Included">{path.firm_perf_included}</DetailRow>
        {path.firm_perf_measure_type && (
          <DetailRow label="FP Measures"><ChipList items={path.firm_perf_measure_type} /></DetailRow>
        )}
        <DetailRow label="Moderation Tested">{path.moderation_tested}</DetailRow>
        <DetailRow label="Mediation Tested">{path.mediation_tested}</DetailRow>
      </div>

      {/* CG Mechanisms */}
      <div className="lr__detail-panel">
        <h4 className="lr__detail-panel-title">CG Mechanisms</h4>
        <DetailRow label="Groups"><ChipList items={cg.cg_mechanisms} cls="r-chip-indigo" /></DetailRow>
        <DetailRow label="Details"><ChipList items={cg.cg_mechanism_details} /></DetailRow>
        <DetailRow label="Reasoning">{cg.reasoning}</DetailRow>
      </div>

      {/* ESG Outcomes */}
      <div className="lr__detail-panel">
        <h4 className="lr__detail-panel-title">ESG Outcomes</h4>
        <DetailRow label="Outcome Types"><ChipList items={esg.esg_outcomes} cls="r-chip-emerald" /></DetailRow>
        <DetailRow label="Measure Types"><ChipList items={esg.esg_measure_types} /></DetailRow>
        <DetailRow label="Reasoning">{esg.reasoning}</DetailRow>
      </div>

      {/* Meta / Context */}
      <div className="lr__detail-panel">
        <h4 className="lr__detail-panel-title">Meta-Analysis & Context</h4>
        <DetailRow label="Meta Potential">{meta.meta_potential}</DetailRow>
        <DetailRow label="Meta Path Fit">{meta.meta_path_fit?.replace(/_/g, ' ')}</DetailRow>
        <DetailRow label="Finding Direction">{meta.main_finding_direction}</DetailRow>
        <DetailRow label="Finding Note">{meta.main_finding_note}</DetailRow>
        <DetailRow label="Study Design">{meta.study_design}</DetailRow>
        <DetailRow label="Methods"><ChipList items={meta.estimation_methods} /></DetailRow>
        <DetailRow label="Endogeneity">{meta.endogeneity_addressed}</DetailRow>
        <DetailRow label="Theories"><ChipList items={meta.theories_used} /></DetailRow>
        <DetailRow label="Country/Region">{meta.country_name || meta.country_region}</DetailRow>
        <DetailRow label="Market Type">{meta.market_type}</DetailRow>
        <DetailRow label="Industry">{meta.industry_type?.replace(/_/g, ' ')}</DetailRow>
        <DetailRow label="Reasoning">{meta.reasoning}</DetailRow>
      </div>

      {/* Abstract */}
      <div className="lr__detail-panel">
        <h4 className="lr__detail-panel-title">Abstract</h4>
        <p className="r-text-sm" style={{ color: 'var(--r-text-secondary)', lineHeight: 1.7, margin: 0 }}>
          {rowInfo.Abstract || rowInfo.abstract || 'N/A'}
        </p>
      </div>
    </div>
  );
}

/* ─── Full Results View ───────────────────────────────────────────────── */
function SLRResultsView({ results, onReset, dedups }) {
  const [statusFilter, setStatusFilter] = useState('All');
  const [advancedFilters, setAdvancedFilters] = useState({
    path: '', cgMech: '', esgOutcome: '', metaPotential: '', findingDir: '', region: '', method: '', industry: '',
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [teachModal, setTeachModal] = useState(null);
  const [teachStatus, setTeachStatus] = useState(null);

  // Close modal on Escape key
  useEffect(() => {
    if (!teachModal) return;
    const handleEsc = (e) => { if (e.key === 'Escape') setTeachModal(null); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [teachModal]);

  const total = results.length;
  const counts = { Include: 0, Maybe: 0, Exclude: 0, Background: 0 };
  results.forEach(r => {
    const s = r?.step_results?.screen?.status;
    if (s in counts) counts[s]++;
  });

  const filterOptions = collectFilterOptions(results);

  const activeFilterCount = Object.values(advancedFilters).filter(v => v).length;

  const filteredResults = results.filter(r => {
    if (!r?.step_results) return false;
    const sr = r.step_results;
    const s = sr.screen?.status || 'Unknown';
    if (statusFilter !== 'All' && s !== statusFilter) return false;
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

  // ─── master_dt-aligned CSV export ─────────────────────────────────────
  const csvEscape = (val) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const arrJoin = (arr) => (Array.isArray(arr) ? arr : []).join('; ');

  const buildExportRow = (r, idx) => {
    const row = r._original_row || {};
    const screen = r.step_results?.screen || {};
    const path = r.step_results?.path || {};
    const cg = r.step_results?.cg || {};
    const esg = r.step_results?.esg || {};
    const meta = r.step_results?.meta || {};
    return {
      'Record_ID': idx + 1,
      'Title': row.Title || row.title || '',
      'Authors': row.Authors || row['Author full names'] || '',
      'Year': row.Year || '',
      'Journal': row.Journal || row['Source title'] || row.source || '',
      'DOI': row.DOI || '',
      'Source_DB': row._source || '',
      'Document_Type': row['Document Type'] || '',
      'Abstract': row.Abstract || row.abstract || '',
      'Author_Keywords': row['Author Keywords'] || '',
      'Index_Keywords': row['Index Keywords'] || row['Keywords Plus'] || '',
      // AI Screening
      'AI_Screen_Status': screen.status || '',
      'AI_Screen_Reason': screen.exclusion_code || '',
      'AI_Confidence': screen.confidence != null ? Math.round(screen.confidence * 100) : '',
      'AI_Reasoning': screen.reasoning || '',
      'AI_Record_Type': screen.record_type || '',
      // AI Path
      'AI_Path_Category': path.path || '',
      'AI_Relation_Type': arrJoin(path.relation_types),
      'AI_FP_Included': path.firm_perf_included || '',
      'AI_FP_Measure_Type': arrJoin(path.firm_perf_measure_type),
      'AI_Moderation_Tested': path.moderation_tested || '',
      'AI_Mediation_Tested': path.mediation_tested || '',
      // AI CG
      'AI_CG_Mechanism_Group': arrJoin(cg.cg_mechanisms),
      'AI_CG_Mechanism_Detail': arrJoin(cg.cg_mechanism_details),
      // AI ESG
      'AI_ESG_Outcome_Type': arrJoin(esg.esg_outcomes),
      'AI_ESG_Measure_Type': arrJoin(esg.esg_measure_types),
      // AI Meta
      'AI_Meta_Potential': meta.meta_potential || '',
      'AI_Meta_Path_Fit': meta.meta_path_fit || '',
      'AI_Finding_Direction': meta.main_finding_direction || '',
      'AI_Finding_Note': meta.main_finding_note || '',
      'AI_Study_Design': meta.study_design || '',
      'AI_Estimation_Method': arrJoin(meta.estimation_methods),
      'AI_Endogeneity': meta.endogeneity_addressed || '',
      'AI_Theory_Used': arrJoin(meta.theories_used),
      'AI_Country_Region': meta.country_region || '',
      'AI_Country_Name': meta.country_name || '',
      'AI_Market_Type': meta.market_type || '',
      'AI_Industry_Type': meta.industry_type || '',
      // User review columns (blank for manual fill)
      'User_Screen_Status': '',
      'User_Notes': '',
      'User_Changed': '',
    };
  };

  const exportCsv = () => {
    const rows = filteredResults.map((r, idx) => buildExportRow(r, idx));
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    let csv = headers.map(csvEscape).join(',') + '\n';
    rows.forEach(row => {
      csv += headers.map(h => csvEscape(row[h])).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'master_dt.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const submitFeedback = async () => {
    if (!teachModal) return;
    const { result, correctedStatus, correctedExclusionCode } = teachModal;
    const row = result._original_row || {};
    const correctedOutput = { status: correctedStatus };
    if (correctedExclusionCode) correctedOutput.exclusion_code = correctedExclusionCode;

    setTeachStatus('saving');
    try {
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiBase = isDev ? 'http://localhost:3001/api' : '/api';
      const res = await fetch(`${apiBase}/slr/feedback`, {
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

  const statusBadge = (s) => {
    const cls = s === 'Include' ? 'r-badge-success' :
                s === 'Maybe' ? 'r-badge-warning' :
                s === 'Exclude' ? 'r-badge-danger' : 'r-badge-neutral';
    return `r-badge ${cls}`;
  };

  const findingBadge = (dir) => {
    if (!dir) return null;
    const cls = dir === 'Positive' ? 'r-badge-success' :
                dir === 'Negative' ? 'r-badge-danger' :
                dir === 'Mixed' ? 'r-badge-warning' :
                dir === 'Insignificant' ? 'r-badge-neutral' : 'r-badge-info';
    return <span className={`r-badge ${cls}`} style={{ fontSize: 10, padding: '1px 5px' }}>{dir}</span>;
  };

  return (
    <div className="lr r-fade-in">
      {/* Header */}
      <div className="r-section-header">
        <div className="r-section-title-group">
          <h1>Review Results</h1>
          <p className="r-text-secondary r-text-sm">
            {total} articles processed
            {filteredResults.length !== total && ` \u00B7 ${filteredResults.length} shown`}
          </p>
        </div>
        <div className="r-flex r-gap-1">
          <button className="r-btn r-btn-secondary" onClick={onReset}>New Batch</button>
          <button className="r-btn r-btn-primary" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      {/* Dedup notice */}
      {dedups?.removed > 0 && (
        <div className="r-alert r-alert-info r-mt-2">
          <strong>Deduplication:</strong> Removed {dedups.removed} duplicate(s) before processing (Web of Science preferred over Scopus).
        </div>
      )}

      {/* Stats */}
      <div className="r-stat-grid r-mt-2">
        <div className="r-stat-card">
          <div className="r-stat-card__label">Processed</div>
          <div className="r-stat-card__value">{total}</div>
        </div>
        <div className="r-stat-card">
          <div className="r-stat-card__label">Include</div>
          <div className="r-stat-card__value success">{counts.Include}</div>
        </div>
        <div className="r-stat-card">
          <div className="r-stat-card__label">Maybe</div>
          <div className="r-stat-card__value warning">{counts.Maybe}</div>
          <div className="r-stat-card__sub">Needs full-text review</div>
        </div>
        <div className="r-stat-card">
          <div className="r-stat-card__label">Exclude</div>
          <div className="r-stat-card__value danger">{counts.Exclude}</div>
        </div>
        <div className="r-stat-card">
          <div className="r-stat-card__label">Background</div>
          <div className="r-stat-card__value">{counts.Background}</div>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="r-tabs r-mt-3">
        {['All', 'Include', 'Maybe', 'Exclude', 'Background'].map(f => (
          <button
            key={f}
            className={`r-tab ${statusFilter === f ? 'active' : ''}`}
            onClick={() => setStatusFilter(f)}
          >
            {f} {f !== 'All' && counts[f] != null ? `(${counts[f]})` : ''}
          </button>
        ))}
        <button
          className={`r-tab ${showAdvancedFilters ? 'active' : ''}`}
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          style={{ marginLeft: 'auto' }}
        >
          Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
        </button>
      </div>

      {/* Advanced filter panel */}
      {showAdvancedFilters && (
        <div className="lr__filters r-card r-card-padded r-slide-up">
          <div className="lr__filters-grid">
            <div className="lr__filter-group">
              <label className="r-label">Path</label>
              <select className="r-select" value={advancedFilters.path} onChange={e => setAdvancedFilters(f => ({ ...f, path: e.target.value }))}>
                <option value="">All Paths</option>
                {filterOptions.paths.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="lr__filter-group">
              <label className="r-label">CG Mechanism</label>
              <select className="r-select" value={advancedFilters.cgMech} onChange={e => setAdvancedFilters(f => ({ ...f, cgMech: e.target.value }))}>
                <option value="">All CG</option>
                {filterOptions.cgMechs.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="lr__filter-group">
              <label className="r-label">ESG Outcome</label>
              <select className="r-select" value={advancedFilters.esgOutcome} onChange={e => setAdvancedFilters(f => ({ ...f, esgOutcome: e.target.value }))}>
                <option value="">All ESG</option>
                {filterOptions.esgOutcomes.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="lr__filter-group">
              <label className="r-label">Meta Potential</label>
              <select className="r-select" value={advancedFilters.metaPotential} onChange={e => setAdvancedFilters(f => ({ ...f, metaPotential: e.target.value }))}>
                <option value="">All</option>
                {filterOptions.metaPotentials.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="lr__filter-group">
              <label className="r-label">Finding Direction</label>
              <select className="r-select" value={advancedFilters.findingDir} onChange={e => setAdvancedFilters(f => ({ ...f, findingDir: e.target.value }))}>
                <option value="">All</option>
                {filterOptions.findingDirs.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="lr__filter-group">
              <label className="r-label">Region</label>
              <select className="r-select" value={advancedFilters.region} onChange={e => setAdvancedFilters(f => ({ ...f, region: e.target.value }))}>
                <option value="">All Regions</option>
                {filterOptions.regions.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="lr__filter-group">
              <label className="r-label">Method</label>
              <select className="r-select" value={advancedFilters.method} onChange={e => setAdvancedFilters(f => ({ ...f, method: e.target.value }))}>
                <option value="">All Methods</option>
                {filterOptions.methods.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="lr__filter-group">
              <label className="r-label">Industry</label>
              <select className="r-select" value={advancedFilters.industry} onChange={e => setAdvancedFilters(f => ({ ...f, industry: e.target.value }))}>
                <option value="">All Industries</option>
                {filterOptions.industries.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <div className="r-mt-1">
              <button className="r-btn r-btn-ghost r-btn-sm" onClick={clearAdvancedFilters}>Clear all filters</button>
            </div>
          )}
        </div>
      )}

      {/* Results table */}
      <div className="r-table-container">
        <table className="r-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title & Details</th>
              <th>Decision</th>
              <th>Path</th>
              <th>Tags</th>
              <th>Meta & Finding</th>
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

              return (
                <React.Fragment key={i}>
                  <tr>
                    <td>{(r._index ?? i) + 1}</td>
                    <td style={{ maxWidth: '300px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--r-text)', lineHeight: 1.4 }}>
                        {rowInfo.Title || rowInfo.title || 'Unknown Title'}
                      </div>
                      <div className="r-text-xs r-text-muted r-mt-1">
                        {rowInfo.Journal || rowInfo.source} {rowInfo.Year ? `\u00B7 ${rowInfo.Year}` : ''}
                        {rowInfo._source && <span className="r-chip" style={{ marginLeft: 6, padding: '1px 6px', fontSize: 10 }}>{rowInfo._source}</span>}
                      </div>
                    </td>
                    <td>
                      <span className={statusBadge(screen.status)}>{screen.status || 'N/A'}</span>
                      {screen.exclusion_code && (
                        <div className="r-text-xs r-text-muted r-mt-1">{screen.exclusion_code}</div>
                      )}
                      {screen.confidence != null && (
                        <div className="r-text-xs r-text-muted">{Math.round(screen.confidence * 100)}%</div>
                      )}
                    </td>
                    <td>
                      {path.path && (
                        <span className="r-chip r-chip-sky" style={{ fontSize: 11 }}>{path.path.replace(/_/g, ' ')}</span>
                      )}
                      {path.skipped && (
                        <span className="r-chip">skipped</span>
                      )}
                    </td>
                    <td style={{ maxWidth: '220px' }}>
                      <div className="r-flex" style={{ flexWrap: 'wrap', gap: 3 }}>
                        {(Array.isArray(cg.cg_mechanisms) ? cg.cg_mechanisms : []).slice(0, 2).map(t => (
                          <span key={t} className="r-chip r-chip-indigo" style={{ fontSize: 10 }}>{t.replace(/_/g, ' ')}</span>
                        ))}
                        {(Array.isArray(cg.cg_mechanisms) && cg.cg_mechanisms.length > 2) && (
                          <span className="r-chip" style={{ fontSize: 10 }}>+{cg.cg_mechanisms.length - 2}</span>
                        )}
                        {(Array.isArray(esg.esg_outcomes) ? esg.esg_outcomes : []).slice(0, 2).map(t => (
                          <span key={t} className="r-chip r-chip-emerald" style={{ fontSize: 10 }}>{t.replace(/_/g, ' ')}</span>
                        ))}
                        {(Array.isArray(esg.esg_outcomes) && esg.esg_outcomes.length > 2) && (
                          <span className="r-chip" style={{ fontSize: 10 }}>+{esg.esg_outcomes.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {meta.meta_potential && (
                        <span className={`r-badge ${meta.meta_potential === 'High' ? 'r-badge-success' : meta.meta_potential === 'Low' ? 'r-badge-danger' : 'r-badge-warning'}`}
                          style={{ fontSize: 10, padding: '1px 5px' }}>
                          {meta.meta_potential}
                        </span>
                      )}
                      {findingBadge(meta.main_finding_direction)}
                      {meta.country_region && meta.country_region !== 'Not_Clear' && (
                        <div className="r-text-xs r-text-muted r-mt-1">{meta.country_name || meta.country_region.replace(/_/g, ' ')}</div>
                      )}
                      {meta.study_design && meta.study_design !== 'Not_Clear' && (
                        <div className="r-text-xs r-text-muted">{meta.study_design}</div>
                      )}
                    </td>
                    <td>
                      <div className="r-flex r-gap-1">
                        <button
                          className="r-btn r-btn-ghost r-btn-sm"
                          onClick={() => setExpandedRow(isExpanded ? null : i)}
                        >
                          {isExpanded ? 'Hide' : 'Details'}
                        </button>
                        <button
                          className="r-btn r-btn-ghost r-btn-sm"
                          onClick={() => {
                            setTeachModal({ result: r, correctedStatus: screen.status || 'Include' });
                            setTeachStatus(null);
                          }}
                        >
                          Teach AI
                        </button>
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan="7" style={{ padding: '16px 20px', background: 'var(--r-bg-alt)' }}>
                        <ExpandedDetails result={r} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {filteredResults.length === 0 && (
          <div className="r-empty">
            <div className="r-empty__icon">?</div>
            <h3>No articles match this filter</h3>
            <p>Try adjusting your filter criteria above.</p>
          </div>
        )}
      </div>

      {/* Teach AI Modal */}
      {teachModal && (
        <div className="r-modal-overlay" onClick={() => setTeachModal(null)}>
          <div className="r-modal" role="dialog" aria-modal="true" aria-labelledby="teach-modal-title" onClick={e => e.stopPropagation()}>
            <div className="r-modal-header">
              <h3 id="teach-modal-title">Correct & Teach AI</h3>
              <button className="r-btn r-btn-ghost r-btn-sm" onClick={() => setTeachModal(null)}>&times;</button>
            </div>
            <div className="r-modal-body">
              <p className="r-text-sm r-text-muted r-mb-2">
                Your correction will be added as a few-shot example in the Screener agent's prompt for future runs.
              </p>
              <div style={{ fontWeight: 600, marginBottom: 16, lineHeight: 1.4 }}>
                {teachModal.result._original_row?.Title || teachModal.result._original_row?.title || 'Unknown'}
              </div>
              <div className="r-mb-2">
                <label className="r-label">Correct Status</label>
                <select
                  className="r-select"
                  value={teachModal.correctedStatus}
                  onChange={e => setTeachModal(m => ({ ...m, correctedStatus: e.target.value }))}
                >
                  <option value="Include">Include</option>
                  <option value="Maybe">Maybe</option>
                  <option value="Exclude">Exclude</option>
                  <option value="Background">Background</option>
                </select>
              </div>
              {(teachModal.correctedStatus === 'Exclude' || teachModal.correctedStatus === 'Background') && (
                <div className="r-mb-2">
                  <label className="r-label">Exclusion / Background Code</label>
                  <input
                    type="text"
                    className="r-input"
                    placeholder="e.g. TA-E1, TA-B1"
                    value={teachModal.correctedExclusionCode || ''}
                    onChange={e => setTeachModal(m => ({ ...m, correctedExclusionCode: e.target.value }))}
                  />
                </div>
              )}
              {teachStatus === 'saved' && (
                <div className="r-alert r-alert-success">Saved to agent prompt.</div>
              )}
              {teachStatus && teachStatus.startsWith('error') && (
                <div className="r-alert r-alert-danger">{teachStatus}</div>
              )}
            </div>
            {teachStatus !== 'saved' && (
              <div className="r-modal-footer">
                <button className="r-btn r-btn-secondary" onClick={() => setTeachModal(null)}>Cancel</button>
                <button className="r-btn r-btn-primary" onClick={submitFeedback} disabled={teachStatus === 'saving'}>
                  {teachStatus === 'saving' ? 'Saving...' : 'Save Correction'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

