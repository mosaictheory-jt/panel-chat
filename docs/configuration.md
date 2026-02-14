# Configuration

Panel Chat uses a combination of browser-side settings (persisted to localStorage) and server-side environment variables.

## Browser Settings

All user-facing settings are managed through the Settings modal in the UI. No API keys are stored on the server.

### API Keys

One key per provider. Only providers with keys can be used. Keys are stored in `localStorage` under separate keys per provider:

| localStorage Key | Provider |
|-----------------|----------|
| `panel-chat-key-anthropic` | Anthropic |
| `panel-chat-key-openai` | OpenAI |
| `panel-chat-key-google` | Google |

### Selected Models

Stored in `panel-chat-selected-models` as a JSON array. Multiple models can be selected — each panelist will respond once per selected model, enabling cross-model comparison.

**Available Models:**

| Model ID | Label | Provider | Max Temp |
|----------|-------|----------|----------|
| `claude-opus-4-6` | Claude Opus 4.6 | Anthropic | 1.0 |
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 | Anthropic | 1.0 |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 | Anthropic | 1.0 |
| `gpt-5.2` | GPT-5.2 | OpenAI | 2.0 |
| `gpt-4.1` | GPT-4.1 | OpenAI | 2.0 |
| `gpt-4.1-mini` | GPT-4.1 Mini | OpenAI | 2.0 |
| `gpt-4.1-nano` | GPT-4.1 Nano | OpenAI | 2.0 |
| `o3` | o3 | OpenAI | 1.0 |
| `o3-mini` | o3 Mini | OpenAI | 1.0 |
| `o4-mini` | o4 Mini | OpenAI | 1.0 |
| `gemini-3-pro-preview` | Gemini 3 Pro | Google | 2.0 |
| `gemini-3-flash-preview` | Gemini 3 Flash | Google | 2.0 |
| `gemini-2.5-pro` | Gemini 2.5 Pro | Google | 2.0 |
| `gemini-2.5-flash` | Gemini 2.5 Flash | Google | 2.0 |
| `gemini-2.5-flash-lite` | Gemini 2.5 Flash Lite | Google | 2.0 |

### Analyzer Model

Stored in `panel-chat-analyzer-model`. This is the model used to break down the user's question into structured sub-questions. Can be any of the available models.

### Temperature

Stored in `panel-chat-model-temps` as a JSON object mapping model IDs to temperature values. Each model's temperature can be configured independently via a slider in the Settings modal.

### Panel Size

Configured in the left sidebar's Filter Panel. Adjustable via slider or click-to-edit number. Range: 1 to the number of matching respondents (max 1,136). Stored in the Zustand store (not persisted to localStorage — resets to 5 on reload).

### Theme

Stored in `panel-chat-theme`. Values: `"light"`, `"dark"`, or `"system"`. Toggled via the icon button in the sidebar header.

### Chart Color Theme

Stored in `panel-chat-chart-theme`. Selectable from preset palettes via the theme picker in the Results view.

## Server Environment Variables

Set via `.env` file or system environment. Pydantic Settings reads these automatically.

| Variable | Default | Description |
|----------|---------|-------------|
| `DUCKDB_PATH` | `panel_chat.duckdb` | Path to the DuckDB database file |
| `CSV_PATH` | `survey_2026_data_engineering.csv` | Path to the respondent CSV data file |

## Frontend Environment Variables

Set via `frontend/.env` for local development. In Docker, these are set during the build stage.

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | _(empty)_ | Base URL for REST API calls. Empty = same origin (for Docker/nginx). Set to `http://localhost:8000` for local dev. |
| `VITE_WS_URL` | _(empty)_ | Base URL for WebSocket connections. Empty = auto-derived from `window.location`. Set to `ws://localhost:8000` for local dev. |

## Docker Configuration

### docker-compose.yml

| Service | Port | Description |
|---------|------|-------------|
| `backend` | 8000 | FastAPI + uvicorn |
| `frontend` | 3000 | nginx serving React build + reverse proxy |

### Volumes

| Volume | Mount | Description |
|--------|-------|-------------|
| `duckdb-data` | `/app/data` | Persistent DuckDB storage across container restarts |

### Nginx Proxy Rules

| Path | Target | Notes |
|------|--------|-------|
| `/api/*` | `http://backend:8000` | Standard HTTP proxy |
| `/ws/*` | `http://backend:8000` | WebSocket upgrade with 86400s read timeout |
| `/*` | Static files | SPA fallback to `index.html` |

## CORS

The backend allows requests from:

- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Docker nginx)
- `http://localhost` (Docker without port)

## Model Pricing

Cost estimation uses per-million-token pricing stored in `frontend/src/lib/pricing.ts`. All values are in USD.

| Model | Input $/1M | Output $/1M |
|-------|-----------|-------------|
| claude-opus-4-6 | $5.00 | $25.00 |
| claude-sonnet-4-5-20250929 | $3.00 | $15.00 |
| claude-haiku-4-5-20251001 | $1.00 | $5.00 |
| gpt-5.2 | $1.75 | $14.00 |
| gpt-4.1 | $2.00 | $8.00 |
| gpt-4.1-mini | $0.40 | $1.60 |
| gpt-4.1-nano | $0.10 | $0.40 |
| o3 | $10.00 | $40.00 |
| o3-mini | $1.10 | $4.40 |
| o4-mini | $1.10 | $4.40 |
| gemini-3-pro-preview | $2.00 | $12.00 |
| gemini-3-flash-preview | $0.50 | $3.00 |
| gemini-2.5-pro | $1.25 | $10.00 |
| gemini-2.5-flash | $0.30 | $2.50 |
| gemini-2.5-flash-lite | $0.10 | $0.40 |

Pre-run estimates use fixed token counts per prompt template (~400 input tokens, ~25 output tokens per sub-question per call). Post-run costs use actual `input_tokens` and `output_tokens` from the LLM response metadata.
