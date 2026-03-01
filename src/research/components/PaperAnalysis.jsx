import { useState, useRef, useEffect, useCallback } from 'react';
import { formatMarkdown } from '../utils/formatMarkdown';
import './PaperAnalysis.css';

export function PaperAnalysis({ kristen }) {
  const fileInputRef = useRef(null);
  const streamEndRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [model, setModel] = useState('haiku');

  useEffect(() => {
    if (kristen.streamedText && streamEndRef.current) {
      streamEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [kristen.streamedText]);

  const handleFile = async (file) => {
    if (!file) return;
    setFileError(null);
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setFileError(`"${file.name}" is not a PDF. Please upload a .pdf file.`);
      return;
    }
    try {
      await kristen.uploadFile(file);
    } catch (err) {
      setFileError(err.message || 'Upload failed');
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
      await kristen.startRun(model);
    } catch (err) {
      console.error('Run failed:', err);
    }
  };

  const copyToClipboard = useCallback(() => {
    if (!kristen.result) return;
    navigator.clipboard.writeText(kristen.result).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  }, [kristen.result]);

  const downloadAsText = useCallback(() => {
    if (!kristen.result) return;
    const filename = (kristen.uploadInfo?.filename || 'analysis').replace(/\.pdf$/i, '') + '_analysis.md';
    const blob = new Blob([kristen.result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }, [kristen.result, kristen.uploadInfo?.filename]);

  // ─── Done state ──────────────────────────────────────────────────────
  if (kristen.status === 'done' && kristen.result) {
    const sections = parseSections(kristen.result);

    return (
      <div className="pa r-fade-in">
        <div className="r-section-header">
          <div className="r-section-title-group">
            <h1>Analysis Complete</h1>
            <p className="r-text-secondary r-text-sm">{kristen.uploadInfo?.filename}</p>
          </div>
          <div className="r-flex r-gap-1">
            <button className="r-btn r-btn-ghost r-btn-sm" onClick={copyToClipboard}>
              {copyFeedback ? 'Copied!' : 'Copy'}
            </button>
            <button className="r-btn r-btn-ghost r-btn-sm" onClick={downloadAsText}>
              Download .md
            </button>
            <button className="r-btn r-btn-secondary" onClick={() => {
              if (window.confirm('Start a new analysis? Current results will be cleared.')) kristen.reset();
            }}>
              Analyze Another
            </button>
          </div>
        </div>

        <div className="pa__results r-mt-2">
          {sections.map((section, i) => (
            <div key={i} className="pa__result-section r-card r-card-padded r-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
              {section.title && (
                <div className="pa__result-section-header">
                  <div className={`pa__section-badge pa__section-badge--${getSectionColor(section.title)}`}>
                    {section.title}
                  </div>
                </div>
              )}
              <div
                className="pa__result-body"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(section.content) }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pa r-fade-in">
      <div className="r-section-header">
        <div className="r-section-title-group">
          <h1>Paper Analysis</h1>
          <p className="r-text-secondary r-text-sm">
            Upload a research paper PDF to extract structured insights using AI.
          </p>
        </div>
      </div>

      {/* Upload state */}
      {kristen.status === 'idle' && (
        <div className="r-mt-2">
          <div
            className={`r-dropzone ${dragOver ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Upload PDF research paper"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="r-dropzone__icon">P</div>
            <h3>Upload Research Paper</h3>
            <p>Drop a PDF here or click to browse</p>
            <p className="r-text-xs r-text-muted">Supports academic papers from any publisher</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf"
              hidden
            />
          </div>
          {fileError && (
            <div className="r-alert r-alert-danger r-mt-2">
              {fileError}
            </div>
          )}
        </div>
      )}

      {/* File uploaded — preview */}
      {kristen.status === 'uploaded' && kristen.uploadInfo && (
        <div className="pa__uploaded r-card r-card-padded r-mt-2 r-slide-up">
          <div className="pa__file-info">
            <div className="pa__file-icon">PDF</div>
            <div className="pa__file-details">
              <div className="pa__filename">{kristen.uploadInfo.filename}</div>
              <div className="r-text-sm r-text-muted">
                {kristen.uploadInfo.pages} pages &middot; {Math.round(kristen.uploadInfo.textLength / 1000)}k characters
              </div>
            </div>
          </div>

          <div className="pa__preview r-mt-2">
            <div className="r-label">Text Preview</div>
            <div className="pa__preview-text">{kristen.uploadInfo.preview}...</div>
          </div>

          <div className="lr__config-row r-mt-2">
            <div className="lr__max-input">
              <label className="r-label">AI Model</label>
              <select
                className="r-select"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{ width: '160px' }}
              >
                <option value="haiku">Haiku (Fast)</option>
                <option value="sonnet">Sonnet (Balanced)</option>
                <option value="opus">Opus (Best)</option>
              </select>
            </div>
          </div>
          <div className="r-flex r-gap-1 r-mt-2">
            <button className="r-btn r-btn-primary r-btn-lg" onClick={handleRun}>
              Generate Insights
            </button>
            <button className="r-btn r-btn-secondary" onClick={kristen.reset}>Cancel</button>
          </div>
        </div>
      )}

      {/* Running — streaming */}
      {kristen.status === 'running' && (
        <div className="pa__streaming r-mt-2 r-slide-up">
          {/* Progress header */}
          <div className="pa__stream-header r-card r-card-padded">
            <div className="r-flex r-items-center r-gap-1">
              <div className="r-pulse-dot" />
              <span className="pa__stream-label">Analyzing paper...</span>
            </div>
            <div className="r-text-sm r-text-muted">{kristen.uploadInfo?.filename}</div>

            {/* Section progress */}
            {kristen.streamedText && <SectionProgress streamedText={kristen.streamedText} />}
          </div>

          {/* Streaming output */}
          {kristen.streamedText ? (
            <div className="pa__stream-body r-mt-2">
              {parseSections(kristen.streamedText).map((section, i, arr) => (
                <div
                  key={i}
                  className={`pa__stream-section r-card r-card-padded ${i === arr.length - 1 ? 'pa__stream-section--active' : 'pa__stream-section--done'}`}
                >
                  {section.title && (
                    <div className="pa__stream-section-header">
                      <span className={`pa__section-check ${i < arr.length - 1 ? 'done' : 'active'}`}>
                        {i < arr.length - 1 ? '\u2713' : '\u25CF'}
                      </span>
                      <div className={`pa__section-badge pa__section-badge--${getSectionColor(section.title)}`}>
                        {section.title}
                      </div>
                    </div>
                  )}
                  <div
                    className="pa__stream-content"
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(section.content) }}
                  />
                </div>
              ))}
              <div ref={streamEndRef} />
            </div>
          ) : (
            <div className="r-empty r-mt-2">
              <div className="r-spinner r-spinner-lg" />
              <p className="r-text-muted r-mt-2">Connecting to analysis engine...</p>
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {kristen.status === 'error' && (
        <div className="r-alert r-alert-danger r-mt-2">
          <strong>Error:</strong> {kristen.error}
          <button className="r-btn r-btn-sm r-btn-secondary r-mt-1" onClick={kristen.reset}>Try Again</button>
        </div>
      )}
    </div>
  );
}

/* ─── Section Progress ────────────────────────────────────────────────── */
const EXPECTED_SECTIONS = ['WHAT', 'WHY', 'HYPOTHESIS', 'HOW'];

function SectionProgress({ streamedText }) {
  const found = EXPECTED_SECTIONS.filter((s) => {
    const regex = new RegExp(`^#+\\s*(?:\\*\\*)?${s}(?:\\*\\*)?`, 'm');
    return regex.test(streamedText);
  });
  const doneCount = found.length;
  const total = EXPECTED_SECTIONS.length;
  const percent = Math.round((doneCount / total) * 100);

  return (
    <div className="pa__progress r-mt-2">
      <div className="r-flex r-items-center r-justify-between r-mb-1">
        <span className="r-text-sm r-text-secondary">
          {doneCount < total ? `Section ${doneCount + 1} of ${total}` : 'Finishing up...'}
        </span>
        <span className="r-text-sm r-text-muted">{percent}%</span>
      </div>
      <div className="r-progress-track">
        <div className="r-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="pa__progress-tags r-mt-1">
        {EXPECTED_SECTIONS.map((name) => {
          const isDone = found.includes(name);
          const isActive = !isDone && EXPECTED_SECTIONS.indexOf(name) === doneCount;
          return (
            <span
              key={name}
              className={`pa__progress-tag ${isDone ? 'done' : isActive ? 'active' : ''}`}
            >
              {isDone ? '\u2713' : isActive ? '\u25CF' : ''} {name}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function parseSections(text) {
  if (!text) return [];
  const sections = [];
  const parts = text.split(/^(#+ .+)$/gm);
  let currentTitle = null;
  let currentContent = '';

  for (const part of parts) {
    if (/^#+ /.test(part)) {
      if (currentTitle || currentContent.trim()) {
        sections.push({ title: currentTitle, content: currentContent.trim() });
      }
      currentTitle = part.replace(/^#+\s*(?:\*\*)?(.*?)(?:\*\*)?\s*$/, '$1');
      currentContent = '';
    } else {
      currentContent += part;
    }
  }
  if (currentTitle || currentContent.trim()) {
    sections.push({ title: currentTitle, content: currentContent.trim() });
  }
  return sections;
}

function getSectionColor(title) {
  if (!title) return 'neutral';
  const t = title.toUpperCase();
  if (t.includes('WHAT')) return 'indigo';
  if (t.includes('WHY')) return 'emerald';
  if (t.includes('HYPOTHESIS')) return 'amber';
  if (t.includes('HOW')) return 'sky';
  return 'neutral';
}

