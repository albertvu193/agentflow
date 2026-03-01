import { useMemo } from 'react';
import './ResearchDashboard.css';

export function ResearchDashboard({
  onNavigate, kristenStatus, slrStatus, slrProgress, slrTotal,
  slrResults, kristenResult, kristenFilename,
}) {
  const hasSlrData = slrStatus === 'done' && slrResults?.length > 0;
  const hasKristenData = kristenStatus === 'done' && kristenResult;

  // Aggregate stats from SLR results
  const slrStats = useMemo(() => {
    if (!hasSlrData) return null;
    const counts = { Include: 0, Maybe: 0, Exclude: 0, Background: 0 };
    slrResults.forEach(r => {
      const s = r?.step_results?.screen?.status;
      if (s in counts) counts[s]++;
    });
    return { total: slrResults.length, ...counts };
  }, [hasSlrData, slrResults]);

  const slrStatusBadge = () => {
    if (slrStatus === 'screening' || slrStatus === 'starting') {
      return <span className="r-badge r-badge-info">{slrProgress}/{slrTotal}</span>;
    }
    if (slrStatus === 'done') return <span className="r-badge r-badge-success">Complete</span>;
    if (slrStatus === 'error') return <span className="r-badge r-badge-danger">Error</span>;
    return <span className="r-action-card__arrow">&rarr;</span>;
  };

  const kristenStatusBadge = () => {
    if (kristenStatus === 'running') return <span className="r-badge r-badge-info">Running</span>;
    if (kristenStatus === 'done') return <span className="r-badge r-badge-success">Results Ready</span>;
    if (kristenStatus === 'uploaded') return <span className="r-badge r-badge-warning">Uploaded</span>;
    if (kristenStatus === 'error') return <span className="r-badge r-badge-danger">Error</span>;
    return <span className="r-action-card__arrow">&rarr;</span>;
  };

  return (
    <div className="r-dashboard r-fade-in">
      {/* Welcome header */}
      <div className="r-dashboard__header">
        <div>
          <h1>Research Workspace</h1>
          <p className="r-text-secondary r-mt-1">
            Analyze papers, run systematic reviews, and manage your research findings.
          </p>
        </div>
      </div>

      {/* Aggregate stats (shown when data exists) */}
      {(hasSlrData || hasKristenData) && (
        <div className="r-stat-grid r-mt-2">
          <div className="r-stat-card">
            <div className="r-stat-card__label">SLR Articles</div>
            <div className="r-stat-card__value accent">{slrStats?.total || 0}</div>
            <div className="r-stat-card__sub">{hasSlrData ? 'Classified' : '--'}</div>
          </div>
          {hasSlrData && (
            <>
              <div className="r-stat-card">
                <div className="r-stat-card__label">Include</div>
                <div className="r-stat-card__value success">{slrStats.Include}</div>
              </div>
              <div className="r-stat-card">
                <div className="r-stat-card__label">Maybe</div>
                <div className="r-stat-card__value warning">{slrStats.Maybe}</div>
              </div>
              <div className="r-stat-card">
                <div className="r-stat-card__label">Exclude</div>
                <div className="r-stat-card__value danger">{slrStats.Exclude}</div>
              </div>
            </>
          )}
          {hasKristenData && (
            <div className="r-stat-card">
              <div className="r-stat-card__label">Paper Analyzed</div>
              <div className="r-stat-card__value accent">1</div>
              <div className="r-stat-card__sub">{kristenFilename || 'PDF'}</div>
            </div>
          )}
        </div>
      )}

      {/* Active progress */}
      {(slrStatus === 'screening' || slrStatus === 'starting') && (
        <div className="r-card r-card-padded r-mt-2 r-slide-up">
          <div className="r-flex r-items-center r-gap-1 r-mb-1">
            <div className="r-pulse-dot" />
            <span style={{ fontWeight: 600 }}>SLR Pipeline Running</span>
            <span className="r-text-sm r-text-muted" style={{ marginLeft: 'auto' }}>{slrProgress} / {slrTotal}</span>
          </div>
          <div className="r-progress-track">
            <div className="r-progress-fill" style={{ width: `${(slrProgress / slrTotal) * 100 || 0}%` }} />
          </div>
        </div>
      )}

      {kristenStatus === 'running' && (
        <div className="r-card r-card-padded r-mt-2 r-slide-up">
          <div className="r-flex r-items-center r-gap-1">
            <div className="r-pulse-dot" />
            <span style={{ fontWeight: 600 }}>Paper Analysis in Progress</span>
          </div>
        </div>
      )}

      {/* Quick action cards */}
      <div className="r-dashboard__actions r-mt-3">
        <button className="r-action-card" onClick={() => onNavigate('papers')}>
          <div className="r-action-card__icon r-action-card__icon--indigo">P</div>
          <div className="r-action-card__content">
            <h3>Paper Analysis</h3>
            <p>Upload a PDF and get structured insights — research questions, hypotheses, methodology, and key findings extracted by AI.</p>
          </div>
          <div className="r-action-card__status">
            {kristenStatusBadge()}
          </div>
        </button>

        <button className="r-action-card" onClick={() => onNavigate('slr')}>
          <div className="r-action-card__icon r-action-card__icon--emerald">L</div>
          <div className="r-action-card__content">
            <h3>Literature Review</h3>
            <p>Upload bibliographic data from Web of Science or Scopus to run the 5-step SLR classification pipeline with AI screening.</p>
          </div>
          <div className="r-action-card__status">
            {slrStatusBadge()}
          </div>
        </button>

        <button className="r-action-card" onClick={() => onNavigate('library')}>
          <div className="r-action-card__icon r-action-card__icon--amber">R</div>
          <div className="r-action-card__content">
            <h3>Research Library</h3>
            <p>Browse and export your completed analyses. View SLR classification results with filtering, sorting, and CSV export.</p>
          </div>
          <div className="r-action-card__status">
            {hasSlrData || hasKristenData ? (
              <span className="r-badge r-badge-neutral">{(slrStats?.total || 0) + (hasKristenData ? 1 : 0)} items</span>
            ) : (
              <span className="r-action-card__arrow">&rarr;</span>
            )}
          </div>
        </button>
      </div>

      {/* Pipeline overview */}
      <div className="r-dashboard__pipeline r-mt-3">
        <h2>SLR Pipeline Stages</h2>
        <p className="r-text-secondary r-text-sm r-mt-1 r-mb-2">
          Each article passes through five AI classification stages for systematic literature review.
        </p>
        <div className="r-pipeline-steps">
          <div className="r-pipeline-step">
            <div className="r-pipeline-step__number">1</div>
            <div className="r-pipeline-step__info">
              <h4>Screening</h4>
              <p>Include / Maybe / Exclude / Background triage with confidence scores and reasoning.</p>
            </div>
          </div>
          <div className="r-pipeline-step__connector" />
          <div className="r-pipeline-step">
            <div className="r-pipeline-step__number">2</div>
            <div className="r-pipeline-step__info">
              <h4>Path Classification</h4>
              <p>Identifies the causal pathway and relationship types in the research.</p>
            </div>
          </div>
          <div className="r-pipeline-step__connector" />
          <div className="r-pipeline-step">
            <div className="r-pipeline-step__number">3</div>
            <div className="r-pipeline-step__info">
              <h4>CG Tagging</h4>
              <p>Tags corporate governance mechanisms — board structure, ownership, executive compensation.</p>
            </div>
          </div>
          <div className="r-pipeline-step__connector" />
          <div className="r-pipeline-step">
            <div className="r-pipeline-step__number">4</div>
            <div className="r-pipeline-step__info">
              <h4>ESG Tagging</h4>
              <p>Tags environmental, social, and governance outcome variables.</p>
            </div>
          </div>
          <div className="r-pipeline-step__connector" />
          <div className="r-pipeline-step">
            <div className="r-pipeline-step__number">5</div>
            <div className="r-pipeline-step__info">
              <h4>Meta-Analysis Scoring</h4>
              <p>Evaluates suitability for meta-analysis based on study design and estimation methods.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
