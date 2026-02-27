import './AgentCard.css';

export function AgentCard({ agent, status, output, onClick }) {
    const statusInfo = status || { status: 'idle', action: 'Waiting...' };
    const statusClass = statusInfo.status;

    return (
        <div
            className={`agent-card agent-card--${statusClass}`}
            onClick={() => onClick?.(agent)}
            role="button"
            tabIndex={0}
            id={`agent-${agent.id}`}
        >
            <div className="agent-card__header">
                <span className="agent-card__icon">{agent.icon}</span>
                <div className="agent-card__info">
                    <h3 className="agent-card__name">{agent.name}</h3>
                    <p className="agent-card__role">{agent.role}</p>
                </div>
                <span className={`badge badge-${statusClass}`}>
                    {statusClass === 'working' && <span className="badge__dot" />}
                    {statusClass}
                </span>
            </div>

            <div className="agent-card__action">
                {statusClass === 'working' && (
                    <div className="agent-card__spinner">
                        <svg viewBox="0 0 24 24" width="14" height="14">
                            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                        </svg>
                    </div>
                )}
                <span>{statusInfo.action || 'Waiting...'}</span>
            </div>

            {output && (
                <div className="agent-card__output">
                    <p>{output.length > 150 ? output.substring(0, 150) + '...' : output}</p>
                </div>
            )}

            {statusClass === 'working' && (
                <div className="agent-card__progress">
                    <div className="agent-card__progress-bar" />
                </div>
            )}
        </div>
    );
}
