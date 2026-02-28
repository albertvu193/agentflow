# Implementation Progress & Architecture Tracker

This document tracks the implementation phases for transitioning the Research Paper Analysis (Kristen) pipeline from cloud-based Claude CLI to a hybrid Local/RAG architecture. It serves as a persistence layer for multi-session agent development.

## 1. Goal State Architecture
- **Environment**: Node.js / Express Backend + React Vite Frontend
- **Inference Tier 1 (Fast Testing)**: Local `qwen2.5:7b-instruct` (Ollama)
- **Inference Tier 2 (Production Logic)**: Local `qwen2.5:14b` or `32b` (Ollama)
- **Vision Sub-Agent**: `llama3.2-vision:11b`
- **Context Preservation**: Pass-over Semantic Chunking + Vector Database (LanceDB)
- **Extraction Engine**: `pdf-parse` (Text) + Image extraction pipeline

## 2. Implementation Phases & Status

### Phase 1: Environment & Tooling Prep (Status: In Progress 🟡)
- [x] Analyze hardware limitations (RTX 3070 8GB VRAM / 48GB RAM)
- [x] Design multi-tier model approach based on VRAM caps vs System RAM spillover
- [x] Install `pdf-parse` for node-based extraction logic. 
- [x] Validate extraction output: PDF parsed successfully to `extracted_paper.txt`
- [ ] Install Ollama Server and queue local models
  - *Current blocker*: Silent install running in background, needs verification via CLI.
- [ ] Pull target models: `qwen2.5:7b`, `qwen2.5:14b`, `llama3.2-vision:11b`, `nomic-embed-text`

### Phase 2: PDF Parsing & The "Global Map" Layer (Status: Completed ✅)
- [x] Modify `server/routes/api.js` (or related upload handler) to buffer and process PDF using `pdf-parse` via Javascript memory.
- [x] Connect the output of the PDF Parser to the first Ollama prompt.
- [x] Write the "Global Map" system prompt. Instruct `qwen2.5:7b` to read the raw text and spit out a 500-token high-level summary.

### Phase 3: The Semantic Slicer & RAG (Status: Pending 🔴)
- [ ] Install Embedded Vector DB (`LanceDB` or `ChromaDB` for Node)
- [ ] Split PDF text by structural Markdown headers (not blind token count).
- [ ] Write the loop that prepends the "Global Map" from Phase 2 to each chunk before embedding.

### Phase 4: Sub-Agent Sequential Re-write (Status: Completed ✅)
- [x] Refactor `agentRunner.js` or `defaults.js`.
- [x] Remove `claude -p` CLI spawning logic.
- [x] Replace with `fetch()` calls pointing to local `http://localhost:11434/api/chat`.
- [x] Map the WHAT -> WHY -> HYPOTHESIS -> HOW array, passing the "Global Map" as persistent context to each step.

### Phase 5: Testing & UI Reconnections (Status: Pending 🔴)
- [ ] Ensure websocket streams (`server/utils/WebSocketServer.js`) still correctly chunk the Ollama streaming output to the Frontend React components.
- [ ] Test real-world timing targets.

## 3. Active Notes / Bottlenecks
- The transition from naive RAG chunking to "Context-Aware Semantic Chunking" requires that we do not blindly split text. The pass-1 model MUST be extremely fast (7b) to prevent the overall pipeline from taking > 1 minute.
- `pdf-parse` does not natively extract images for the Vision model. We will need an additional dependency (like `pdf2pic` or `pdf-poppler`) later to handle the visual chart injection.
