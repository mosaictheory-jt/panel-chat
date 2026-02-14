# Development Guide

## Prerequisites

- **Python 3.12+**
- **Node.js 22+**
- **[uv](https://docs.astral.sh/uv/)** for Python dependency management
- **Docker** (optional, for containerized deployment)

## Initial Setup

```bash
git clone <repo-url> && cd panel-chat

# Install Python dependencies
uv sync

# Install frontend dependencies
cd frontend && npm install && cd ..
```

## Running Locally

Start backend and frontend in separate terminals:

```bash
# Terminal 1 — Backend (auto-reloads on file changes)
uv run uvicorn backend.main:app --reload

# Terminal 2 — Frontend (Vite dev server with HMR)
cd frontend && npm run dev
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- API docs (auto-generated): http://localhost:8000/docs

## Running with Docker

```bash
# Build and start both services
docker compose up --build

# Run in background
docker compose up --build -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

The app is served at http://localhost:3000 with nginx proxying API/WS requests to the backend.

## Project Conventions

### Python

- Type hints on all function signatures
- Use `logging` module, never `print`
- Parameterized DuckDB queries (no string interpolation)
- Import order: stdlib, third-party, local
- Use `uv add` to add dependencies, never pip

### TypeScript

- Functional components only
- Path alias `@/` maps to `src/`
- Store selectors: `useSurveyStore((s) => s.field)`
- Destructure store values in components
- No semicolons (project style)

### shadcn/ui

Components in `src/components/ui/` are managed by shadcn. Do not edit them manually.

```bash
# Add a new shadcn component
cd frontend && npx shadcn@latest add <component-name>
```

## Common Development Tasks

### Adding a New LLM Provider

1. **Install the LangChain integration:**

```bash
uv add langchain-<provider>
```

2. **Update `backend/services/llm.py`** — add a case in `_detect_provider()` and `get_llm()`:

```python
elif provider == "newprovider":
    from langchain_newprovider import ChatNewProvider
    return ChatNewProvider(model=model, api_key=api_key, **kwargs)
```

3. **Add models to `frontend/src/types/index.ts`** in the `MODEL_OPTIONS` array:

```typescript
{ value: "new-model-name", label: "New Model", provider: "NewProvider", maxTemp: 1.0 },
```

4. **Add pricing to `frontend/src/lib/pricing.ts`** in the `MODEL_PRICING` record:

```typescript
"new-model-name": { inputPerMillion: 1.00, outputPerMillion: 5.00 },
```

5. **Add the provider key** to the `ApiKeys` type and store initialization in `surveyStore.ts`.

### Adding a New Respondent Filter

1. **Add the column** to the `Respondent` model in `backend/models/respondent.py`
2. **Add it** to `FilterOptions` in the same file
3. **Add the column** to `get_filter_options()` in `backend/services/panel.py`
4. **Add the query parameter** to the `count()` endpoint in `backend/routers/respondents.py`
5. **Add the filter** to `FilterPanel.tsx` and `Filters` type in `types/index.ts`

### Modifying the Survey Prompt

The persona system prompt and survey user prompt are in `backend/graph/prompts.py`:

- `PERSONA_SYSTEM` — sets up the respondent's character with their full profile
- `SURVEY_USER` — instructs the agent to answer sub-questions as JSON

The analyzer prompt is in `backend/services/analyzer.py`:

- `ANALYZER_SYSTEM` — rules for breaking down questions
- `ANALYZER_USER` — the user's question template

### Database Schema Changes

The schema is defined in `backend/db.py` in `init_db()`. Tables use `CREATE TABLE IF NOT EXISTS`.

To apply schema changes during development:

```bash
# Delete the local database — it will be recreated on startup
rm -f panel_chat.duckdb panel_chat.duckdb.wal
```

### Adding a New Chart Color Theme

Add an entry to the `CHART_THEMES` array in `frontend/src/lib/chartThemes.ts`:

```typescript
{
  id: "my-theme",
  name: "My Theme",
  colors: ["#color1", "#color2", "#color3", "#color4", "#color5", "#color6"],
},
```

## State Management

The Zustand store (`surveyStore.ts`) manages all application state. Key sections:

| Section | Persisted | Description |
|---------|-----------|-------------|
| API Keys | localStorage | Per-provider API keys |
| Selected Models | localStorage | Models for survey responses |
| Analyzer Model | localStorage | Model for question analysis |
| Temperatures | localStorage | Per-model temperature settings |
| Panel Size | Memory | Number of panelists |
| Filters | Memory | Active respondent filters |
| Phase | Memory | Current survey phase (`idle` → `analyzing` → `reviewing` → `running` → `complete`) |
| Survey Data | Memory | Current survey's question, panel, breakdown, responses |
| History | Memory (fetched) | List of past survey summaries |
| Completed Surveys | Memory | Full data for completed surveys (for accumulated results view) |
| Visible Survey IDs | Memory | Which completed surveys are shown in the results view |

## Survey Phases

```
idle → analyzing → reviewing → running → complete → idle
                      ↑                      │
                      └──────────────────────┘
                        (user asks new question)
```

| Phase | Trigger | UI |
|-------|---------|-----|
| `idle` | Initial state / reset | Welcome screen or past results |
| `analyzing` | `startSurvey()` called | Loading spinner |
| `reviewing` | Analyzer returns breakdown | BreakdownEditor with cost estimate |
| `running` | `runSurvey()` called | Panelists tab (live), Results tab (charts updating) |
| `complete` | All responses received | Auto-switch to Results tab, actual cost shown |

## Testing

### Manual Testing

1. Configure at least one API key and select a model in Settings
2. Ask a question (e.g., "What orchestration tool do you use?")
3. Review the breakdown — check sub-questions and options make sense
4. Run the survey — watch panelists respond in real-time
5. Check the Results tab — verify charts populate correctly
6. Click a chart segment — verify drill-down shows correct panelists
7. Click a panelist — verify the detail sheet shows their profile and answers
8. Ask another question — verify it stacks in the results view
9. Toggle survey visibility in the sidebar — verify charts update

### Docker Testing

```bash
# Build and run
docker compose up --build -d

# Verify backend health
curl http://localhost:3000/api/health
# → {"status":"ok"}

# Verify respondent data loaded
curl http://localhost:3000/api/respondents/count
# → {"count":1101}

# Check logs
docker compose logs backend
docker compose logs frontend

# Stop
docker compose down
```

## Troubleshooting

### "No respondents match"
The CSV data file may not have loaded. Check that `survey_2026_data_engineering.csv` exists in the project root and the backend startup logs show successful initialization.

### DuckDB concurrency errors
All DuckDB access must go through `execute_query()` in `db.py`, which uses a `threading.Lock`. If you add new database calls, use this helper instead of calling `get_conn()` directly.

### Structured output parsing errors
If an LLM fails to return valid `QuestionBreakdown` JSON, check:
- The model supports structured output (tool use / function calling)
- The response isn't being truncated (avoid setting `max_tokens`)
- The Pydantic field descriptions are providing enough guidance

### WebSocket disconnects during survey
The nginx proxy has an 86400s read timeout. For very large panels, responses may take several minutes. If running locally without nginx, there's no timeout.

### Vite HMR not picking up changes
Try a hard refresh in the browser, or restart the Vite dev server.
