import './Header.css';

export function Header({
    workflows,
    selectedWorkflow,
    onSelectWorkflow,
    onRun,
    onStop,
    onReset,
    workflowStatus,
    isConnected,
    onOpenEditor,
    input,
    onInputChange,
}) {
    const isRunning = workflowStatus === 'running';
    const currentWorkflow = workflows.find((w) => w.id === selectedWorkflow);

    return (
        <header className="header" id="app-header">
            <div className="header__left">
                <div className="header__logo">
                    <span className="header__logo-icon">⚡</span>
                    <h1 className="header__title">AgentFlow</h1>
                </div>
                <div className={`header__connection ${isConnected ? 'connected' : ''}`}>
                    <span className="header__connection-dot" />
                    <span>{isConnected ? 'Connected' : 'Reconnecting...'}</span>
                </div>
            </div>

            <div className="header__center">
                <div className="header__workflow-select">
                    <label htmlFor="workflow-select">Workflow</label>
                    <select
                        id="workflow-select"
                        value={selectedWorkflow || ''}
                        onChange={(e) => onSelectWorkflow(e.target.value)}
                        disabled={isRunning}
                    >
                        {workflows.map((w) => (
                            <option key={w.id} value={w.id}>
                                {w.icon} {w.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="header__input-group">
                    {selectedWorkflow === 'slr-brain' ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '0 16px' }}>
                            Use the dropzone below to upload articles.
                        </div>
                    ) : selectedWorkflow === 'kristen-research-paper-insights' ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '0 16px' }}>
                            Upload a PDF below to generate insights.
                        </div>
                    ) : (
                        <>
                            <label htmlFor="workflow-input">Input</label>
                            <input
                                id="workflow-input"
                                type="text"
                                placeholder="Enter your task or question..."
                                value={input}
                                onChange={(e) => onInputChange(e.target.value)}
                                disabled={isRunning}
                            />
                        </>
                    )}
                </div>
            </div>

            <div className="header__right">
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={onOpenEditor}
                    disabled={isRunning}
                    id="btn-edit-agents"
                >
                    ⚙️ Agents
                </button>

                {isRunning ? (
                    <button className="btn btn-danger" onClick={onStop} id="btn-stop">
                        ⏹ Stop
                    </button>
                ) : (
                    <>
                        {workflowStatus !== 'idle' && (
                            <button className="btn btn-ghost btn-sm" onClick={onReset} id="btn-reset">
                                ↺ Reset
                            </button>
                        )}
                        {selectedWorkflow !== 'slr-brain' && selectedWorkflow !== 'kristen-research-paper-insights' && (
                            <button
                                className="btn btn-primary"
                                onClick={onRun}
                                disabled={!selectedWorkflow}
                                id="btn-run"
                            >
                                ▶ Run Workflow
                            </button>
                        )}
                    </>
                )}
            </div>
        </header>
    );
}
