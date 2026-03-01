import { useState } from 'react';
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
            <SLRSummaryTable results={slr.results} />
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
            <div className="r-card r-card-padded">
              <div className="r-flex r-items-center r-justify-between r-mb-2">
                <div>
                  <h3>{kristen.uploadInfo?.filename || 'Research Paper'}</h3>
                  <p className="r-text-xs r-text-muted r-mt-1">
                    {kristen.uploadInfo?.pages} pages &middot; {Math.round((kristen.uploadInfo?.textLength || 0) / 1000)}k characters
                  </p>
                </div>
              </div>
              <div className="r-divider" />
              <div
                className="rl__paper-result"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(kristen.result) }}
              />
            </div>
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

/* ─── SLR Summary Table ───────────────────────────────────────────────── */
function SLRSummaryTable({ results }) {
  const exportCsv = () => {
    let csv = 'Title,Status,Confidence,Path,CG Mechanisms,ESG Outcomes,Meta Potential\n';
    results.forEach(r => {
      const row = r._original_row || {};
      const screen = r.step_results?.screen || {};
      const path = r.step_results?.path || {};
      const cg = r.step_results?.cg || {};
      const esg = r.step_results?.esg || {};
      const meta = r.step_results?.meta || {};
      const title = `"${(row.Title || row.title || '').replace(/"/g, '""')}"`;
      csv += `${title},${screen.status || ''},${Math.round((screen.confidence || 0) * 100)}%,${path.path || ''},"${(cg.cg_mechanisms || []).join('; ')}","${(esg.esg_outcomes || []).join('; ')}",${meta.meta_potential || ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'slr_library_export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="r-flex r-items-center r-justify-between r-mb-2">
        <p className="r-text-sm r-text-muted">{results.length} articles in library</p>
        <button className="r-btn r-btn-secondary r-btn-sm" onClick={exportCsv}>Export CSV</button>
      </div>
      <div className="r-table-container">
        <table className="r-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Decision</th>
              <th>Confidence</th>
              <th>Path</th>
              <th>Meta</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const row = r._original_row || {};
              const screen = r.step_results?.screen || {};
              const path = r.step_results?.path || {};
              const meta = r.step_results?.meta || {};
              const cls = screen.status === 'Include' ? 'r-badge-success' :
                          screen.status === 'Maybe' ? 'r-badge-warning' :
                          screen.status === 'Exclude' ? 'r-badge-danger' : 'r-badge-neutral';
              return (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td style={{ maxWidth: '400px', fontWeight: 500 }}>
                    {row.Title || row.title || 'Unknown'}
                    {row.Year && <span className="r-text-xs r-text-muted" style={{ marginLeft: 8 }}>{row.Year}</span>}
                  </td>
                  <td><span className={`r-badge ${cls}`}>{screen.status || 'N/A'}</span></td>
                  <td className="r-text-sm r-text-muted">{screen.confidence ? `${Math.round(screen.confidence * 100)}%` : '--'}</td>
                  <td>{path.path ? <span className="r-chip r-chip-sky">{path.path.replace(/_/g, ' ')}</span> : '--'}</td>
                  <td>{meta.meta_potential ? (
                    <span className={`r-badge ${meta.meta_potential === 'High' ? 'r-badge-success' : meta.meta_potential === 'Low' ? 'r-badge-danger' : 'r-badge-warning'}`}>
                      {meta.meta_potential}
                    </span>
                  ) : '--'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/g, '')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}
