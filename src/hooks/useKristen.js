import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = '/api';

export function useKristen() {
    const [paperId, setPaperId] = useState(null);
    const [uploadInfo, setUploadInfo] = useState(null);
    const [jobId, setJobId] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, uploaded, running, done, error
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const wsRef = useRef(null);

    const connectWs = useCallback(() => {
        if (wsRef.current) return;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:3001/ws`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.jobId !== jobId && msg.type !== 'init') return;

            if (msg.type === 'kristen:start') {
                setStatus('running');
            } else if (msg.type === 'kristen:done') {
                setStatus('done');
                setResult(msg.result);
            } else if (msg.type === 'kristen:error') {
                setStatus('error');
                setError(msg.error);
            } else if (msg.type === 'agent:status' && msg.agentId === 'paper-insights') {
                // Forward agent status for live updates
            }
        };

        ws.onclose = () => { wsRef.current = null; };
    }, [jobId]);

    useEffect(() => {
        if (jobId && status === 'running') {
            connectWs();

            // Fallback polling
            const timer = setInterval(async () => {
                try {
                    const res = await fetch(`${API_BASE}/kristen/status/${jobId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === 'done') {
                            setStatus('done');
                            setResult(data.result);
                        } else if (data.status === 'error') {
                            setStatus('error');
                            setError(data.error);
                        }
                    }
                } catch (e) { }
            }, 3000);
            return () => clearInterval(timer);
        }
    }, [jobId, status, connectWs]);

    const uploadFile = async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_BASE}/kristen/upload`, {
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        if (res.ok) {
            setPaperId(data.paperId);
            setUploadInfo(data);
            setStatus('uploaded');
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    };

    const startRun = async () => {
        if (!paperId) return;
        const res = await fetch(`${API_BASE}/kristen/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paperId }),
        });
        const data = await res.json();
        if (res.ok) {
            setJobId(data.jobId);
            setStatus('running');
            setResult(null);
            setError(null);
        } else {
            throw new Error(data.error || 'Run failed');
        }
    };

    const reset = () => {
        setPaperId(null);
        setUploadInfo(null);
        setJobId(null);
        setStatus('idle');
        setResult(null);
        setError(null);
    };

    return {
        uploadFile, startRun, reset,
        paperId, uploadInfo, jobId, status, result, error,
    };
}
