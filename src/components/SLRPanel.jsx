import { useState, useRef } from 'react';
import './SLRPanel.css';
import { useSLR } from '../hooks/useSLR';
import { StepOutput } from './StepOutput';
import { SLRResults } from './SLRResults';

export function SLRPanel() {
    const slr = useSLR();
    const [maxArticles, setMaxArticles] = useState(3);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        if (e.target.files?.length) {
            try {
                await slr.uploadFiles(e.target.files);
            } catch (err) {
                alert(err.message);
            }
        }
    };

    const handleRun = async () => {
        try {
            await slr.startRun(maxArticles);
        } catch (err) {
            alert(err.message);
        }
    };

    if (slr.jobStatus === 'done' && slr.results.length > 0) {
        return <SLRResults results={slr.results} onReset={slr.reset} dedups={slr.dedups} />;
    }

    return (
        <div className="slr-panel fade-in">
            <div className="slr-header">
                <h2>SLR Brain — Pipeline</h2>
                <p className="text-secondary">Upload CSV/Excel from WoS or Scopus to begin the 5-step classification pipeline.</p>
            </div>

            {!slr.batchId && (
                <div
                    className="upload-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="upload-icon">📄</div>
                    <h3>Drop Excel/CSV files here</h3>
                    <p className="text-muted">or click to browse</p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        multiple
                        accept=".csv,.xlsx,.xls"
                        hidden
                    />
                </div>
            )}

            {slr.batchId && slr.jobStatus === 'idle' && (
                <div className="batch-ready-card">
                    <div className="batch-stats">
                        <div className="stat-item">
                            <span className="stat-label">Files</span>
                            <span className="stat-value">{slr.uploadStats?.files.length}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Total Articles Found</span>
                            <span className="stat-value">{slr.uploadStats?.totalRows}</span>
                        </div>
                    </div>

                    <div className="run-controls mt-2">
                        <label className="text-secondary text-sm">
                            Max Articles to Process (0 for all):
                            <input
                                type="number"
                                value={maxArticles}
                                onChange={e => setMaxArticles(Number(e.target.value))}
                                className="input-number"
                                min={0}
                            />
                        </label>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            <button className="btn btn-primary" onClick={handleRun}>Run Pipeline</button>
                            <button className="btn btn-secondary" onClick={slr.reset}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {slr.jobStatus !== 'idle' && (
                <div className="live-progress-container mt-2">
                    <div className="progress-header">
                        <h3>Processing Batch...</h3>
                        <span className="progress-text">{slr.progress} / {slr.total} completed</span>
                    </div>

                    <div className="progress-bar-bg mb-2">
                        <div className="progress-bar-fill" style={{ width: `${(slr.progress / slr.total) * 100 || 0}%` }}></div>
                    </div>

                    {slr.dedups && (
                        <div className="dedup-info mb-2 text-sm text-secondary">
                            Deduplication: Kept {slr.dedups.kept}, Removed {slr.dedups.removed} duplicates.
                        </div>
                    )}

                    <div className="live-feed">
                        {Array.from({ length: slr.total }).map((_, idx) => {
                            const feed = slr.liveFeed[idx] || {};
                            if (Object.keys(feed).length === 0) return null;

                            return (
                                <div key={idx} className="feed-item">
                                    <div className="feed-item-header">Article #{idx + 1}</div>
                                    <div className="feed-steps">
                                        {['screen', 'path', 'cg', 'esg', 'meta'].map(step => (
                                            feed[step] ? (
                                                <div key={step} className="feed-step">
                                                    <div className="feed-step-title">{step.toUpperCase()}</div>
                                                    <StepOutput stepKey={step} result={feed[step].result} />
                                                </div>
                                            ) : null
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
