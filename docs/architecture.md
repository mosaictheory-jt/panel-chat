# Architecture

Panel Chat is a full-stack application with a Python backend and a React frontend. The backend orchestrates multi-agent LLM workflows using LangGraph's fan-out/collect pattern. The frontend manages state with Zustand and visualizes results with Recharts.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Settings │  │ Filters  │  │ ChatInput│  │   SurveyView   │  │
│  │  Modal   │  │  Panel   │  │          │  │ (tabs/charts)  │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │
│                        │                          ▲              │
│                   Zustand Store                    │              │
│                        │                          │              │
│              ┌─────────┴──────────┐               │              │
│              │   HTTP (REST)      │    WebSocket   │              │
│              ▼                    ▼               │              │
└──────────────┼────────────────────┼───────────────┼──────────────┘
               │                    │               │
┌──────────────┼────────────────────┼───────────────┼──────────────┐
│              ▼                    ▼               │   Backend    │
│         ┌─────────┐        ┌──────────┐          │              │
│         │ FastAPI │        │WebSocket │──────────┘              │
│         │ Routes  │        │ Handler  │                         │
│         └────┬────┘        └────┬─────┘                         │
│              │                  │                                │
│         ┌────┴────┐       ┌─────┴──────┐                        │
│         │Services │       │  LangGraph │                        │
│         │(panel,  │       │  Workflow  │                        │
│         │history, │       │            │                        │
│         │analyzer)│       │ fan-out →  │                        │
│         └────┬────┘       │ respond →  │                        │
│              │            │ collect    │                        │
│         ┌────┴────┐       └─────┬──────┘                        │
│         │ DuckDB  │◄────────────┘                               │
│         │(survey, │                                             │
│         │ panel,  │                                             │
│         │response)│                                             │
│         └─────────┘                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Survey Creation

```
User types question → ChatInput → useSurvey.startSurvey()
  → POST /api/surveys { question, panel_size, filters, models, analyzer_model }
  → Backend: select_panel() picks random respondents matching filters
  → Backend: store survey in DuckDB
  → Response: SurveySession { id, question, panel, models, ... }
  → Store: startAnalysis() — phase → "analyzing"
```

### 2. Question Analysis

```
Frontend → POST /api/surveys/{id}/analyze { model, api_key }
  → analyzer.analyze_question() uses LLM with structured output
  → LLM returns QuestionBreakdown { original_question, sub_questions[] }
  → Each SubQuestion has: id, text, answer_options[], chart_type
  → Store: setBreakdown() — phase → "reviewing"
```

### 3. Breakdown Review

The user can edit sub-questions, modify answer options, add/remove questions, toggle chart types (bar/pie), and see an estimated cost before proceeding.

### 4. Survey Execution

```
User clicks "Run Survey" → useSurvey.runSurvey(breakdown)
  → POST /api/surveys/{id}/breakdown (save edited breakdown)
  → Store: startRunning() — phase → "running"
  → connectSurveyWS(surveyId, apiKeys, temperatures, ...)
  → WS first message: { api_keys, temperatures }
```

### 5. LangGraph Workflow

```
                    ┌─────────┐
                    │  START  │
                    └────┬────┘
                         │
                    ┌────┴────┐
                    │ fan_out │  (conditional edges)
                    └────┬────┘
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ respond  │  │ respond  │  │ respond  │  (N panelists × M models)
    │ agent_1  │  │ agent_2  │  │ agent_N  │
    └─────┬────┘  └─────┬────┘  └─────┬────┘
          │             │             │
          └─────────────┼─────────────┘
                        │
                   ┌────┴────┐
                   │   END   │
                   └─────────┘
```

Each `survey_respond` node:
1. Formats the persona system prompt with the respondent's profile
2. Formats the user prompt with sub-questions and answer options
3. Calls the LLM (model + api_key + temperature from state)
4. Parses the JSON response, validates answers against valid options
5. Extracts token usage from response metadata
6. Returns response dict to the `responses` accumulator

### 6. Streaming Results

```
LangGraph streams updates → chunk_queue → WS handler
  → For each response: save_response() to DuckDB
  → Send WS message: { type: "survey_response", data: { answers, token_usage, ... } }
  → Frontend: store.addResponse() → charts update live
  → When all done: { type: "survey_done" }
  → Frontend: store.setSurveyDone() → auto-switch to Results tab
```

