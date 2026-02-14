import type { Respondent } from "@/types"

/**
 * Technical Persona Radar — six dimensions derived from survey profile data.
 *
 * Each dimension is scored 1–5 based on the respondent's actual field values.
 * The framework loosely draws from the Technology Adoption Lifecycle,
 * Conway's Law (team structure ↔ system design), and practitioner archetypes
 * common in data engineering communities.
 */

export interface PersonaTrait {
  dimension: string
  score: number          // 1–5
  label: string          // human-readable explanation of their score
}

export interface PersonaProfile {
  traits: PersonaTrait[]
  archetype: string      // a short label like "Pragmatic Innovator"
}

// ── Dimension scorers ────────────────────────────────────────────────

function scoreInnovationDrive(r: Respondent): PersonaTrait {
  let score = 3
  const arch = (r.architecture_trend ?? "").toLowerCase()
  const adoption = (r.ai_adoption ?? "").toLowerCase()

  // Architecture signals
  if (arch.includes("lakehouse") || arch.includes("event-driven") || arch.includes("mesh") || arch.includes("federated")) score += 1
  if (arch.includes("warehouse") && !arch.includes("lakehouse") && !arch.includes("migrat")) score -= 1
  if (arch.includes("open format") || arch.includes("ontology")) score += 1

  // AI adoption signals
  if (adoption.includes("embedded") || adoption.includes("platform")) score += 1
  if (adoption.includes("no meaningful") || adoption.includes("experimenting")) score -= 1

  return {
    dimension: "Innovation",
    score: clamp(score),
    label: score >= 4 ? "Early adopter, chases the cutting edge" : score <= 2 ? "Prefers proven, stable patterns" : "Selectively adopts new approaches",
  }
}

function scoreAiAffinity(r: Respondent): PersonaTrait {
  let score = 3
  const freq = (r.ai_usage_frequency ?? "").toLowerCase()
  const adoption = (r.ai_adoption ?? "").toLowerCase()

  if (freq.includes("multiple times")) score += 2
  else if (freq.includes("daily")) score += 1
  else if (freq.includes("never") || freq.includes("rarely")) score -= 2
  else if (freq.includes("weekly")) score += 0

  if (adoption.includes("embedded") || adoption.includes("platform")) score += 1
  if (adoption.includes("no meaningful")) score -= 1

  return {
    dimension: "AI Affinity",
    score: clamp(score),
    label: score >= 4 ? "AI-native, deeply integrated into workflow" : score <= 2 ? "Skeptical or minimal AI usage" : "Pragmatic AI user",
  }
}

function scoreScaleOrientation(r: Respondent): PersonaTrait {
  let score = 3
  const org = (r.org_size ?? "").toLowerCase()
  const growth = (r.team_growth_2026 ?? "").toLowerCase()

  if (org.includes("10,000") || org.includes("1,000")) score += 1
  if (org.includes("< 50") || org.includes("50–199")) score -= 1

  if (growth.includes("grow")) score += 1
  if (growth.includes("shrink")) score -= 1

  return {
    dimension: "Scale",
    score: clamp(score),
    label: score >= 4 ? "Thinks in large-scale, distributed systems" : score <= 2 ? "Lean teams, focused scope" : "Mid-scale, balanced approach",
  }
}

function scoreMethodicalRigor(r: Respondent): PersonaTrait {
  let score = 3
  const modeling = (r.modeling_approach ?? "").toLowerCase()

  if (modeling.includes("kimball") || modeling.includes("data vault") || modeling.includes("inmon") || modeling.includes("3nf") || modeling.includes("dimensional")) score += 1
  if (modeling.includes("vault") && modeling.includes("kimball")) score += 1
  if (modeling.includes("ad-hoc") || modeling.includes("one big table") || modeling.includes("swamp") || modeling.includes("no data model")) score -= 1
  if (modeling.includes("semantic") || modeling.includes("canonical") || modeling.includes("knowledge graph")) score += 1

  return {
    dimension: "Rigor",
    score: clamp(score),
    label: score >= 4 ? "Disciplined modeler, values structure" : score <= 2 ? "Move fast, model later" : "Balanced modeling approach",
  }
}

