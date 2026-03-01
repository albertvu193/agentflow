import React, { useState, useCallback, useMemo } from 'react';
import { formatMarkdown } from '../utils/formatMarkdown';
import './ResearchLibrary.css';

export function ResearchLibrary({ slr, kristen }) {
  const [activeTab, setActiveTab] = useState('overview');

  const hasSlrResults = slr.jobStatus === 'done' && slr.results.length > 0;
  const hasKristenResult = kristen.status === 'done' && kristen.result;

  return (
    <div className="rl r-fade-in">
      <div className="r-section-header">
        <div className="r-section-title-group">
          <h1>Research Library</h1>
          <p className="r-text-secondary r-text-sm">
            Browse and export your completed research analyses.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="r-tabs r-mt-2">
        <button className={`r-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button className={`r-tab ${activeTab === 'slr' ? 'active' : ''}`} onClick={() => setActiveTab('slr')}>
          SLR Results {hasSlrResults && `(${slr.results.length})`}
        </button>
        <button className={`r-tab ${activeTab === 'papers' ? 'active' : ''}`} onClick={() => setActiveTab('papers')}>
          Paper Insights {hasKristenResult ? '(1)' : ''}
        </button>
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="r-slide-up">
          <div className="r-stat-grid r-mb-3">
            <div className="r-stat-card">
              <div className="r-stat-card__label">SLR Articles</div>
              <div className="r-stat-card__value accent">{hasSlrResults ? slr.results.length : 0}</div>
              <div className="r-stat-card__sub">{slr.jobStatus === 'screening' ? 'Processing...' : hasSlrResults ? 'Completed' : 'No batch run yet'}</div>
            </div>
            <div className="r-stat-card">
              <div className="r-stat-card__label">Papers Analyzed</div>
              <div className="r-stat-card__value accent">{hasKristenResult ? 1 : 0}</div>
              <div className="r-stat-card__sub">{kristen.status === 'running' ? 'Analyzing...' : hasKristenResult ? 'Completed' : 'No paper analyzed yet'}</div>
            </div>
            <div className="r-stat-card">
              <div className="r-stat-card__label">Pipeline Status</div>
              <div className="r-stat-card__value">{slr.jobStatus === 'idle' ? '--' : slr.jobStatus}</div>
              <div className="r-stat-card__sub">SLR pipeline</div>
            </div>
          </div>

          {!hasSlrResults && !hasKristenResult && (
            <div className="r-empty">
              <div className="r-empty__icon">R</div>
              <h3>No Research Data Yet</h3>
              <p>Run a paper analysis or literature review to populate your research library.</p>
            </div>
          )}

          {/* Quick summaries */}
          {hasSlrResults && (
            <div className="r-card r-card-padded r-mb-2">
              <h3>Latest SLR Batch</h3>
              <p className="r-text-sm r-text-muted r-mt-1">
                {slr.results.length} articles classified across 5 pipeline stages.
              </p>
              <div className="rl__quick-stats r-mt-2">
                {(() => {
                  const counts = { Include: 0, Maybe: 0, Exclude: 0, Background: 0 };
                  slr.results.forEach(r => {
                    const s = r?.step_results?.screen?.status;
                    if (s in counts) counts[s]++;
                  });
                  return Object.entries(counts).map(([label, count]) => (
                    <div key={label} className="rl__quick-stat">
                      <span className="rl__quick-stat-count">{count}</span>
                      <span className="rl__quick-stat-label">{label}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {hasKristenResult && (
            <div className="r-card r-card-padded">
              <h3>Latest Paper Analysis</h3>
              <p className="r-text-sm r-text-muted r-mt-1">
                {kristen.uploadInfo?.filename || 'Research Paper'}
              </p>
              <div className="r-text-sm r-mt-2" style={{ lineHeight: 1.6, color: 'var(--r-text-secondary)' }}>
                {kristen.result?.substring(0, 300)}...
              </div>
            </div>
          )}
        </div>
      )}

      {/* SLR tab */}
      {activeTab === 'slr' && (
        <div className="r-slide-up">
          {hasSlrResults ? (
            <SLRLibraryTable results={slr.results} />
          ) : (
            <div className="r-empty">
              <div className="r-empty__icon">L</div>
              <h3>No SLR Results</h3>
              <p>Run the Literature Review pipeline to see classified articles here.</p>
            </div>
          )}
        </div>
      )}

      {/* Papers tab */}
      {activeTab === 'papers' && (
        <div className="r-slide-up">
          {hasKristenResult ? (
            <PaperInsightsCard kristen={kristen} />
          ) : (
            <div className="r-empty">
              <div className="r-empty__icon">P</div>
              <h3>No Paper Analyses</h3>
              <p>Upload and analyze a research paper to see insights here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Paper Insights Card (with copy/download) ───────────────────────── */
function PaperInsightsCard({ kristen }) {
  const [copyFeedback, setCopyFeedback] = useState(false);

  const copyToClipboard = useCallback(() => {
    if (!kristen.result) return;
    navigator.clipboard.writeText(kristen.result).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  }, [kristen.result]);

  const downloadAsText = useCallback(() => {
    if (!kristen.result) return;
    const filename = (kristen.uploadInfo?.filename || 'analysis').replace(/\.pdf$/i, '') + '_analysis.md';
    const blob = new Blob([kristen.result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }, [kristen.result, kristen.uploadInfo?.filename]);

  return (
    <div className="r-card r-card-padded">
      <div className="r-flex r-items-center r-justify-between r-mb-2">
        <div>
          <h3>{kristen.uploadInfo?.filename || 'Research Paper'}</h3>
          <p className="r-text-xs r-text-muted r-mt-1">
            {kristen.uploadInfo?.pages} pages &middot; {Math.round((kristen.uploadInfo?.textLength || 0) / 1000)}k characters
          </p>
        </div>
        <div className="r-flex r-gap-1">
          <button className="r-btn r-btn-ghost r-btn-sm" onClick={copyToClipboard}>
            {copyFeedback ? 'Copied!' : 'Copy'}
          </button>
          <button className="r-btn r-btn-ghost r-btn-sm" onClick={downloadAsText}>
            Download .md
          </button>
        </div>
      </div>
      <div className="r-divider" />
      <div
        className="rl__paper-result"
        dangerouslySetInnerHTML={{ __html: formatMarkdown(kristen.result) }}
      />
    </div>
  );
}

/* ─── SLR Library Table (with search, sort, expand, tags) ────────────── */
function SLRLibraryTable({ results }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [expandedRow, setExpandedRow] = useState(null);
  const [filter, setFilter] = useState('All');

  const counts = useMemo(() => {
    const c = { Include: 0, Maybe: 0, Exclude: 0, Background: 0 };
    results.forEach(r => {
      const s = r?.step_results?.screen?.status;
      if (s in c) c[s]++;
    });
    return c;
  }, [results]);

  const filteredResults = useMemo(() => {
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
        const journal = (row.Journal || row.journal || '').toLowerCase();
        return title.includes(q) || authors.includes(q) || journal.includes(q);
      });
    }
    return items;
  }, [results, filter, searchQuery]);

  const sortedResults = useMemo(() => {
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

  const statusBadge = (s) => {
    const cls = s === 'Include' ? 'r-badge-success' :
                s === 'Maybe' ? 'r-badge-warning' :
                s === 'Exclude' ? 'r-badge-danger' : 'r-badge-neutral';
    return `r-badge ${cls}`;
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
    a.href = url; a.download = 'slr_library_export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="lr__toolbar r-mb-2">
        <div className="r-tabs">
          {['All', 'Include', 'Maybe', 'Exclude', 'Background'].map(f => (
            <button key={f} className={`r-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f} {f !== 'All' && counts[f] != null ? `(${counts[f]})` : ''}
            </button>
          ))}
        </div>
        <div className="lr__toolbar-right">
          <div className="lr__search">
            <input
              type="text"
              className="r-input lr__search-input"
              placeholder="Search title, authors, journal..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="lr__search-clear" onClick={() => setSearchQuery('')}>&times;</button>
            )}
          </div>
          <button className="r-btn r-btn-secondary r-btn-sm" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      {searchQuery && (
        <div className="r-text-sm r-text-muted r-mb-1">
          {sortedResults.length} result{sortedResults.length !== 1 ? 's' : ''} matching &ldquo;{searchQuery}&rdquo;
        </div>
      )}

      {/* Table */}
      <div className="r-table-container">
        <table className="r-table">
          <thead>
            <tr>
              <th>#</th>
              <th className="lr__sortable" onClick={() => handleSort('title')}>Title {sortIndicator('title')}</th>
              <th className="lr__sortable" onClick={() => handleSort('decision')}>Decision {sortIndicator('decision')}</th>
              <th className="lr__sortable" onClick={() => handleSort('confidence')}>Conf. {sortIndicator('confidence')}</th>
              <th className="lr__sortable" onClick={() => handleSort('path')}>Path {sortIndicator('path')}</th>
              <th>Tags</th>
              <th className="lr__sortable" onClick={() => handleSort('meta')}>Meta {sortIndicator('meta')}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((r, i) => {
              const row = r._original_row || {};
              const screen = r.step_results?.screen || {};
              const path = r.step_results?.path || {};
              const cg = r.step_results?.cg || {};
              const esg = r.step_results?.esg || {};
              const meta = r.step_results?.meta || {};
              const isExpanded = expandedRow === i;

              return (
                <React.Fragment key={i}>
                  <tr>
                    <td>{(r._index ?? i) + 1}</td>
                    <td style={{ maxWidth: '340px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--r-text)', lineHeight: 1.4 }}>
                        {row.Title || row.title || 'Unknown'}
                      </div>
                      <div className="r-text-xs r-text-muted r-mt-1">
                        {row.Authors ? `${String(row.Authors).substring(0, 60)}... ` : ''}
                        {row.Journal || ''} {row.Year ? `\u00B7 ${row.Year}` : ''}
                        {row._source && <span className="r-chip" style={{ marginLeft: 6, padding: '1px 6px', fontSize: 10 }}>{row._source}</span>}
                      </div>
                    </td>
                    <td>
                      <span className={statusBadge(screen.status)}>{screen.status || 'N/A'}</span>
                      {screen.exclusion_code && (
                        <div className="r-text-xs r-text-muted r-mt-1">{screen.exclusion_code}</div>
                      )}
                    </td>
                    <td className="r-text-sm r-text-muted">{screen.confidence ? `${Math.round(screen.confidence * 100)}%` : '--'}</td>
                    <td>{path.path ? <span className="r-chip r-chip-sky">{path.path.replace(/_/g, ' ')}</span> : '--'}</td>
                    <td style={{ maxWidth: '200px' }}>
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
                    <td>{meta.meta_potential ? (
                      <span className={`r-badge ${meta.meta_potential === 'High' ? 'r-badge-success' : meta.meta_potential === 'Low' ? 'r-badge-danger' : 'r-badge-warning'}`}>
                        {meta.meta_potential}
                      </span>
                    ) : '--'}</td>
                    <td>
                      <button
                        className="r-btn r-btn-ghost r-btn-sm"
                        onClick={() => setExpandedRow(isExpanded ? null : i)}
                      >
                        {isExpanded ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan="8" style={{ padding: '16px 20px', background: 'var(--r-bg-alt)' }}>
                        <div className="lr__expanded">
                          <div className="lr__expanded-section">
                            <h4>Reasoning</h4>
                            <p className="r-text-sm">{screen.reasoning || 'N/A'}</p>
                          </div>
                          <div className="lr__expanded-section">
                            <h4>Abstract</h4>
                            <p className="r-text-sm">{row.Abstract || row.abstract || 'N/A'}</p>
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
            <p>Try selecting a different filter tab or search term.</p>
          </div>
        )}
      </div>
    </div>
  );
}
