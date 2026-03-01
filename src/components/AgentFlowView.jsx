import { useState } from 'react';
import './AgentFlowView.css';

const NODE_COLORS = {
    'ai-agent-planner': { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.3)' },
    'ai-agent-researcher': { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' },
    'ai-agent-reasoner': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
    'ai-agent-executor': { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.3)' },
    'ai-agent-reviewer': { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
};

function getNodeStyle(agentId) {
    return NODE_COLORS[agentId] || { color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.3)' };
}

function ThinkingIndicator() {
    return (
        <div className="af-thinking">
            <div className="af-thinking__dots">
                <span className="af-thinking__dot" />
                <span className="af-thinking__dot" />
                <span className="af-thinking__dot" />
            </div>
            <span className="af-thinking__text">Processing...</span>
        </div>
    );
}

function NodeOutput({ output, isExpanded, onToggle }) {
    if (!output) return null;

    const lines = output.split('\n');
    const preview = lines.slice(0, 4).join('\n');
    const hasMore = lines.length > 4;
    const displayText = isExpanded ? output : preview;

    return (
        <div className="af-node-output">
            <div className="af-node-output__content">
                {displayText.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) {
                        return <div key={i} className="af-node-output__h2">{line.replace('## ', '')}</div>;
                    }
                    if (line.startsWith('### ')) {
                        return <div key={i} className="af-node-output__h3">{line.replace('### ', '')}</div>;
                    }
                    if (line.startsWith('- **')) {
                        const match = line.match(/^- \*\*(.+?)\*\*:?\s*(.*)$/);
                        if (match) {
                            return (
                                <div key={i} className="af-node-output__kv">
                                    <span className="af-node-output__key">{match[1]}</span>
                                    {match[2] && <span className="af-node-output__val">{match[2]}</span>}
                                </div>
                            );
                        }
                    }
                    if (line.startsWith('- ')) {
                        return <div key={i} className="af-node-output__li">{line.replace('- ', '')}</div>;
                    }
                    if (line.match(/^\d+\.\s\*\*/)) {
                        const match = line.match(/^\d+\.\s\*\*(.+?)\*\*\s*[—-]?\s*(.*)$/);
                        if (match) {
                            return (
                                <div key={i} className="af-node-output__step">
                                    <span className="af-node-output__step-name">{match[1]}</span>
                                    {match[2] && <span className="af-node-output__step-desc">{match[2]}</span>}
                                </div>
                            );
                        }
                    }
                    if (line.trim() === '') return <div key={i} className="af-node-output__spacer" />;
                    return <div key={i} className="af-node-output__text">{line}</div>;
                })}
            </div>
            {hasMore && (
                <button className="af-node-output__toggle" onClick={onToggle}>
                    {isExpanded ? 'Show less' : `Show more (${lines.length - 4} more lines)`}
                </button>
            )}
        </div>
    );
}

function ValidationBadge({ validation }) {
    if (!validation) return null;

    if (validation.valid) {
        return (
            <div className="af-validation af-validation--pass">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Validated
            </div>
        );
    }

    return (
        <div className="af-validation af-validation--warn">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 3V7M6 9V9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Missing: {validation.missing.join(', ')}
        </div>
    );
}

export function AgentFlowView({ workflow, agents, agentStatuses, agentOutputs, validations = {} }) {
    const [expandedNodes, setExpandedNodes] = useState({});

    if (!workflow) return null;

    const workflowAgents = workflow.steps
        .map((step) => agents.find((a) => a.id === step.agentId))
        .filter(Boolean);

    // Detect context from first agent's output for the header badge
    const detectedContexts = [];
    const firstOutput = agentOutputs[workflowAgents[0]?.id];
    if (firstOutput && firstOutput.includes('[CONTEXT OVERLAY]')) {
        // Context was injected — parse from logs instead
    }

    const toggleExpanded = (agentId) => {
        setExpandedNodes((prev) => ({ ...prev, [agentId]: !prev[agentId] }));
    };

    // Find the currently active node
    const activeIdx = workflowAgents.findIndex(
        (a) => agentStatuses[a.id]?.status === 'working'
    );

    return (
        <div className="af-view">
            <div className="af-view__header">
                <div className="af-view__title-row">
                    <span className="af-view__icon">{workflow.icon}</span>
                    <div>
                        <h2 className="af-view__title">{workflow.name}</h2>
                        <p className="af-view__desc">{workflow.description}</p>
                    </div>
                </div>
            </div>

            <div className="af-view__flow">
                {workflowAgents.map((agent, index) => {
                    const status = agentStatuses[agent.id]?.status || 'idle';
                    const output = agentOutputs[agent.id];
                    const nodeStyle = getNodeStyle(agent.id);
                    const isActive = status === 'working';
                    const isDone = status === 'done';
                    const isError = status === 'error';
                    const isExpanded = expandedNodes[agent.id];

                    return (
                        <div key={agent.id} className="af-node-wrapper">
                            {/* Connector line */}
                            {index > 0 && (
                                <div className={`af-connector ${isDone || isActive ? 'af-connector--active' : ''}`}>
                                    <div className="af-connector__line" style={{
                                        background: isDone || isActive ? nodeStyle.color : undefined
                                    }} />
                                    <div className="af-connector__arrow" style={{
                                        borderTopColor: isDone || isActive ? nodeStyle.color : undefined
                                    }} />
                                </div>
                            )}

                            {/* Node */}
                            <div
                                className={`af-node af-node--${status}`}
                                style={{
                                    '--node-color': nodeStyle.color,
                                    '--node-bg': nodeStyle.bg,
                                    '--node-border': nodeStyle.border,
                                }}
                            >
                                {/* Node header */}
                                <div className="af-node__header">
                                    <div className="af-node__step-badge" style={{ background: nodeStyle.color }}>
                                        {isDone ? (
                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                <path d="M3 7L6 10L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        ) : isError ? (
                                            <span>!</span>
                                        ) : (
                                            <span>{index + 1}</span>
                                        )}
                                    </div>
                                    <div className="af-node__info">
                                        <div className="af-node__name-row">
                                            <span className="af-node__icon">{agent.icon}</span>
                                            <h3 className="af-node__name">{agent.name}</h3>
                                        </div>
                                        <p className="af-node__role">{agent.role}</p>
                                    </div>
                                    <div className="af-node__status">
                                        {isActive && (
                                            <div className="af-node__status-badge af-node__status-badge--working">
                                                <span className="af-node__status-dot" />
                                                Working
                                            </div>
                                        )}
                                        {isDone && (
                                            <div className="af-node__status-badge af-node__status-badge--done">
                                                Complete
                                            </div>
                                        )}
                                        {isError && (
                                            <div className="af-node__status-badge af-node__status-badge--error">
                                                Failed
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Active thinking indicator */}
                                {isActive && !output && <ThinkingIndicator />}

                                {/* Intermediate output */}
                                {output && (
                                    <NodeOutput
                                        output={output}
                                        isExpanded={isExpanded}
                                        onToggle={() => toggleExpanded(agent.id)}
                                    />
                                )}

                                {/* Validation hook result */}
                                {isDone && validations[agent.id] && (
                                    <div className="af-node__validation-row">
                                        <ValidationBadge validation={validations[agent.id]} />
                                    </div>
                                )}

                                {/* Progress bar for active node */}
                                {isActive && (
                                    <div className="af-node__progress">
                                        <div className="af-node__progress-bar" style={{ background: nodeStyle.color }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
