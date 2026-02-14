import type { QuestionBreakdown, SurveySession, SurveySummary } from "@/types"

const BASE_URL = import.meta.env.VITE_API_URL ?? ""

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

export async function createSurvey(body: {
  question: string
  panel_size: number
  filters: Record<string, string[]> | null
  models: string[]
  analyzer_model: string
}): Promise<SurveySession> {
  return fetchJSON<SurveySession>("/api/surveys", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function analyzeSurvey(
  surveyId: string,
  model: string,
  apiKey: string,
): Promise<QuestionBreakdown> {
  return fetchJSON<QuestionBreakdown>(`/api/surveys/${surveyId}/analyze`, {
    method: "POST",
    body: JSON.stringify({ model, api_key: apiKey }),
  })
}

export async function submitBreakdown(
  surveyId: string,
  breakdown: QuestionBreakdown,
): Promise<QuestionBreakdown> {
  return fetchJSON<QuestionBreakdown>(`/api/surveys/${surveyId}/breakdown`, {
    method: "POST",
    body: JSON.stringify({ breakdown }),
  })
}

export async function listSurveys(): Promise<SurveySummary[]> {
  return fetchJSON<SurveySummary[]>("/api/surveys")
}

export async function getSurvey(id: string): Promise<SurveySession> {
  return fetchJSON<SurveySession>(`/api/surveys/${id}`)
}
