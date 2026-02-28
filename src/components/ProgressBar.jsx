import './ProgressBar.css';

export function ProgressBar({ progress, workflowStatus, workflow, agents }) {
    if (!workflow || workflowStatus === 'idle') return null;

    // Don't show for special panel workflows (they have their own UI)
    if (workflow.id === 'slr-brain' || workflow.id === 'kristen-research-paper-insights') return null;

    const steps = workflow.steps.map((step) => {
        const agent = agents.find((a) => a.id === step.agentId);
        return { agentId: step.agentId, name: agent?.name || 'Unknown', icon: agent?.icon || '⚙️' };
    });

    const currentStep = progress?.currentStep || 0;
    const isComplete = workflowStatus === 'completed';
    const isError = workflowStatus === 'error';

    const percent = isComplete
        ? 100
        : isError
            ? Math.round((currentStep / steps.length) * 100)
            : currentStep > 0
                ? Math.round(((currentStep - 1) / steps.length) * 100)
                : 0;

    const fillWidth = isComplete
        ? 100
        : currentStep > 0
            ? (currentStep / steps.length) * 100
            : 0;

    return (
        <div className="progress-bar">
            <div className="progress-bar__header">
                <span className="progress-bar__title">
                    {isComplete
                        ? 'Workflow Complete'
                        : isError
                            ? 'Workflow Failed'
                            : currentStep > 0
                                ? `Step ${currentStep} of ${steps.length}`
                                : 'Starting...'}
                </span>
                <span className="progress-bar__percent">
                    {percent}%
                </span>
            </div>

            <div className="progress-bar__track">
                <div
                    className={`progress-bar__fill ${isComplete ? 'progress-bar__fill--done' : isError ? 'progress-bar__fill--error' : ''}`}
                    style={{ width: `${fillWidth}%` }}
                />
            </div>

            <div className="progress-bar__steps">
                {steps.map((step, i) => {
                    const stepNum = i + 1;
                    let state = 'pending';
                    if (isComplete || stepNum < currentStep) state = 'done';
                    else if (stepNum === currentStep && !isComplete) state = 'active';
                    if (isError && stepNum === currentStep) state = 'error';

                    return (
                        <div key={`${step.agentId}-${i}`} className={`progress-step progress-step--${state}`}>
                            <div className="progress-step__indicator">
                                {state === 'done' ? (
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                ) : state === 'active' ? (
                                    <span className="progress-step__spinner" />
                                ) : state === 'error' ? (
                                    <span>!</span>
                                ) : (
                                    <span>{stepNum}</span>
                                )}
                            </div>
                            <span className="progress-step__label">{step.icon} {step.name}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
