import { useState, useEffect } from 'react';
import './AgentEditor.css';

export function AgentEditor({ agent, onSave, onClose, onDelete }) {
    const [form, setForm] = useState({
        name: '',
        role: '',
        icon: '🤖',
        model: 'sonnet',
        systemPrompt: '',
    });

    useEffect(() => {
        if (agent) {
            setForm({
                name: agent.name || '',
                role: agent.role || '',
                icon: agent.icon || '🤖',
                model: agent.model || 'sonnet',
                systemPrompt: agent.systemPrompt || '',
            });
        }
    }, [agent]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...agent, ...form });
    };

    if (!agent) return null;

    return (
        <div className="agent-editor-overlay" onClick={onClose}>
            <div className="agent-editor" onClick={(e) => e.stopPropagation()} id="agent-editor">
                <div className="agent-editor__header">
                    <h2>
                        <span>{form.icon}</span> {agent.id ? 'Edit Agent' : 'New Agent'}
                    </h2>
                    <button className="agent-editor__close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="agent-editor__form">
                    <div className="agent-editor__row">
                        <div className="agent-editor__field" style={{ width: 80 }}>
                            <label>Icon</label>
                            <input
                                value={form.icon}
                                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                                style={{ textAlign: 'center', fontSize: 24 }}
                            />
                        </div>
                        <div className="agent-editor__field" style={{ flex: 1 }}>
                            <label>Name</label>
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Agent name"
                                required
                            />
                        </div>
                        <div className="agent-editor__field" style={{ width: 140 }}>
                            <label>Model</label>
                            <select
                                value={form.model}
                                onChange={(e) => setForm({ ...form, model: e.target.value })}
                            >
                                <option value="sonnet">Sonnet</option>
                                <option value="opus">Opus</option>
                                <option value="haiku">Haiku</option>
                            </select>
                        </div>
                    </div>

                    <div className="agent-editor__field">
                        <label>Role Description</label>
                        <input
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                            placeholder="What does this agent do?"
                        />
                    </div>

                    <div className="agent-editor__field">
                        <label>System Prompt</label>
                        <textarea
                            value={form.systemPrompt}
                            onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                            placeholder="You are a helpful assistant that..."
                            rows={10}
                        />
                    </div>

                    <div className="agent-editor__actions">
                        {agent.id && onDelete && (
                            <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => { onDelete(agent.id); onClose(); }}
                            >
                                🗑 Delete
                            </button>
                        )}
                        <div style={{ flex: 1 }} />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary btn-sm">
                            💾 Save Agent
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
