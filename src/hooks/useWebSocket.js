import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const [agentStatuses, setAgentStatuses] = useState({});
    const [logs, setLogs] = useState([]);
    const [agentOutputs, setAgentOutputs] = useState({});
    const [workflowStatus, setWorkflowStatus] = useState('idle'); // idle, running, completed, error
    const [currentRunId, setCurrentRunId] = useState(null);
    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);

    const connect = useCallback(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:3001/ws`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsConnected(true);
            console.log('WebSocket connected');
        };

        ws.onclose = () => {
            setIsConnected(false);
            // Reconnect after 2 seconds
            reconnectTimer.current = setTimeout(connect, 2000);
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case 'init':
                    // Initial state from server
                    break;

                case 'agent:status':
                    setAgentStatuses((prev) => ({
                        ...prev,
                        [message.agentId]: {
                            status: message.status,
                            action: message.action,
                            timestamp: message.timestamp,
                        },
                    }));
                    break;

                case 'agent:output':
                    setAgentOutputs((prev) => ({
                        ...prev,
                        [message.agentId]: message.output,
                    }));
                    break;

                case 'agent:log':
                    setLogs((prev) => [
                        ...prev.slice(-200), // Keep last 200 logs
                        {
                            agentId: message.agentId,
                            message: message.message,
                            level: message.level,
                            timestamp: message.timestamp,
                        },
                    ]);
                    break;

                case 'workflow:start':
                    setWorkflowStatus('running');
                    setCurrentRunId(message.runId);
                    break;

                case 'workflow:complete':
                    setWorkflowStatus('completed');
                    break;

                case 'workflow:error':
                    setWorkflowStatus('error');
                    break;

                case 'workflow:stopped':
                    setWorkflowStatus('idle');
                    break;
            }
        };
    }, []);

    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) wsRef.current.close();
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        };
    }, [connect]);

    const resetState = useCallback(() => {
        setAgentStatuses({});
        setLogs([]);
        setAgentOutputs({});
        setWorkflowStatus('idle');
        setCurrentRunId(null);
    }, []);

    return {
        isConnected,
        agentStatuses,
        logs,
        agentOutputs,
        workflowStatus,
        currentRunId,
        resetState,
    };
}
