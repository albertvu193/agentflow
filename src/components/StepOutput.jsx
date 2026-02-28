import './StepOutput.css';

export function StepOutput({ stepKey, result }) {
    if (!result) return <div className="step-output text-muted">Waiting...</div>;
    if (result.error) return <div className="step-output text-error">Error: {result.error}</div>;
    if (result.skipped) return <div className="step-output text-muted"><i>Skipped: {result.reason}</i></div>;

    if (stepKey === 'screen') {
        const statusClass = result.status === 'Include' ? 'badge-success' : result.status === 'Exclude' ? 'badge-error' : 'badge-warning';
        return (
            <div className="step-output screen-output">
                <div className="so-header">
                    <span className={`badge ${statusClass}`}>{result.status}</span>
                    {result.exclusion_code && <span className="badge badge-neutral">{result.exclusion_code}</span>}
                    <span className="confidence-score">{(result.confidence * 100).toFixed(0)}% Conf</span>
                </div>
                <div className="reasoning">"{result.reasoning}"</div>
            </div>
        );
    }

    if (stepKey === 'path') {
        return (
            <div className="step-output path-output">
                <div className="so-header">
                    <span className="badge badge-primary">{result.path}</span>
                    <span className="confidence-score">{(result.confidence * 100).toFixed(0)}% Conf</span>
                </div>
                <div className="tags-container">
                    {(result.relation_types || []).map(t => <span key={t} className="chip chip-blue">{t}</span>)}
                </div>
                {result.firm_perf_included === 'Yes' && <div className="sub-detail">Includes Firm Performance</div>}
            </div>
        );
    }

    if (stepKey === 'cg') {
        return (
            <div className="step-output tags-output">
                <div className="so-header">
                    <strong>CG Mechanisms</strong>
                    <span className="confidence-score">{(result.confidence * 100).toFixed(0)}% Conf</span>
                </div>
                <div className="tags-container">
                    {(result.cg_mechanisms || []).map(t => <span key={t} className="chip chip-purple">{t}</span>)}
                </div>
                <div className="tags-container mt-1">
                    {(result.cg_mechanism_details || []).map(t => <span key={t} className="chip chip-outline">{t}</span>)}
                </div>
            </div>
        );
    }

    if (stepKey === 'esg') {
        return (
            <div className="step-output tags-output">
                <div className="so-header">
                    <strong>ESG Outcomes</strong>
                    <span className="confidence-score">{(result.confidence * 100).toFixed(0)}% Conf</span>
                </div>
                <div className="tags-container">
                    {(result.esg_outcomes || []).map(t => <span key={t} className="chip chip-green">{t}</span>)}
                </div>
                <div className="tags-container mt-1">
                    {(result.esg_measure_types || []).map(t => <span key={t} className="chip chip-outline">{t}</span>)}
                </div>
            </div>
        );
    }

    if (stepKey === 'meta') {
        const pClass = result.meta_potential === 'High' ? 'badge-success' : result.meta_potential === 'Low' ? 'badge-error' : 'badge-warning';
        return (
            <div className="step-output meta-output">
                <div className="so-header">
                    <span className={`badge ${pClass}`}>Meta: {result.meta_potential}</span>
                    <span className="confidence-score">{(result.confidence * 100).toFixed(0)}% Conf</span>
                </div>
                <div className="tags-container mb-1">
                    <span className="chip chip-neutral">{result.study_design}</span>
                    {(result.estimation_methods || []).map(t => <span key={t} className="chip chip-neutral">{t}</span>)}
                </div>
                <div className="reasoning">"{result.main_finding_note}"</div>
            </div>
        );
    }

    return <pre className="step-output-raw">{JSON.stringify(result, null, 2)}</pre>;
}