## Backend Structure

```
backend/
├── main.py              # FastAPI app, lifespan, CORS, router mounting
├── config.py            # Pydantic settings (duckdb_path, csv_path)
├── db.py                # Thread-safe DuckDB connection, schema init
├── models/
│   ├── survey.py        # SubQuestion, QuestionBreakdown, SurveySession, etc.
│   ├── respondent.py    # Respondent model with field_validator for timestamps
│   ├── chat.py          # AgentMessage model
│   └── ws.py            # Generic WSMessage model
├── routers/
│   ├── surveys.py       # CRUD + analyze + breakdown endpoints
│   ├── respondents.py   # Filter options and count endpoints
│   └── ws.py            # WebSocket handler for survey execution
├── services/
│   ├── llm.py           # Multi-provider LLM factory (get_llm)
│   ├── analyzer.py      # Question → structured sub-questions
│   ├── history.py       # Survey persistence (create, save response, list)
│   └── panel.py         # Panel selection with filtering
└── graph/
    ├── state.py          # SurveyAgentState, SurveyState (TypedDicts)
    ├── nodes.py          # survey_respond node with token extraction
    ├── builder.py        # Graph construction with fan-out pattern
    └── prompts.py        # PERSONA_SYSTEM, SURVEY_USER templates
```

## Frontend Structure

```
frontend/src/
├── main.tsx              # React entry, ThemeProvider wrapper
├── App.tsx               # Root layout with Sidebar, SurveyView, ChatInput
├── index.css             # Tailwind v4 theme variables, animations
├── api/
│   ├── client.ts         # REST API calls (surveys, respondents, analyze)
│   └── ws.ts             # WebSocket connection with auto-derived URL
├── store/
│   └── surveyStore.ts    # Zustand store (settings, phase, responses, history)
├── hooks/
│   └── useSurvey.ts      # Survey lifecycle (start, run, refresh)
├── lib/
│   ├── theme.tsx          # ThemeProvider + useTheme hook
│   ├── avatar.ts          # Deterministic emoji avatars for panelists
│   ├── pricing.ts         # Model pricing data and cost calculations
│   ├── chartThemes.ts     # Preset chart color palettes
│   └── utils.ts           # Tailwind class merge utility
├── types/
│   └── index.ts           # Shared types, MODEL_OPTIONS, provider helpers
└── components/
    ├── Layout.tsx          # App shell (sidebar + main)
    ├── Sidebar.tsx         # History, theme toggle, settings button
    ├── ChatInput.tsx       # Question input bar
    ├── SettingsModal.tsx   # API keys, model selection, temperature
    ├── FilterPanel.tsx     # Panel size, respondent filters
    ├── SurveyView.tsx      # Main view (phases, tabs, panelists, charts)
    ├── BreakdownEditor.tsx # Editable sub-questions with cost estimate
    ├── ResultsView.tsx     # Multi-survey chart grid with theme picker
    ├── SubQuestionChart.tsx # Individual chart (bar/pie, drill-down)
    ├── ResponseCard.tsx    # Panelist answer card
    ├── PersonaDetail.tsx   # Slide-out respondent profile sheet
    ├── CostBadge.tsx       # Cost display badge with tooltip
    └── ui/                 # shadcn/ui primitives (do not edit)
```

## Key Design Decisions

### Client-side API Keys
API keys are stored in the browser's localStorage and sent per-request. The server never persists keys. This avoids server-side secret management and lets users switch providers freely.

### Thread-safe DuckDB
DuckDB is single-writer. FastAPI runs handlers in a thread pool, so all database access goes through `execute_query()` which wraps operations in a `threading.Lock`.

### Fan-out with LangGraph
The `Send` API allows dynamic parallelism — one `survey_respond` node is spawned per (respondent, model) pair. This scales naturally to hundreds of concurrent LLM calls.

### Accumulated Results
Completed surveys are stored in the Zustand store's `completedSurveys` record. Multiple surveys can be visualized simultaneously by toggling visibility in the sidebar. Panelists are de-duplicated across visible surveys.

### Cost Estimation
Before running, cost is estimated using fixed token estimates per prompt template. After running, actual costs use `usage_metadata` from LangChain responses. Pricing data covers all 15 supported models.
