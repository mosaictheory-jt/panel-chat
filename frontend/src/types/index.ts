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

export interface AgentMessage {
  id: string
  debate_id: string
  round_num: number
  respondent_id: number
  agent_name: string
  content: string
}

export interface DebateSession {
  id: string
  question: string
  panel_size: number
  num_rounds: number
  filters: Filters | null
  model: string
  panel: Respondent[]
  messages: AgentMessage[]
  created_at: string | null
}

export interface DebateSummary {
  id: string
  question: string
  panel_size: number
  num_rounds: number
  created_at: string | null
}

export interface WSMessage {
  type: "agent_response" | "round_done" | "debate_done" | "error"
  data: Record<string, unknown>
}

export interface DebateSettings {
  panelSize: number
  numRounds: number
  model: string
  apiKey: string
}

export const MODEL_OPTIONS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: "Anthropic" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", provider: "Anthropic" },
  { value: "gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "Google" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "Google" },
] as const
