import { AgentCard } from './AgentCard';
import './PipelineView.css';

export function PipelineView({ workflow, agents, agentStatuses, agentOutputs, onAgentClick }) {
    if (!workflow) {
        return (
            <div className="pipeline-view pipeline-view--empty">
                <div className="pipeline-view__placeholder">
                    <span className="pipeline-view__placeholder-icon">⚡</span>
                    <h2>Select a workflow to get started</h2>
                    <p>Choose a workflow from the dropdown above and click "Run Workflow"</p>
                </div>
            </div>
        );
    }

    const workflowAgents = workflow.steps
        .map((step) => agents.find((a) => a.id === step.agentId))
        .filter(Boolean);

    return (
        <div className="pipeline-view" id="pipeline-view">
            <div className="pipeline-view__header">
                <span className="pipeline-view__workflow-icon">{workflow.icon}</span>
                <div>
                    <h2 className="pipeline-view__workflow-name">{workflow.name}</h2>
                    <p className="pipeline-view__workflow-desc">{workflow.description}</p>
                </div>
            </div>

            <div className="pipeline-view__canvas">
                <div className="pipeline-view__chain">
                    {workflowAgents.map((agent, index) => (
                        <div key={agent.id} className="pipeline-view__node">
                            <AgentCard
                                agent={agent}
                                status={agentStatuses[agent.id]}
                                output={agentOutputs[agent.id]}
                                onClick={onAgentClick}
                            />
                            {index < workflowAgents.length - 1 && (
                                <div className="pipeline-view__connector">
                                    <svg width="60" height="40" viewBox="0 0 60 40">
                                        <defs>
                                            <linearGradient id={`grad-${index}`} x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.6" />
                                                <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity="0.6" />
                                            </linearGradient>
                                        </defs>
                                        <line
                                            x1="0" y1="20" x2="44" y2="20"
                                            stroke={`url(#grad-${index})`}
                                            strokeWidth="2"
                                            strokeDasharray="6 4"
                                            className={
                                                agentStatuses[workflowAgents[index + 1]?.id]?.status === 'working' ||
                                                    agentStatuses[agent.id]?.status === 'done'
                                                    ? 'pipeline-view__line--active'
                                                    : ''
                                            }
                                        />
                                        <polygon
                                            points="44,14 56,20 44,26"
                                            fill="var(--accent-purple)"
                                            opacity="0.6"
                                        />
                                    </svg>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="pipeline-view__step-labels">
                {workflowAgents.map((agent, index) => (
                    <div key={agent.id} className="pipeline-view__step-label">
                        <span className="pipeline-view__step-num">Step {index + 1}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
