const BASE_URL = "http://localhost:8000"

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function getFilterOptions() {
  return fetchJSON<{
    role: string[]
    org_size: string[]
    industry: string[]
    region: string[]
    ai_usage_frequency: string[]
    architecture_trend: string[]
  }>("/api/respondents/filters")
}

export async function getRespondentCount(filters: Record<string, string[]>) {
  const params = new URLSearchParams()
  for (const [key, values] of Object.entries(filters)) {
    if (values.length > 0) {
      params.set(key, values.join(","))
    }
  }
  const query = params.toString()
  return fetchJSON<{ count: number }>(
    `/api/respondents/count${query ? `?${query}` : ""}`
  )
}

export async function createDebate(body: {
  question: string
  panel_size: number
  num_rounds: number
  filters: Record<string, string[]> | null
  model: string
  api_key: string
}) {
  return fetchJSON<{
    id: string
    question: string
    panel_size: number
    num_rounds: number
    panel: Array<Record<string, unknown>>
    model: string
  }>("/api/debates", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function listDebates() {
  return fetchJSON<
    Array<{
      id: string
      question: string
      panel_size: number
      num_rounds: number
      created_at: string | null
    }>
  >("/api/debates")
}

export async function getDebate(id: string) {
  return fetchJSON<{
    id: string
    question: string
    panel_size: number
    num_rounds: number
    panel: Array<Record<string, unknown>>
    messages: Array<{
      id: string
      debate_id: string
      round_num: number
      respondent_id: number
      agent_name: string
      content: string
    }>
    model: string
    created_at: string | null
  }>(`/api/debates/${id}`)
}
