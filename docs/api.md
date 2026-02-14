# API Reference

All REST endpoints are prefixed with `/api`. The WebSocket endpoint is at `/ws`.

## REST Endpoints

### Health Check

```
GET /api/health
```

Returns `{"status": "ok"}`.

---

### Respondents

#### Get Filter Options

```
GET /api/respondents/filters
```

Returns the distinct values available for each filterable field.

**Response:**

```json
{
  "role": ["Data Engineer", "Analytics Engineer", "Data Architect", ...],
  "org_size": ["1-10", "11-50", "51-200", ...],
  "industry": ["Technology", "Finance", "Healthcare", ...],
  "region": ["North America", "Europe", "Asia Pacific", ...],
  "ai_usage_frequency": ["Daily", "Weekly", "Monthly", ...],
  "architecture_trend": ["Lakehouse", "Data Mesh", "Modern Data Stack", ...]
}
```

#### Get Respondent Count

```
GET /api/respondents/count?role=Data+Engineer&region=North+America,Europe
```

Returns the number of respondents matching the given filters. Multiple values for a single field are comma-separated. Omitted fields are not filtered.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `role` | string | Comma-separated roles |
| `org_size` | string | Comma-separated org sizes |
| `industry` | string | Comma-separated industries |
| `region` | string | Comma-separated regions |
| `ai_usage_frequency` | string | Comma-separated AI usage frequencies |
| `architecture_trend` | string | Comma-separated architecture trends |

**Response:**

```json
{
  "count": 342
}
```

---

### Surveys

#### Create Survey

```
POST /api/surveys
```

Creates a new survey session and selects a random panel of respondents matching the filters.

**Request Body:**

```json
{
  "question": "What tools do you use for data orchestration?",
  "panel_size": 20,
  "filters": {
    "role": ["Data Engineer"],
    "region": ["North America"]
  },
  "models": ["gemini-2.5-flash"],
  "analyzer_model": "gemini-2.5-flash"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | yes | The question to ask the panel |
| `panel_size` | integer | no | Number of panelists (default: 5) |
| `filters` | object | no | Filter criteria (field → values[]) |
| `models` | string[] | yes | Models to use for survey responses |
| `analyzer_model` | string | yes | Model to use for question analysis |

**Response:** `SurveySession`

```json
{
  "id": "abc123",
  "question": "What tools do you use for data orchestration?",
  "breakdown": null,
  "panel_size": 20,
  "filters": { "role": ["Data Engineer"] },
  "models": ["gemini-2.5-flash"],
  "panel": [
    {
      "id": 42,
      "role": "Data Engineer",
      "industry": "Technology",
      "org_size": "51-200",
      "region": "North America",
      ...
    }
  ],
  "responses": [],
  "created_at": "2026-02-14T12:00:00"
}
```

#### Analyze Question

```
POST /api/surveys/{survey_id}/analyze
```

Uses the specified LLM to break down the survey question into structured sub-questions with categorical answer options.

**Request Body:**

```json
{
  "model": "gemini-2.5-flash",
  "api_key": "your-api-key"
}
```

**Response:** `QuestionBreakdown`

```json
{
  "original_question": "What tools do you use for data orchestration?",
  "sub_questions": [
    {
      "id": "sq_1",
      "text": "What is your primary data orchestration tool?",
      "answer_options": ["Airflow", "Dagster", "Prefect", "dbt Cloud", "Mage", "Other"],
      "chart_type": "pie"
    }
  ]
}
```

#### Submit Breakdown

```
POST /api/surveys/{survey_id}/breakdown
```

Saves the (possibly edited) question breakdown. Called before starting the survey run.

**Request Body:**

```json
{
  "breakdown": {
    "original_question": "...",
    "sub_questions": [...]
  }
}
```

**Response:** The saved `QuestionBreakdown`.

#### List Surveys

```
GET /api/surveys
```

Returns a summary list of all surveys, ordered by creation time (newest first).

**Response:** `SurveySummary[]`

```json
[
  {
    "id": "abc123",
    "question": "What tools do you use?",
    "panel_size": 20,
    "created_at": "2026-02-14T12:00:00"
  }
]
```

#### Get Survey

```
GET /api/surveys/{survey_id}
```

Returns the full survey session including panel, breakdown, and all responses.

**Response:** `SurveySession` (same as create response, but with populated `breakdown` and `responses`).

---

## WebSocket

### Survey Execution

```
WS /ws/surveys/{survey_id}
```

Connects to execute a survey. The client must send an initialization message immediately after connecting.

#### Initialization Message (client → server)

```json
{
  "api_keys": {
    "anthropic": "sk-ant-...",
    "google": "AIza..."
  },
  "temperatures": {
    "gemini-2.5-flash": 1.0,
    "claude-sonnet-4-5-20250929": 0.7
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `api_keys` | object | Provider name → API key. At least one required. |
| `temperatures` | object | Model name → temperature. Optional. Uses provider defaults if omitted. |

#### Server Messages

**Survey Response** — sent as each panelist completes:

```json
{
  "type": "survey_response",
  "data": {
    "id": "resp_456",
    "survey_id": "abc123",
    "respondent_id": 42,
    "agent_name": "Data Engineer @ Technology (North America)",
    "model": "gemini-2.5-flash",
    "answers": {
      "sq_1": "Airflow",
      "sq_2": "Daily"
    },
    "token_usage": {
      "input_tokens": 487,
      "output_tokens": 32
    }
  }
}
```

**Survey Done** — sent when all panelists have responded:

```json
{
  "type": "survey_done",
  "data": {
    "survey_id": "abc123"
  }
}
```

**Error** — sent on failure:

```json
{
  "type": "error",
  "data": {
    "message": "Description of what went wrong"
  }
}
```

## Data Models

### SubQuestion

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Short unique ID (e.g., `sq_1`) |
| `text` | string | The sub-question text |
| `answer_options` | string[] | 3-6 mutually exclusive options |
| `chart_type` | string | `"bar"` or `"pie"` |

### Respondent

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique respondent ID |
| `role` | string | Job role |
| `org_size` | string | Organization size range |
| `industry` | string | Industry sector |
| `team_focus` | string | Team's primary focus area |
| `storage_environment` | string | Primary storage platform |
| `orchestration` | string | Orchestration tool |
| `ai_usage_frequency` | string | How often they use AI |
| `ai_helps_with` | string | What AI helps with |
| `ai_adoption` | string | AI adoption stage |
| `modeling_approach` | string | Data modeling approach |
| `modeling_pain_points` | string | Modeling challenges |
| `architecture_trend` | string | Architecture trend they follow |
| `biggest_bottleneck` | string | Biggest challenge |
| `team_growth_2026` | string | Expected team growth |
| `education_topic` | string | Topic of interest |
| `industry_wish` | string | What they wish the industry had |
| `region` | string | Geographic region |
