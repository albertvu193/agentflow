import { useEffect, useRef } from 'react';
import './LogStream.css';

const AGENT_COLORS = {
    'topic-analyzer': '#3b82f6',
    'article-searcher': '#8b5cf6',
    'relevance-filter': '#f59e0b',
    'summary-writer': '#10b981',
    'code-analyzer': '#3b82f6',
    'bug-detector': '#ef4444',
    'improvement-suggester': '#f59e0b',
    'report-generator': '#10b981',
};

function getAgentColor(agentId) {
    return AGENT_COLORS[agentId] || '#64748b';
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function LogStream({ logs, agents }) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs]);

    const getAgentName = (agentId) => {
        const agent = agents.find((a) => a.id === agentId);
        return agent ? agent.name : agentId;
    };

    return (
        <div className="log-stream" id="log-stream">
            <div className="log-stream__header">
                <span className="log-stream__title">📡 Live Log Stream</span>
                <span className="log-stream__count">{logs.length} entries</span>
            </div>
            <div className="log-stream__body" ref={containerRef}>
                {logs.length === 0 ? (
                    <div className="log-stream__empty">
                        <p>Waiting for workflow to start...</p>
                        <p className="log-stream__hint">Logs will appear here in real-time</p>
                    </div>
                ) : (
                    logs.map((log, index) => (
                        <div
                            key={index}
                            className={`log-stream__entry log-stream__entry--${log.level}`}
                            style={{ animation: `slide-in-right 0.2s ease ${index * 0.02}s both` }}
                        >
                            <span className="log-stream__time">{formatTime(log.timestamp)}</span>
                            <span
                                className="log-stream__agent"
                                style={{ color: getAgentColor(log.agentId) }}
                            >
                                [{getAgentName(log.agentId)}]
                            </span>
                            <span className="log-stream__message">{log.message}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
