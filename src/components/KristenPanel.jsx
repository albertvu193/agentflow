import { useState, useRef, useEffect } from 'react';
import './KristenPanel.css';
import { useKristen } from '../hooks/useKristen';

export function KristenPanel() {
    const kristen = useKristen();
    const fileInputRef = useRef(null);
    const streamEndRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    // Auto-scroll to bottom as new content streams in
    useEffect(() => {
        if (kristen.streamedText && streamEndRef.current) {
            streamEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [kristen.streamedText]);

    const handleFile = async (file) => {
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            alert('Please upload a PDF file.');
            return;
        }
        try {
            await kristen.uploadFile(file);
        } catch (err) {
            alert(err.message);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files?.[0]) handleFile(e.target.files[0]);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    };

    const handleRun = async () => {
        try {
            await kristen.startRun();
        } catch (err) {
            alert(err.message);
        }
    };

    // Done state — show the final overview
    if (kristen.status === 'done' && kristen.result) {
        return (
            <div className="kristen-panel fade-in">
                <div className="kristen-header">
                    <h2>Paper Insights</h2>
                    <p className="text-secondary">{kristen.uploadInfo?.filename}</p>
                </div>
                <div className="kristen-result-card">
                    <div className="kristen-result-content" dangerouslySetInnerHTML={{ __html: formatMarkdown(kristen.result) }} />
                </div>
                <div className="kristen-actions">
                    <button className="btn btn-secondary" onClick={kristen.reset}>Analyze Another Paper</button>
                </div>
            </div>
        );
    }

    return (
        <div className="kristen-panel fade-in">
            <div className="kristen-header">
                <h2>Kristen — Research Paper Insights</h2>
                <p className="text-secondary">Upload a research paper PDF to get a high-level overview powered by Claude.</p>
            </div>

            {/* Upload dropzone */}
            {kristen.status === 'idle' && (
                <div
                    className={`upload-dropzone ${dragOver ? 'upload-dropzone--active' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                >
                    <div className="upload-icon">📑</div>
                    <h3>Drop a PDF here</h3>
                    <p className="text-muted">or click to browse</p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf"
                        hidden
                    />
                </div>
            )}

            {/* File uploaded — show stats and run button */}
            {kristen.status === 'uploaded' && kristen.uploadInfo && (
                <div className="kristen-uploaded-card">
                    <div className="kristen-file-info">
                        <span className="kristen-file-icon">📄</span>
                        <div>
                            <div className="kristen-filename">{kristen.uploadInfo.filename}</div>
                            <div className="kristen-file-meta">
                                {kristen.uploadInfo.pages} pages · {Math.round(kristen.uploadInfo.textLength / 1000)}k characters extracted
                            </div>
                        </div>
                    </div>
                    <div className="kristen-preview">
                        <div className="kristen-preview-label">Text Preview</div>
                        <div className="kristen-preview-text">{kristen.uploadInfo.preview}...</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button className="btn btn-primary" onClick={handleRun}>Generate Insights</button>
                        <button className="btn btn-secondary" onClick={kristen.reset}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Running state — show live streaming progress */}
            {kristen.status === 'running' && (
                <div className="kristen-streaming-container">
                    {/* Progress header */}
                    <div className="kristen-stream-header">
                        <div className="kristen-stream-status">
                            <div className="kristen-pulse" />
                            <span>Claude is reading the paper...</span>
                        </div>
                        <div className="kristen-stream-filename">{kristen.uploadInfo?.filename}</div>
                    </div>

                    {/* Section progress bar */}
                    {kristen.streamedText && (
                        <KristenProgressBar streamedText={kristen.streamedText} />
                    )}

                    {/* Live sections */}
                    {kristen.streamedText ? (
                        <div className="kristen-stream-body">
                            {parseSections(kristen.streamedText).map((section, i, arr) => (
                                <div
                                    key={i}
                                    className={`kristen-stream-section ${i === arr.length - 1 ? 'kristen-stream-section--active' : 'kristen-stream-section--done'}`}
                                >
                                    {section.title && (
                                        <div className="kristen-section-header">
                                            <span className={`kristen-section-check ${i < arr.length - 1 ? 'done' : 'active'}`}>
                                                {i < arr.length - 1 ? '✓' : '●'}
                                            </span>
                                            <h3>{section.title}</h3>
                                        </div>
                                    )}
                                    <div
                                        className="kristen-section-body"
                                        dangerouslySetInnerHTML={{ __html: formatMarkdown(section.content) }}
                                    />
                                </div>
                            ))}
                            <div ref={streamEndRef} />
                            <div className="kristen-stream-cursor" />
                        </div>
                    ) : (
                        <div className="kristen-waiting">
                            <div className="kristen-spinner" />
                            <p className="text-muted">Connecting to Claude...</p>
                        </div>
                    )}
                </div>
            )}

            {/* Error state */}
            {kristen.status === 'error' && (
                <div className="kristen-error-card">
                    <h3>Something went wrong</h3>
                    <p className="text-secondary">{kristen.error}</p>
                    <button className="btn btn-secondary" onClick={kristen.reset} style={{ marginTop: '12px' }}>Try Again</button>
                </div>
            )}
        </div>
    );
}

/**
 * Split streamed text into sections based on ## headers
 */
function parseSections(text) {
    if (!text) return [];

    const sections = [];
    const parts = text.split(/^(#+ .+)$/gm);

    let currentTitle = null;
    let currentContent = '';

    for (const part of parts) {
        if (/^#+ /.test(part)) {
            // Save previous section
            if (currentTitle || currentContent.trim()) {
                sections.push({ title: currentTitle, content: currentContent.trim() });
            }
            currentTitle = part.replace(/^#+\s*(?:\*\*)?(.*?)(?:\*\*)?\s*$/, '$1');
            currentContent = '';
        } else {
            currentContent += part;
        }
    }

    // Don't forget the last section
    if (currentTitle || currentContent.trim()) {
        sections.push({ title: currentTitle, content: currentContent.trim() });
    }

    return sections;
}

const EXPECTED_SECTIONS = [
    'WHAT',
    'WHY',
    'HYPOTHESIS',
    'HOW',
];

function KristenProgressBar({ streamedText }) {
    const found = EXPECTED_SECTIONS.filter((s) => {
        const regex = new RegExp(`^#+\\s*(?:\\*\\*)?${s}(?:\\*\\*)?`, 'm');
        return regex.test(streamedText);
    });
    const doneCount = found.length;
    const total = EXPECTED_SECTIONS.length;
    const percent = Math.round((doneCount / total) * 100);

    return (
        <div className="kristen-progress">
            <div className="kristen-progress__header">
                <span className="kristen-progress__label">
                    {doneCount < total ? `Section ${doneCount + 1} of ${total}` : 'Finishing up...'}
                </span>
                <span className="kristen-progress__pct">{percent}%</span>
            </div>
            <div className="kristen-progress__track">
                <div className="kristen-progress__fill" style={{ width: `${percent}%` }} />
            </div>
            <div className="kristen-progress__sections">
                {EXPECTED_SECTIONS.map((name, i) => {
                    const isDone = found.includes(name);
                    const isActive = !isDone && i === doneCount;
                    return (
                        <span
                            key={name}
                            className={`kristen-progress__tag ${isDone ? 'kristen-progress__tag--done' : isActive ? 'kristen-progress__tag--active' : ''}`}
                        >
                            {isDone ? '✓' : isActive ? '●' : ''} {name}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

// Simple markdown-to-HTML converter for the result display
function formatMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        .replace(/<\/ul>\s*<ul>/g, '')
        .replace(/\n\n/g, '<br/><br/>')
        .replace(/\n/g, '<br/>');
}
