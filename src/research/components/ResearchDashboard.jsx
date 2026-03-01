import './ResearchDashboard.css';

export function ResearchDashboard({ onNavigate, kristenStatus, slrStatus, slrProgress, slrTotal }) {
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

      {/* Quick action cards */}
      <div className="r-dashboard__actions r-mt-3">
        <button className="r-action-card" onClick={() => onNavigate('papers')}>
          <div className="r-action-card__icon r-action-card__icon--indigo">P</div>
          <div className="r-action-card__content">
            <h3>Paper Analysis</h3>
            <p>Upload a PDF and get structured insights — research questions, hypotheses, methodology, and key findings extracted by AI.</p>
          </div>
          <div className="r-action-card__status">
            {kristenStatus === 'running' ? (
              <span className="r-badge r-badge-info">Running</span>
            ) : kristenStatus === 'done' ? (
              <span className="r-badge r-badge-success">Results Ready</span>
            ) : (
              <span className="r-action-card__arrow">&rarr;</span>
            )}
          </div>
        </button>

        <button className="r-action-card" onClick={() => onNavigate('slr')}>
          <div className="r-action-card__icon r-action-card__icon--emerald">L</div>
          <div className="r-action-card__content">
            <h3>Literature Review</h3>
            <p>Upload bibliographic data from Web of Science or Scopus to run the 5-step SLR classification pipeline with AI screening.</p>
          </div>
          <div className="r-action-card__status">
            {slrStatus === 'screening' ? (
              <span className="r-badge r-badge-info">{slrProgress}/{slrTotal}</span>
            ) : slrStatus === 'done' ? (
              <span className="r-badge r-badge-success">Complete</span>
            ) : (
              <span className="r-action-card__arrow">&rarr;</span>
            )}
          </div>
        </button>

        <button className="r-action-card" onClick={() => onNavigate('library')}>
          <div className="r-action-card__icon r-action-card__icon--amber">R</div>
          <div className="r-action-card__content">
            <h3>Research Library</h3>
            <p>Browse and export your completed analyses. View SLR classification results with filtering, sorting, and CSV export.</p>
          </div>
          <div className="r-action-card__status">
            <span className="r-action-card__arrow">&rarr;</span>
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
