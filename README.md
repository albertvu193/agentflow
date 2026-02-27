# AgentFlow ⚡

**A visual AI workflow orchestrator powered by Claude Code.**

Watch your AI agents work in real-time. Create custom agents, build pipelines, and let them improve over time with persistent memory.

![Dark Mode](https://img.shields.io/badge/theme-dark%20mode-1a1a2e?style=flat-square)
![Claude Code](https://img.shields.io/badge/powered%20by-Claude%20Code-8b5cf6?style=flat-square)
![Local First](https://img.shields.io/badge/runs-locally-10b981?style=flat-square)

## Features

- **🔄 Real Agent Execution** — Each agent runs as a Claude Code subprocess with custom system prompts
- **🎨 Live Visual Pipeline** — Watch agents light up as they work through the workflow
- **📝 Agent Editor** — Create and modify agents via a beautiful UI (name, role, model, system prompt)
- **🧠 Persistent Memory** — Agents remember past runs and improve over time
- **📡 Real-time Streaming** — WebSocket pushes live status updates, logs, and outputs
- **🌙 Premium Dark UI** — Glassmorphism, gradient glows, smooth animations

## Prerequisites

- **macOS** with Terminal
- **Node.js** v18+
- **Claude Code** CLI installed and authenticated (`claude --version` should work)

## Quick Start

```bash
# 1. Setup (one time only)
bash setup.sh

# 2. Launch
bash start.sh
```

The app opens automatically at [http://localhost:5173](http://localhost:5173).

## How It Works

```
┌─────────────────────────────────────┐
│        React Frontend (Vite)        │
│  Pipeline │ Agent Cards │ Log Stream│
└──────────────────┬──────────────────┘
                   │ WebSocket + REST
┌──────────────────▼──────────────────┐
│      Node.js / Express Backend      │
│  Agent Runner │ Workflow Engine     │
└──────────────────┬──────────────────┘
                   │ child_process.spawn
┌──────────────────▼──────────────────┐
│     Claude Code CLI (claude -p)     │
└──────────────────┬──────────────────┘
                   │
┌──────────────────▼──────────────────┐
│     ~/.agent-viz/ (local storage)   │
│  agents │ workflows │ memory │ runs │
└─────────────────────────────────────┘
```

## Pre-built Workflows

| Workflow | Agents | Description |
|----------|--------|-------------|
| 🔬 Research Assistant | Topic Analyzer → Article Searcher → Relevance Filter → Summary Writer | Deep research on any topic |
| 💻 Code Review | Code Analyzer → Bug Detector → Improvement Suggester → Report Generator | Comprehensive code review |

## Usage

1. **Select a workflow** from the dropdown
2. **Enter your input** (research question, code to review, etc.)
3. **Click ▶ Run Workflow** — agents execute sequentially
4. **Watch the pipeline** — cards glow and animate as agents work
5. **View live logs** — timestamped, color-coded entries stream in real-time
6. **Click any agent card** to edit its system prompt, role, or model
7. **Re-run** — agents use persistent memory from previous runs to improve

## Project Structure

```
agentflow/
├── server/                    # Backend
│   ├── server.js              # Express + WebSocket entry
│   ├── services/
│   │   ├── agentRunner.js     # Spawns claude CLI per agent
│   │   ├── workflowEngine.js  # Orchestrates pipeline execution
│   │   └── memoryManager.js   # Persistent JSON storage
│   ├── routes/                # REST API endpoints
│   └── data/defaults.js       # Pre-built agents & workflows
├── src/                       # Frontend (React)
│   ├── components/            # UI components
│   ├── hooks/                 # WebSocket & API hooks
│   ├── App.jsx                # Main layout
│   └── index.css              # Design system
├── setup.sh                   # One-time setup script
├── start.sh                   # Launch script
└── package.json
```

## Data Storage

All data is stored locally at `~/.agent-viz/`:

- `agents.json` — Agent configurations
- `workflows.json` — Workflow definitions
- `memory.json` — Agent memories and learnings
- `runs/` — Full run logs with timestamps

## License

MIT
