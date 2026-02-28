import { useState, useEffect, useCallback } from 'react';

const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isDev ? 'http://localhost:3001/api' : '/api';

export function useAgents() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAgents = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/agents`);
            const data = await res.json();
            setAgents(data);
        } catch (err) {
            console.error('Failed to fetch agents:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    const createAgent = async (agent) => {
        const res = await fetch(`${API_BASE}/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agent),
        });
        const newAgent = await res.json();
        setAgents((prev) => [...prev, newAgent]);
        return newAgent;
    };

    const updateAgent = async (id, updates) => {
        const res = await fetch(`${API_BASE}/agents/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        const updated = await res.json();
        setAgents((prev) => prev.map((a) => (a.id === id ? updated : a)));
        return updated;
    };

    const deleteAgent = async (id) => {
        await fetch(`${API_BASE}/agents/${id}`, { method: 'DELETE' });
        setAgents((prev) => prev.filter((a) => a.id !== id));
    };

    return { agents, loading, fetchAgents, createAgent, updateAgent, deleteAgent };
}

export function useWorkflows() {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchWorkflows = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/workflows`);
            const data = await res.json();
            setWorkflows(data);
        } catch (err) {
            console.error('Failed to fetch workflows:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWorkflows();
    }, [fetchWorkflows]);

    const runWorkflow = async (workflowId, input) => {
        const res = await fetch(`${API_BASE}/workflows/${workflowId}/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input }),
        });
        return res.json();
    };

    const stopWorkflow = async (runId) => {
        await fetch(`${API_BASE}/workflows/stop/${runId}`, { method: 'POST' });
    };

    return { workflows, loading, fetchWorkflows, runWorkflow, stopWorkflow };
}
