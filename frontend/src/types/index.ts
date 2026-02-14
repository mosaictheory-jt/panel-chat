export interface Respondent {
  id: number
  role: string | null
  org_size: string | null
  industry: string | null
  team_focus: string | null
  storage_environment: string | null
  orchestration: string | null
  ai_usage_frequency: string | null
  ai_helps_with: string | null
  ai_adoption: string | null
  modeling_approach: string | null
  modeling_pain_points: string | null
  architecture_trend: string | null
  biggest_bottleneck: string | null
  team_growth_2026: string | null
  education_topic: string | null
  industry_wish: string | null
  region: string | null
}

export interface FilterOptions {
  role: string[]
  org_size: string[]
  industry: string[]
  region: string[]
  ai_usage_frequency: string[]
  architecture_trend: string[]
}

export interface Filters {
  role?: string[]
  org_size?: string[]
  industry?: string[]
  region?: string[]
  ai_usage_frequency?: string[]
  architecture_trend?: string[]
}

// Survey types

export interface SubQuestion {
  id: string
  text: string
  answer_options: string[]
  chart_type: "bar" | "pie"
}

export interface QuestionBreakdown {
  original_question: string
  sub_questions: SubQuestion[]
}

export interface TokenUsage {
  input_tokens: number
  output_tokens: number
}

export interface SurveyResponse {
  id: string
  survey_id: string
  respondent_id: number
  agent_name: string
  model: string
  answers: Record<string, string> // sub_question_id -> chosen option
  round?: number | null
  token_usage?: TokenUsage | null
}

export interface DebateTheme {
  label: string
  description: string
  respondent_ids: number[]
  key_arguments: string[]
  sentiment: "positive" | "negative" | "mixed" | "neutral"
}

export interface DebateAnalysis {
  themes: DebateTheme[]
  consensus_points: string[]
  key_tensions: string[]
  synthesis: string
  token_usage?: TokenUsage | null
}

export interface DebateMessage {
  respondent_id: number
  agent_name: string
  model: string
  round: number
  text: string
  token_usage?: TokenUsage | null
}

export interface RoundSummary {
  round: number
  totalRounds: number
  summary: string
}

export interface SurveySession {
  id: string
  question: string
  breakdown: QuestionBreakdown | null
  panel_size: number
  filters: Filters | null
  models: string[]
  panel: Respondent[]
  responses: SurveyResponse[]
  chat_mode: string | null
  debate_messages: DebateMessage[]
  round_summaries: RoundSummary[]
  debate_analysis: DebateAnalysis | null
  created_at: string | null
}

export interface SurveySummary {
  id: string
  question: string
  panel_size: number
  created_at: string | null
}

export interface CompletedSurvey {
  id: string
  question: string
  breakdown: QuestionBreakdown | null
  responses: SurveyResponse[]
  panel: Respondent[]
  debateMessages?: DebateMessage[]
  roundSummaries?: RoundSummary[]
  debateAnalysis?: DebateAnalysis | null
}

export interface WSMessage {
  type: "survey_response" | "survey_done" | "round_complete" | "debate_message" | "debate_analysis" | "error"
  data: Record<string, unknown>
}

export type ChatMode = "survey" | "debate"

export interface ApiKeys {
  anthropic: string
  openai: string
  google: string
}

export type SurveyPhase = "idle" | "analyzing" | "reviewing" | "running" | "complete"

export const MODEL_OPTIONS = [
  // Anthropic — max temperature 1.0
  { value: "claude-opus-4-6", label: "Claude Opus 4.6", provider: "Anthropic", maxTemp: 1.0 },
  { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5", provider: "Anthropic", maxTemp: 1.0 },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", provider: "Anthropic", maxTemp: 1.0 },

  // OpenAI — max temperature 2.0 (reasoning models fixed at 1.0)
  { value: "gpt-5.2", label: "GPT-5.2", provider: "OpenAI", maxTemp: 2.0 },
  { value: "gpt-4.1", label: "GPT-4.1", provider: "OpenAI", maxTemp: 2.0 },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", provider: "OpenAI", maxTemp: 2.0 },
  { value: "gpt-4.1-nano", label: "GPT-4.1 Nano", provider: "OpenAI", maxTemp: 2.0 },
  { value: "o3", label: "o3", provider: "OpenAI", maxTemp: 1.0 },
  { value: "o3-mini", label: "o3 Mini", provider: "OpenAI", maxTemp: 1.0 },
  { value: "o4-mini", label: "o4 Mini", provider: "OpenAI", maxTemp: 1.0 },

  // Google — max temperature 2.0
  { value: "gemini-3-pro-preview", label: "Gemini 3 Pro", provider: "Google", maxTemp: 2.0 },
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash", provider: "Google", maxTemp: 2.0 },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "Google", maxTemp: 2.0 },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google", maxTemp: 2.0 },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", provider: "Google", maxTemp: 2.0 },
] as const

export const PROVIDER_NAMES = ["Anthropic", "OpenAI", "Google"] as const
export type ProviderName = (typeof PROVIDER_NAMES)[number]

export function getProviderKey(provider: ProviderName): keyof ApiKeys {
  const map: Record<ProviderName, keyof ApiKeys> = {
    Anthropic: "anthropic",
    OpenAI: "openai",
    Google: "google",
  }
  return map[provider]
}

export function getModelProvider(modelValue: string): ProviderName {
  return MODEL_OPTIONS.find((m) => m.value === modelValue)?.provider ?? "Anthropic"
}

export function getModelMaxTemp(modelValue: string): number {
  return MODEL_OPTIONS.find((m) => m.value === modelValue)?.maxTemp ?? 1.0
}
