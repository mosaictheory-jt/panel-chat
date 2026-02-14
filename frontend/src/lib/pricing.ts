/** Per-million-token pricing for each model */
interface ModelPricing {
  inputPerMillion: number
  outputPerMillion: number
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic
  "claude-opus-4-6":            { inputPerMillion: 5.00,  outputPerMillion: 25.00 },
  "claude-sonnet-4-5-20250929": { inputPerMillion: 3.00,  outputPerMillion: 15.00 },
  "claude-haiku-4-5-20251001":  { inputPerMillion: 1.00,  outputPerMillion: 5.00  },

  // OpenAI
  "gpt-5.2":       { inputPerMillion: 1.75,  outputPerMillion: 14.00 },
  "gpt-4.1":       { inputPerMillion: 2.00,  outputPerMillion: 8.00  },
  "gpt-4.1-mini":  { inputPerMillion: 0.40,  outputPerMillion: 1.60  },
  "gpt-4.1-nano":  { inputPerMillion: 0.10,  outputPerMillion: 0.40  },
  "o3":            { inputPerMillion: 10.00, outputPerMillion: 40.00 },
  "o3-mini":       { inputPerMillion: 1.10,  outputPerMillion: 4.40  },
  "o4-mini":       { inputPerMillion: 1.10,  outputPerMillion: 4.40  },

  // Google
  "gemini-3-pro-preview":   { inputPerMillion: 2.00,  outputPerMillion: 12.00 },
  "gemini-3-flash-preview": { inputPerMillion: 0.50,  outputPerMillion: 3.00  },
  "gemini-2.5-pro":         { inputPerMillion: 1.25,  outputPerMillion: 10.00 },
  "gemini-2.5-flash":       { inputPerMillion: 0.30,  outputPerMillion: 2.50  },
  "gemini-2.5-flash-lite":  { inputPerMillion: 0.10,  outputPerMillion: 0.40  },
}

export function getModelPricing(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? { inputPerMillion: 0, outputPerMillion: 0 }
}

/** Estimate the system + user prompt token count for one panelist call. */
export function estimateInputTokens(subQuestionCount: number): number {
  // System prompt: ~250 tokens (persona template)
  // User prompt base: ~120 tokens (instructions + JSON format)
  // Per sub-question: ~30 tokens (id, text, 4 options avg)
  const SYSTEM_TOKENS = 250
  const USER_BASE_TOKENS = 120
  const PER_SQ_TOKENS = 30
  return SYSTEM_TOKENS + USER_BASE_TOKENS + (subQuestionCount * PER_SQ_TOKENS)
}

/** Estimate output tokens (JSON with one answer per sub-question). */
export function estimateOutputTokens(subQuestionCount: number): number {
  // JSON wrapper: ~10 tokens
  // Per answer: ~15 tokens (key + value + quotes + comma)
  return 10 + (subQuestionCount * 15)
}

export interface CostEstimate {
  totalCost: number
  perProvider: Record<string, { inputCost: number; outputCost: number; totalCost: number; calls: number }>
}

/** Estimate total cost for a survey run before execution. */
export function estimateSurveyCost(
  models: string[],
  panelSize: number,
  subQuestionCount: number,
): CostEstimate {
  const estInput = estimateInputTokens(subQuestionCount)
  const estOutput = estimateOutputTokens(subQuestionCount)

  const perProvider: CostEstimate["perProvider"] = {}
  let totalCost = 0

  for (const model of models) {
    const pricing = getModelPricing(model)
    const calls = panelSize
    const inputCost = (estInput / 1_000_000) * pricing.inputPerMillion * calls
    const outputCost = (estOutput / 1_000_000) * pricing.outputPerMillion * calls

    const provider = getProviderFromModel(model)
    if (!perProvider[provider]) {
      perProvider[provider] = { inputCost: 0, outputCost: 0, totalCost: 0, calls: 0 }
    }
    perProvider[provider].inputCost += inputCost
    perProvider[provider].outputCost += outputCost
    perProvider[provider].totalCost += inputCost + outputCost
    perProvider[provider].calls += calls
    totalCost += inputCost + outputCost
  }

  return { totalCost, perProvider }
}

/** Compute actual cost from real token usage across all responses. */
export function computeActualCost(
  responses: Array<{ model: string; token_usage?: { input_tokens: number; output_tokens: number } | null }>,
): CostEstimate {
  const perProvider: CostEstimate["perProvider"] = {}
  let totalCost = 0

  for (const resp of responses) {
    if (!resp.token_usage) continue
    const pricing = getModelPricing(resp.model)
    const inputCost = (resp.token_usage.input_tokens / 1_000_000) * pricing.inputPerMillion
    const outputCost = (resp.token_usage.output_tokens / 1_000_000) * pricing.outputPerMillion

    const provider = getProviderFromModel(resp.model)
    if (!perProvider[provider]) {
      perProvider[provider] = { inputCost: 0, outputCost: 0, totalCost: 0, calls: 0 }
    }
    perProvider[provider].inputCost += inputCost
    perProvider[provider].outputCost += outputCost
    perProvider[provider].totalCost += inputCost + outputCost
    perProvider[provider].calls += 1
    totalCost += inputCost + outputCost
  }

  return { totalCost, perProvider }
}

function getProviderFromModel(model: string): string {
  if (model.startsWith("claude")) return "Anthropic"
  if (model.startsWith("gpt") || model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4")) return "OpenAI"
  if (model.startsWith("gemini")) return "Google"
  return "Unknown"
}

/** Format a dollar amount for display. */
export function formatCost(cost: number): string {
  if (cost < 0.001) return "< $0.001"
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  if (cost < 1) return `$${cost.toFixed(3)}`
  return `$${cost.toFixed(2)}`
}
