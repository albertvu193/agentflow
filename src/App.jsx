import { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { PipelineView } from './components/PipelineView';
import { AgentFlowView } from './components/AgentFlowView';
import { SLRPanel } from './components/SLRPanel';
import { KristenPanel } from './components/KristenPanel';
import { LogStream } from './components/LogStream';
import { ProgressBar } from './components/ProgressBar';
import { AgentEditor } from './components/AgentEditor';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useWebSocket } from './hooks/useWebSocket';
import { useAgents, useWorkflows } from './hooks/useApi';
import './App.css';

function App() {
  const { isConnected, agentStatuses, logs, agentOutputs, workflowStatus, currentRunId, progress, resetState } = useWebSocket();
  const { agents, updateAgent, deleteAgent } = useAgents();
  const { workflows, runWorkflow, stopWorkflow } = useWorkflows();

  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);
  const [editingAgent, setEditingAgent] = useState(null);
  const [input, setInput] = useState('');

  // Auto-select first workflow
  const selectedWorkflow = workflows.find((w) => w.id === (selectedWorkflowId || workflows[0]?.id));

  const handleRun = useCallback(async () => {
    if (!selectedWorkflow) return;
    resetState();
    try {
      await runWorkflow(selectedWorkflow.id, input || 'Begin the workflow.');
    } catch (err) {
      console.error('Workflow failed:', err);
    }
  }, [selectedWorkflow, input, runWorkflow, resetState]);

  const handleStop = useCallback(() => {
    if (currentRunId) {
      stopWorkflow(currentRunId);
    }
  }, [currentRunId, stopWorkflow]);

  const handleReset = useCallback(() => {
    resetState();
  }, [resetState]);

  const handleAgentClick = useCallback((agent) => {
    setEditingAgent(agent);
  }, []);

  const handleSaveAgent = useCallback(async (agent) => {
    await updateAgent(agent.id, agent);
    setEditingAgent(null);
  }, [updateAgent]);

  const handleDeleteAgent = useCallback(async (id) => {
    await deleteAgent(id);
    setEditingAgent(null);
  }, [deleteAgent]);

  return (
    <ErrorBoundary>
    <div className="app" id="app-root">
      <Header
        workflows={workflows}
        selectedWorkflow={selectedWorkflowId || workflows[0]?.id}
        onSelectWorkflow={setSelectedWorkflowId}
        onRun={handleRun}
        onStop={handleStop}
        onReset={handleReset}
        workflowStatus={workflowStatus}
        isConnected={isConnected}
        onOpenEditor={() => setEditingAgent(agents[0] || {})}
        input={input}
        onInputChange={setInput}
      />

      <ProgressBar
        progress={progress}
        workflowStatus={workflowStatus}
        workflow={selectedWorkflow}
        agents={agents}
      />

      <div className="app__body">
        {selectedWorkflowId === 'slr-brain' || selectedWorkflow?.id === 'slr-brain' ? (
          <SLRPanel />
        ) : selectedWorkflowId === 'kristen-research-paper-insights' || selectedWorkflow?.id === 'kristen-research-paper-insights' ? (
          <KristenPanel />
        ) : selectedWorkflowId === 'ai-agent' || selectedWorkflow?.id === 'ai-agent' ? (
          <>
            <AgentFlowView
              workflow={selectedWorkflow}
              agents={agents}
              agentStatuses={agentStatuses}
              agentOutputs={agentOutputs}
            />
            <LogStream logs={logs} agents={agents} />
          </>
        ) : (
          <>
            <PipelineView
              workflow={selectedWorkflow}
              agents={agents}
              agentStatuses={agentStatuses}
              agentOutputs={agentOutputs}
              onAgentClick={handleAgentClick}
            />
            <LogStream logs={logs} agents={agents} />
          </>
        )}
      </div>

      {editingAgent && (
        <AgentEditor
          agent={editingAgent}
          onSave={handleSaveAgent}
          onClose={() => setEditingAgent(null)}
          onDelete={handleDeleteAgent}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}

export default App;
