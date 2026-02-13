# Panel Chat

Chat with AI agents representing 1,136 real survey respondents. Ask a question, select a panel, and watch persona-agents debate across multiple rounds — powered by LangGraph's fan-out/collect pattern.

## Features

- **Multi-provider LLM support**: Anthropic (Claude), OpenAI (GPT-5.2, o3), Google (Gemini) — bring your own API key
- **Survey-backed personas**: Each agent is grounded in a real respondent's profile from the 2026 Data Engineering Survey
- **Multi-round debates**: Agents see prior responses and can refine their positions
- **Configurable panels**: 2 to 1,136 respondents, filtered by role, industry, region, and more
- **Real-time streaming**: Responses stream over WebSocket as agents complete
- **Session history**: Past debates are persisted in DuckDB and browsable from the sidebar

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) for Python dependency management

### Setup

```bash
# Clone and install backend dependencies
git clone <repo-url> && cd panel-chat
uv sync

# Install frontend dependencies
cd frontend && npm install && cd ..

# Copy environment config
cp .env.example .env
```

### Run

```bash
# Terminal 1: Backend
uv run uvicorn backend.main:app --reload

# Terminal 2: Frontend
cd frontend && npm run dev
```

Open http://localhost:5173. The settings modal will appear on first visit — enter your API key, pick a model, and start asking questions.

## Configuration

Settings are managed in the browser (no server-side API keys):

| Setting | Description |
|---------|------------|
| **API Key** | Your key for the selected provider (stored in localStorage, sent directly to the provider) |
| **Model** | Claude Opus 4.6, Claude Sonnet 4.5, Claude Haiku 4.5, GPT-5.2, GPT-4.1, GPT-4.1 Mini, o3, o3 Mini, Gemini 2.5 Pro, Gemini 2.5 Flash |
| **Panel Size** | Number of respondents (2–1,136). Panels >20 show a cost/speed warning |
| **Rounds** | Number of debate rounds (1–5) |
| **Filters** | Narrow the panel by role, org size, industry, region, AI usage, architecture trend |

Server-side config (`.env`):

```
DUCKDB_PATH=panel_chat.duckdb
CSV_PATH=survey_2026_data_engineering.csv
```

## Architecture

```
backend/                    frontend/src/
  main.py                     App.tsx
  config.py                   api/client.ts, ws.ts
  db.py                       store/debateStore.ts
  models/                     hooks/useDebate.ts
  routers/                    components/
  services/                   components/ui/ (shadcn)
  graph/                      types/index.ts
    state.py
    nodes.py
    builder.py
    prompts.py
```

**Backend**: FastAPI + LangGraph + DuckDB. The debate graph fans out questions to persona-agents in parallel, collects responses per round, and streams results over WebSocket.

**Frontend**: React 19 + Vite + Tailwind CSS v4 + shadcn/ui + Zustand. Settings modal for API key/model configuration, sidebar with filters and history, real-time debate view.

## Tech Stack

- **Backend**: Python 3.12, FastAPI, LangGraph, LangChain (Anthropic/OpenAI/Google), DuckDB, Pydantic v2
- **Frontend**: TypeScript, React 19, Vite 7, Tailwind CSS v4, shadcn/ui, Zustand, Lucide icons
- **Package management**: uv (Python), npm (frontend)
