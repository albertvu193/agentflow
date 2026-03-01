import { useState, useEffect, useCallback, useRef } from 'react';

const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isDev ? 'http://localhost:3001/api' : '/api';

export function useKristen() {
    const [paperId, setPaperId] = useState(null);
    const [uploadInfo, setUploadInfo] = useState(null);
    const [jobId, setJobId] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, uploaded, running, done, error
    const [result, setResult] = useState(null);
    const [streamedText, setStreamedText] = useState('');
    const [error, setError] = useState(null);

    const wsRef = useRef(null);
    const jobIdRef = useRef(null);
    const reconnectTimer = useRef(null);

    // Keep jobIdRef in sync so the WS callback can always read the latest
    useEffect(() => { jobIdRef.current = jobId; }, [jobId]);

    // Connect WebSocket eagerly on mount so it's ready before any run
    useEffect(() => {
        function connect() {
            if (wsRef.current && wsRef.current.readyState <= 1) return;
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const wsHost = isDev ? 'localhost:3001' : window.location.host;
            const wsUrl = `${protocol}//${wsHost}/ws`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.type === 'init') return;
                if (msg.jobId !== jobIdRef.current) return;

                if (msg.type === 'kristen:start') {
                    setStatus('running');
                    setStreamedText('');
                } else if (msg.type === 'kristen:chunk') {
                    setStreamedText(msg.accumulated);
                } else if (msg.type === 'kristen:done') {
                    setStatus('done');
                    setResult(msg.result);
                    setStreamedText('');
                } else if (msg.type === 'kristen:error') {
                    setStatus('error');
                    setError(msg.error);
                }
            };

            ws.onclose = () => {
                wsRef.current = null;
                reconnectTimer.current = setTimeout(connect, 2000);
            };
        }

        connect();
        return () => {
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    // Fallback polling in case WS misses something
    useEffect(() => {
        if (jobId && status === 'running') {
            const timer = setInterval(async () => {
                try {
                    const res = await fetch(`${API_BASE}/kristen/status/${jobId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === 'done') {
                            setStatus('done');
                            setResult(data.result);
                            setStreamedText('');
                        } else if (data.status === 'error') {
                            setStatus('error');
                            setError(data.error);
                        }
                    }
                } catch (e) { }
            }, 5000);
            return () => clearInterval(timer);
        }
    }, [jobId, status]);

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

    const startRun = async (model) => {
        if (!paperId) return;
        setStreamedText('');
        setResult(null);
        setError(null);

        const body = { paperId };
        if (model) body.model = model;
        const res = await fetch(`${API_BASE}/kristen/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok) {
            setJobId(data.jobId);
            setStatus('running');
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
        setStreamedText('');
        setError(null);
    };

    return {
        uploadFile, startRun, reset,
        paperId, uploadInfo, jobId, status, result, streamedText, error,
    };
}