function scoreGrowthMindset(r: Respondent): PersonaTrait {
  let score = 3
  const edu = (r.education_topic ?? "").toLowerCase()
  const growth = (r.team_growth_2026 ?? "").toLowerCase()
  const wish = (r.industry_wish ?? "").toLowerCase()

  if (edu.length > 0) score += 1
  if (growth.includes("grow")) score += 1
  if (growth.includes("shrink")) score -= 1

  if (wish.includes("learn") || wish.includes("education") || wish.includes("standard") || wish.includes("better")) score += 1

  return {
    dimension: "Growth",
    score: clamp(score),
    label: score >= 4 ? "Always learning, invests in skills" : score <= 2 ? "Focused on current expertise" : "Steady learner",
  }
}

function scorePragmatism(r: Respondent): PersonaTrait {
  let score = 3
  const bottleneck = (r.biggest_bottleneck ?? "").toLowerCase()
  const painPoints = (r.modeling_pain_points ?? "").toLowerCase()
  const arch = (r.architecture_trend ?? "").toLowerCase()

  // People who feel pain deeply and focus on what works are pragmatists
  if (bottleneck.length > 20) score += 1  // detailed bottleneck = awareness
  if (painPoints.length > 20) score += 1

  // Centralized/simple = pragmatic; bleeding edge = idealistic
  if (arch.includes("warehouse") && !arch.includes("lakehouse")) score += 1
  if (arch.includes("mesh") || arch.includes("event-driven")) score -= 1
  if (arch.includes("depends") || arch.includes("works") || arch.includes("mixed")) score += 1

  return {
    dimension: "Pragmatism",
    score: clamp(score),
    label: score >= 4 ? "Results-driven, ships what works" : score <= 2 ? "Idealist, pursues elegant solutions" : "Balances ideals with practicality",
  }
}

// ── Main entry ───────────────────────────────────────────────────────

export function computePersonaProfile(respondent: Respondent): PersonaProfile {
  const traits: PersonaTrait[] = [
    scoreInnovationDrive(respondent),
    scoreAiAffinity(respondent),
    scoreScaleOrientation(respondent),
    scoreMethodicalRigor(respondent),
    scoreGrowthMindset(respondent),
    scorePragmatism(respondent),
  ]

  const archetype = deriveArchetype(traits)

  return { traits, archetype }
}

// ── Archetype derivation ─────────────────────────────────────────────

function deriveArchetype(traits: PersonaTrait[]): string {
  const lookup = Object.fromEntries(traits.map((t) => [t.dimension, t.score]))
  const innovation = lookup["Innovation"] ?? 3
  const ai = lookup["AI Affinity"] ?? 3
  const rigor = lookup["Rigor"] ?? 3
  const pragmatism = lookup["Pragmatism"] ?? 3
  const scale = lookup["Scale"] ?? 3
  const growth = lookup["Growth"] ?? 3

  if (innovation >= 4 && ai >= 4) return "AI Pioneer"
  if (innovation >= 4 && rigor >= 4) return "Methodical Innovator"
  if (pragmatism >= 4 && rigor >= 4) return "Production Pragmatist"
  if (pragmatism >= 4 && scale >= 4) return "Scale Engineer"
  if (ai >= 4 && growth >= 4) return "AI-Curious Builder"
  if (rigor >= 4 && growth >= 4) return "Craft-Focused Learner"
  if (innovation <= 2 && pragmatism >= 4) return "Battle-Tested Realist"
  if (scale >= 4 && innovation >= 4) return "Platform Architect"
  if (growth >= 4 && innovation >= 4) return "Emerging Technologist"
  if (ai <= 2 && rigor >= 4) return "Classical Engineer"
  if (pragmatism <= 2 && innovation >= 4) return "Visionary Idealist"

  // Fallback — use the highest trait
  const highest = traits.reduce((a, b) => (a.score >= b.score ? a : b))
  const archetypeMap: Record<string, string> = {
    "Innovation": "Forward Thinker",
    "AI Affinity": "AI Enthusiast",
    "Scale": "Scale-Minded Builder",
    "Rigor": "Methodical Modeler",
    "Growth": "Continuous Learner",
    "Pragmatism": "Practical Engineer",
  }
  return archetypeMap[highest.dimension] ?? "Data Professional"
}

// ── Helpers ──────────────────────────────────────────────────────────

function clamp(value: number, min = 1, max = 5): number {
  return Math.max(min, Math.min(max, value))
}
