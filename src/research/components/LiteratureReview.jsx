import { useState, useRef } from 'react';
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
            onClick={() => fileInputRef.current?.click()}
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
              <div className="r-stat-card__value accent">{slr.uploadStats?.files.length}</div>
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

/* ─── Full Results View ───────────────────────────────────────────────── */
function SLRResultsView({ results, onReset, dedups }) {
  const [filter, setFilter] = useState('All');
  const [expandedRow, setExpandedRow] = useState(null);
  const [teachModal, setTeachModal] = useState(null);
  const [teachStatus, setTeachStatus] = useState(null);

  const total = results.length;
  const counts = { Include: 0, Maybe: 0, Exclude: 0, Background: 0 };
  results.forEach(r => {
    const s = r?.step_results?.screen?.status;
    if (s in counts) counts[s]++;
  });

  const filteredResults = results.filter(r => {
    if (!r?.step_results) return false;
    const s = r.step_results.screen?.status || 'Unknown';
    return filter === 'All' || s === filter;
  });

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

  return (
    <div className="lr r-fade-in">
      {/* Header */}
      <div className="r-section-header">
        <div className="r-section-title-group">
          <h1>Review Results</h1>
          <p className="r-text-secondary r-text-sm">{total} articles processed</p>
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

      {/* Filter tabs */}
      <div className="r-tabs r-mt-3">
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
        {filteredResults.length === 0 && (
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
          <div className="r-modal" onClick={e => e.stopPropagation()}>
            <div className="r-modal-header">
              <h3>Correct & Teach AI</h3>
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

// Need React for Fragment usage in JSX
import React from 'react';
