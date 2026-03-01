import React, { useState, useRef, useEffect } from 'react';
import './LiteratureReview.css';

export function LiteratureReview({ slr }) {
  const [maxArticles, setMaxArticles] = useState(3);
  const [dragOver, setDragOver] = useState(false);
  const [model, setModel] = useState('haiku');
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

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      slr.uploadFiles(e.dataTransfer.files).catch(err => console.error('Upload failed:', err));
    }
  };

  const handleRun = async () => {
    try {
      await slr.startRun(maxArticles, model);
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
            className={`r-dropzone ${dragOver ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Upload bibliographic CSV or Excel files"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="r-dropzone__icon">L</div>
            <h3>Upload Bibliographic Data</h3>
            <p>Drop CSV/Excel files here or click to browse</p>
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
            <div className="lr__config-row">
              <div className="lr__max-input">
                <label className="r-label">Max articles (0 = all)</label>
                <input
                  type="number"
                  className="r-input"
                  value={maxArticles}
                  onChange={(e) => setMaxArticles(Number(e.target.value))}
                  min={0}
                  style={{ width: '120px' }}
                />
              </div>
              <div className="lr__max-input">
                <label className="r-label">AI Model</label>
                <select
                  className="r-select"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  style={{ width: '160px' }}
                >
                  <option value="haiku">Haiku (Fast)</option>
                  <option value="sonnet">Sonnet (Balanced)</option>
                  <option value="opus">Opus (Best)</option>
                </select>
              </div>
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

      {/* Error state */}
      {slr.jobStatus === 'error' && (
        <div className="r-alert r-alert-danger r-mt-2 r-slide-up">
          <strong>Pipeline Error:</strong> {slr.error || 'An unexpected error occurred.'}
          <div className="r-mt-1">
            <button className="r-btn r-btn-sm r-btn-secondary" onClick={slr.reset}>Try Again</button>
          </div>
        </div>
      )}

      {/* Running */}
      {(slr.jobStatus === 'starting' || slr.jobStatus === 'screening') && (
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
            {slr.dedups && slr.dedups.removed > 0 && (
              <DedupDetails dedups={slr.dedups} />
            )}
          </div>

          {/* Live feed */}
          <div className="lr__feed r-mt-2">
            {Array.from({ length: slr.total }).map((_, idx) => {
              const feed = slr.liveFeed[idx] || {};
              if (Object.keys(feed).length === 0) return null;

              const steps = ['screen', 'path', 'cg', 'esg', 'meta'];
              const completedSteps = steps.filter(s => feed[s]);
              const articleTitle = slr.articleTitles?.[idx];

              return (
                <div key={idx} className="lr__feed-item r-card r-card-padded">
                  <div className="r-flex r-items-center r-justify-between r-mb-1">
                    <h4>
                      {articleTitle
                        ? (articleTitle.length > 70 ? articleTitle.substring(0, 70) + '...' : articleTitle)
                        : `Article #${idx + 1}`}
                    </h4>
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

/* ─── Dedup Details (expandable) ──────────────────────────────────────── */
function DedupDetails({ dedups }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="r-mt-2">
      <div className="r-alert r-alert-info" style={{ cursor: 'pointer' }} onClick={() => setShowDetails(v => !v)}>
        <strong>Deduplication:</strong> Kept {dedups.kept}, removed {dedups.removed} duplicate(s).
        {dedups.details?.length > 0 && (
          <span className="r-text-xs" style={{ marginLeft: 8 }}>
            {showDetails ? 'Hide details' : 'Show details'}
          </span>
        )}
      </div>
      {showDetails && dedups.details?.length > 0 && (
        <div className="lr__dedup-details r-mt-1">
          {dedups.details.map((d, i) => (
            <div key={i} className="lr__dedup-item">
              <span className="r-text-sm">{d.title}</span>
              <span className="r-chip r-text-xs">{d.reason}</span>
            </div>
          ))}
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

/* ─── Full Results View ───────────────────────────────────────────────── */
function SLRResultsView({ results, onReset, dedups }) {
  const [filter, setFilter] = useState('All');
  const [expandedRow, setExpandedRow] = useState(null);
  const [teachModal, setTeachModal] = useState(null);
  const [teachStatus, setTeachStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [showStats, setShowStats] = useState(false);

  // Close modal on Escape key — use stopImmediatePropagation to prevent ResearchApp's handler
  useEffect(() => {
    if (!teachModal) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        setTeachModal(null);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [teachModal]);

  const total = results.length;
  const counts = { Include: 0, Maybe: 0, Exclude: 0, Background: 0 };
  results.forEach(r => {
    const s = r?.step_results?.screen?.status;
    if (s in counts) counts[s]++;
  });

  // Compute tag frequency stats
  const tagStats = React.useMemo(() => {
    const cgFreq = {};
    const esgFreq = {};
    const pathFreq = {};
    results.forEach(r => {
      const sr = r?.step_results;
      if (!sr) return;
      (sr.cg?.cg_mechanisms || []).forEach(t => { cgFreq[t] = (cgFreq[t] || 0) + 1; });
      (sr.esg?.esg_outcomes || []).forEach(t => { esgFreq[t] = (esgFreq[t] || 0) + 1; });
      if (sr.path?.path) pathFreq[sr.path.path] = (pathFreq[sr.path.path] || 0) + 1;
    });
    const sort = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);
    return { cg: sort(cgFreq), esg: sort(esgFreq), path: sort(pathFreq) };
  }, [results]);

  // Filter by status tab + search query
  const filteredResults = React.useMemo(() => {
    let items = results.filter(r => {
      if (!r?.step_results) return false;
      const s = r.step_results.screen?.status || 'Unknown';
      return filter === 'All' || s === filter;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(r => {
        const row = r._original_row || {};
        const title = (row.Title || row.title || '').toLowerCase();
        const authors = (row.Authors || row.authors || '').toLowerCase();
        const abstract = (row.Abstract || row.abstract || '').toLowerCase();
        const journal = (row.Journal || row.journal || '').toLowerCase();
        return title.includes(q) || authors.includes(q) || abstract.includes(q) || journal.includes(q);
      });
    }

    return items;
  }, [results, filter, searchQuery]);

  // Sort filtered results
  const sortedResults = React.useMemo(() => {
    if (!sortCol) return filteredResults;
    const sorted = [...filteredResults].sort((a, b) => {
      let av, bv;
      const aRow = a._original_row || {};
      const bRow = b._original_row || {};
      if (sortCol === 'title') {
        av = (aRow.Title || aRow.title || '').toLowerCase();
        bv = (bRow.Title || bRow.title || '').toLowerCase();
      } else if (sortCol === 'decision') {
        const order = { Include: 0, Maybe: 1, Background: 2, Exclude: 3 };
        av = order[a.step_results?.screen?.status] ?? 4;
        bv = order[b.step_results?.screen?.status] ?? 4;
      } else if (sortCol === 'confidence') {
        av = a.step_results?.screen?.confidence ?? 0;
        bv = b.step_results?.screen?.confidence ?? 0;
      } else if (sortCol === 'path') {
        av = (a.step_results?.path?.path || '').toLowerCase();
        bv = (b.step_results?.path?.path || '').toLowerCase();
      } else if (sortCol === 'meta') {
        const order = { High: 0, Medium: 1, Low: 2 };
        av = order[a.step_results?.meta?.meta_potential] ?? 3;
        bv = order[b.step_results?.meta?.meta_potential] ?? 3;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredResults, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sortIndicator = (col) => {
    if (sortCol !== col) return <span className="lr__sort-icon">{'\u2195'}</span>;
    return <span className="lr__sort-icon active">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>;
  };

  const csvEscape = (val) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const exportCsv = () => {
    let csv = 'Article ID,Title,Authors,Year,Journal,DOI,Screen Status,Exclusion Code,Path,CG Mechanisms,ESG Outcomes,Meta Potential\n';
    sortedResults.forEach((r, idx) => {
      const row = r._original_row || {};
      const screen = r.step_results?.screen || {};
      const path = r.step_results?.path || {};
      const cg = r.step_results?.cg || {};
      const esg = r.step_results?.esg || {};
      const meta = r.step_results?.meta || {};
      const cgStr = (Array.isArray(cg.cg_mechanisms) ? cg.cg_mechanisms : []).join('; ');
      const esgStr = (Array.isArray(esg.esg_outcomes) ? esg.esg_outcomes : []).join('; ');
      csv += [
        idx + 1,
        csvEscape(row.Title || row.title || ''),
        csvEscape(row.Authors || ''),
        csvEscape(row.Year || ''),
        csvEscape(row.Journal || ''),
        csvEscape(row.DOI || ''),
        csvEscape(screen.status || ''),
        csvEscape(screen.exclusion_code || ''),
        csvEscape(path.path || ''),
        csvEscape(cgStr),
        csvEscape(esgStr),
        csvEscape(meta.meta_potential || ''),
      ].join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'slr_results.csv'; a.click();
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

  const handleReset = () => {
    if (window.confirm('Start a new batch? Current results will be cleared.')) {
      onReset();
    }
  };

  return (
    <div className="lr r-fade-in">
      {/* Header */}
      <div className="r-section-header">
        <div className="r-section-title-group">
          <h1>Review Results</h1>
          <p className="r-text-secondary r-text-sm">{total} articles processed</p>
        </div>
        <div className="r-flex r-gap-1">
          <button className="r-btn r-btn-secondary" onClick={handleReset}>New Batch</button>
          <button className="r-btn r-btn-primary" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      {/* Dedup notice */}
      {dedups?.removed > 0 && (
        <DedupDetails dedups={dedups} />
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

      {/* Filter tabs + search */}
      <div className="lr__toolbar r-mt-3">
        <div className="r-tabs">
          {['All', 'Include', 'Maybe', 'Exclude', 'Background'].map(f => (
            <button
              key={f}
              className={`r-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f} {f !== 'All' && counts[f] != null ? `(${counts[f]})` : ''}
            </button>
          ))}
        </div>
        <div className="lr__toolbar-right">
          <button
            className={`r-btn r-btn-ghost r-btn-sm ${showStats ? 'active' : ''}`}
            onClick={() => setShowStats(v => !v)}
            title="Toggle tag frequency stats"
          >
            Stats
          </button>
          <div className="lr__search">
            <input
              type="text"
              className="r-input lr__search-input"
              placeholder="Search title, authors, abstract..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="lr__search-clear" onClick={() => setSearchQuery('')}>&times;</button>
            )}
          </div>
        </div>
      </div>

      {/* Tag frequency stats panel */}
      {showStats && (
        <div className="lr__stats-panel r-card r-card-padded r-mt-2 r-slide-up">
          <div className="lr__stats-grid">
            <div className="lr__stats-col">
              <h4>Pathways</h4>
              {tagStats.path.length > 0 ? tagStats.path.map(([tag, count]) => (
                <div key={tag} className="lr__stats-row">
                  <span className="r-chip r-chip-sky">{tag.replace(/_/g, ' ')}</span>
                  <span className="lr__stats-bar-wrap">
                    <span className="lr__stats-bar lr__stats-bar--sky" style={{ width: `${(count / total) * 100}%` }} />
                  </span>
                  <span className="r-text-xs r-text-muted">{count}</span>
                </div>
              )) : <p className="r-text-xs r-text-muted">No path data</p>}
            </div>
            <div className="lr__stats-col">
              <h4>CG Mechanisms</h4>
              {tagStats.cg.length > 0 ? tagStats.cg.slice(0, 8).map(([tag, count]) => (
                <div key={tag} className="lr__stats-row">
                  <span className="r-chip r-chip-indigo">{tag.replace(/_/g, ' ')}</span>
                  <span className="lr__stats-bar-wrap">
                    <span className="lr__stats-bar lr__stats-bar--indigo" style={{ width: `${(count / total) * 100}%` }} />
                  </span>
                  <span className="r-text-xs r-text-muted">{count}</span>
                </div>
              )) : <p className="r-text-xs r-text-muted">No CG data</p>}
            </div>
            <div className="lr__stats-col">
              <h4>ESG Outcomes</h4>
              {tagStats.esg.length > 0 ? tagStats.esg.slice(0, 8).map(([tag, count]) => (
                <div key={tag} className="lr__stats-row">
                  <span className="r-chip r-chip-emerald">{tag.replace(/_/g, ' ')}</span>
                  <span className="lr__stats-bar-wrap">
                    <span className="lr__stats-bar lr__stats-bar--emerald" style={{ width: `${(count / total) * 100}%` }} />
                  </span>
                  <span className="r-text-xs r-text-muted">{count}</span>
                </div>
              )) : <p className="r-text-xs r-text-muted">No ESG data</p>}
            </div>
          </div>
        </div>
      )}

      {/* Search result count */}
      {searchQuery && (
        <div className="r-text-sm r-text-muted r-mt-1">
          {sortedResults.length} result{sortedResults.length !== 1 ? 's' : ''} matching &ldquo;{searchQuery}&rdquo;
        </div>
      )}

      {/* Results table */}
      <div className="r-table-container">
        <table className="r-table">
          <thead>
            <tr>
              <th>#</th>
              <th className="lr__sortable" onClick={() => handleSort('title')}>Title & Details {sortIndicator('title')}</th>
              <th className="lr__sortable" onClick={() => handleSort('decision')}>Decision {sortIndicator('decision')}</th>
              <th className="lr__sortable" onClick={() => handleSort('path')}>Path {sortIndicator('path')}</th>
              <th>Tags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((r, i) => {
              const screen = r.step_results?.screen || {};
              const path = r.step_results?.path || {};
              const cg = r.step_results?.cg || {};
              const esg = r.step_results?.esg || {};
              const rowInfo = r._original_row || {};
              const isExpanded = expandedRow === i;

              return (
                <React.Fragment key={i}>
                  <tr>
                    <td>{(r._index ?? i) + 1}</td>
                    <td style={{ maxWidth: '340px' }}>
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
                        <div className="r-text-xs r-text-muted">{Math.round(screen.confidence * 100)}% conf.</div>
                      )}
                    </td>
                    <td>
                      {path.path && (
                        <span className="r-chip r-chip-sky">{path.path.replace(/_/g, ' ')}</span>
                      )}
                      {path.skipped && (
                        <span className="r-chip">skipped</span>
                      )}
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      <div className="r-flex" style={{ flexWrap: 'wrap', gap: 4 }}>
                        {(Array.isArray(cg.cg_mechanisms) ? cg.cg_mechanisms : []).slice(0, 2).map(t => (
                          <span key={t} className="r-chip r-chip-indigo">{t.replace(/_/g, ' ')}</span>
                        ))}
                        {(Array.isArray(cg.cg_mechanisms) && cg.cg_mechanisms.length > 2) && (
                          <span className="r-chip">+{cg.cg_mechanisms.length - 2}</span>
                        )}
                        {(Array.isArray(esg.esg_outcomes) ? esg.esg_outcomes : []).slice(0, 2).map(t => (
                          <span key={t} className="r-chip r-chip-emerald">{t.replace(/_/g, ' ')}</span>
                        ))}
                        {(Array.isArray(esg.esg_outcomes) && esg.esg_outcomes.length > 2) && (
                          <span className="r-chip">+{esg.esg_outcomes.length - 2}</span>
                        )}
                      </div>
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
                      <td colSpan="6" style={{ padding: '16px 20px', background: 'var(--r-bg-alt)' }}>
                        <div className="lr__expanded">
                          <div className="lr__expanded-section">
                            <h4>Reasoning</h4>
                            <p className="r-text-sm">{screen.reasoning || 'N/A'}</p>
                          </div>
                          <div className="lr__expanded-section">
                            <h4>Abstract</h4>
                            <p className="r-text-sm">{rowInfo.Abstract || rowInfo.abstract || 'N/A'}</p>
                          </div>
                          <div className="lr__expanded-grid">
                            {['screen', 'path', 'cg', 'esg', 'meta'].map(step => (
                              <div key={step} className="lr__expanded-step">
                                <h4>{step.toUpperCase()}</h4>
                                <pre className="lr__step-json">{JSON.stringify(r.step_results[step], null, 2)}</pre>
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
        {sortedResults.length === 0 && (
          <div className="r-empty">
            <div className="r-empty__icon">?</div>
            <h3>No articles match this filter</h3>
            <p>Try selecting a different filter tab above.</p>
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
