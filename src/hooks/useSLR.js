import { useState, useEffect, useCallback, useRef } from 'react';

const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isDev ? 'http://localhost:3001/api' : '/api';

export function useSLR() {
    const [batchId, setBatchId] = useState(null);
    const [uploadStats, setUploadStats] = useState(null);
    const [jobId, setJobId] = useState(null);
    const [jobStatus, setJobStatus] = useState('idle'); // idle, starting, screening, done, error
    const [progress, setProgress] = useState(0);
    const [total, setTotal] = useState(0);
    const [results, setResults] = useState([]);
    const [dedups, setDedups] = useState(null);
    const [error, setError] = useState(null);
    const [articleTitles, setArticleTitles] = useState([]);

    // Live feed from websocket
    const [liveFeed, setLiveFeed] = useState({});

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

            if (msg.type === 'slr:start') {
                setJobStatus('screening');
                setTotal(msg.total);
                setDedups(msg.dedup);
                if (msg.articleTitles) setArticleTitles(msg.articleTitles);
            } else if (msg.type === 'slr:progress') {
                setProgress(msg.progress);
            } else if (msg.type === 'slr:item_step') {
                setLiveFeed(prev => ({
                    ...prev,
                    [msg.index]: {
                        ...(prev[msg.index] || {}),
                        [msg.step]: { status: msg.status, result: msg.result }
                    }
                }));
            } else if (msg.type === 'slr:done') {
                setJobStatus('done');
                setResults(msg.results || []);
            } else if (msg.type === 'slr:error') {
                setJobStatus('error');
                setError(msg.error || 'Pipeline failed');
            }
        };

        ws.onclose = () => { wsRef.current = null; };
    }, [jobId]);

    useEffect(() => {
        if (jobId && jobStatus !== 'done' && jobStatus !== 'error') {
            connectWs();

            // Fallback polling just in case WS drops
            const timer = setInterval(async () => {
                try {
                    const res = await fetch(`${API_BASE}/slr/status/${jobId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === 'error') {
                            setJobStatus('error');
                            setError(data.error || 'Pipeline failed');
                        } else {
                            setJobStatus(data.status);
                            setProgress(data.progress);
                            setTotal(data.total);
                            if (data.results) setResults(data.results);
                        }
                    }
                } catch (e) { }
            }, 3000);
            return () => clearInterval(timer);
        }
    }, [jobId, jobStatus, connectWs]);

    const uploadFiles = async (files) => {
        const formData = new FormData();
        Array.from(files).forEach(f => formData.append('files', f));

        const res = await fetch(`${API_BASE}/slr/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (res.ok) {
            setBatchId(data.batchId);
            setUploadStats(data);
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    };

    const startRun = async (maxArticles, model) => {
        if (!batchId) return;
        setError(null);
        const body = { batchId, maxArticles };
        if (model) body.model = model;
        const res = await fetch(`${API_BASE}/slr/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            setJobId(data.jobId);
            setJobStatus('starting');
            setLiveFeed({});
            setResults([]);
            setProgress(0);
            setArticleTitles([]);
        } else {
            throw new Error(data.error || 'Run failed');
        }
    };

    const reset = () => {
        setBatchId(null);
        setUploadStats(null);
        setJobId(null);
        setJobStatus('idle');
        setProgress(0);
        setTotal(0);
        setResults([]);
        setDedups(null);
        setLiveFeed({});
        setError(null);
        setArticleTitles([]);
    };

    return {
        uploadFiles, startRun, reset,
        batchId, uploadStats, jobId, jobStatus, progress, total, results, dedups, liveFeed, error, articleTitles
    };
}
