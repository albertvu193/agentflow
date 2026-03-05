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
        const findingClass = result.main_finding_direction === 'Positive' ? 'chip-green' :
                             result.main_finding_direction === 'Negative' ? 'chip-red' :
                             result.main_finding_direction === 'Mixed' ? 'chip-orange' :
                             result.main_finding_direction === 'Insignificant' ? 'chip-neutral' : 'chip-outline';
        return (
            <div className="step-output meta-output">
                <div className="so-header">
                    <span className={`badge ${pClass}`}>Meta: {result.meta_potential}</span>
                    {result.main_finding_direction && (
                        <span className={`chip ${findingClass}`}>{result.main_finding_direction}</span>
                    )}
                    <span className="confidence-score">{(result.confidence * 100).toFixed(0)}% Conf</span>
                </div>
                {result.meta_path_fit && (
                    <div className="tags-container mb-1">
                        <span className="chip chip-blue">{result.meta_path_fit.replace(/_/g, ' ')}</span>
                    </div>
                )}
                <div className="tags-container mb-1">
                    {result.study_design && <span className="chip chip-neutral">{result.study_design}</span>}
                    {(result.estimation_methods || []).map(t => <span key={t} className="chip chip-neutral">{t}</span>)}
                    {result.endogeneity_addressed && result.endogeneity_addressed !== 'Not_Clear' && (
                        <span className={`chip ${result.endogeneity_addressed === 'Yes' ? 'chip-green' : result.endogeneity_addressed === 'Partial' ? 'chip-orange' : 'chip-outline'}`}>
                            Endo: {result.endogeneity_addressed}
                        </span>
                    )}
                </div>
                {((result.theories_used || []).length > 0) && (
                    <div className="tags-container mb-1">
                        {result.theories_used.map(t => <span key={t} className="chip chip-outline">{t.replace(/_/g, ' ')}</span>)}
                    </div>
                )}
                <div className="meta-context mb-1">
                    {result.country_region && <span className="chip chip-outline">{result.country_name || result.country_region}</span>}
                    {result.market_type && result.market_type !== 'Not_Clear' && <span className="chip chip-outline">{result.market_type}</span>}
                    {result.industry_type && result.industry_type !== 'Not_Clear' && <span className="chip chip-outline">{result.industry_type.replace(/_/g, ' ')}</span>}
                </div>
                {result.main_finding_note && (
                    <div className="reasoning">"{result.main_finding_note}"</div>
                )}
                {result.reasoning && result.reasoning !== result.main_finding_note && (
                    <div className="sub-detail">{result.reasoning}</div>
                )}
            </div>
        );
    }

    return <pre className="step-output-raw">{JSON.stringify(result, null, 2)}</pre>;
}
