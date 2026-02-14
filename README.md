# Panel Chat

AI-powered survey panel that lets you ask questions to persona-agents representing 1,136 real data engineering survey respondents. Questions are broken into structured sub-questions, fanned out to agents in parallel via LangGraph, and responses are automatically visualized with interactive charts.

## Features

- **Multi-provider LLM support** — Anthropic (Claude), OpenAI (GPT-5.2, o3), Google (Gemini). Bring your own API keys; nothing is stored server-side.
- **Survey-backed personas** — Each agent is grounded in a real respondent's profile from the 2026 Data Engineering Survey (role, industry, tools, pain points, etc.)
- **Structured question analysis** — An LLM analyzer breaks your question into sub-questions with categorical answer options before surveying the panel
- **Editable breakdown** — Review and modify sub-questions, options, and chart types before running
- **Multi-model comparison** — Select multiple models and compare how different LLMs answer through the same personas
- **Real-time streaming** — Responses stream over WebSocket with live panelist status and progressive chart updates
- **Cost tracking** — Estimated cost shown before running; actual cost (from token usage) shown after completion, broken down by provider
- **Accumulated results** — Stack results from multiple surveys, toggle visibility, and compare across runs
- **Interactive charts** — Bar/pie toggle per chart, click-to-drill-down to see which panelists chose an option, chart color theme picker
- **Persona detail** — Click any panelist to see their full profile and response history across all visible surveys
- **Light/dark/system theme** — Full theme support with persistent preference
- **Session history** — Past surveys are persisted in DuckDB and browsable from the sidebar
- **Docker support** — Single `docker compose up` to run the full stack

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 22+
- [uv](https://docs.astral.sh/uv/) for Python dependency management

### Local Development

```bash
# Clone and install
git clone <repo-url> && cd panel-chat
uv sync
cd frontend && npm install && cd ..

# Run backend (terminal 1)
uv run uvicorn backend.main:app --reload

# Run frontend (terminal 2)
cd frontend && npm run dev
```

Open http://localhost:5173. The settings modal will appear on first visit — enter at least one API key, select models, and start asking questions.

### Docker

```bash
docker compose up --build
```

Open http://localhost:3000. The nginx frontend proxies API and WebSocket requests to the backend automatically.

## Documentation

Detailed documentation is available in the [`docs/`](docs/) folder:

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System design, data flow, and component interactions |
| [API Reference](docs/api.md) | REST and WebSocket endpoint documentation |
| [Configuration](docs/configuration.md) | All settings, environment variables, and deployment options |
| [Development Guide](docs/development.md) | Local setup, adding features, testing, and conventions |

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Python 3.12, FastAPI, LangGraph, LangChain (Anthropic / OpenAI / Google), DuckDB, Pydantic v2 |
| **Frontend** | TypeScript, React 19, Vite 7, Tailwind CSS v4, shadcn/ui, Zustand, Recharts, Lucide |
| **Infrastructure** | Docker, nginx, uv, npm |

## License

MIT
