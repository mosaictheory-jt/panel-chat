import { create } from "zustand"
import type {
  ApiKeys,
  CompletedSurvey,
  QuestionBreakdown,
  Respondent,
  SurveyResponse,
  SurveySummary,
  SurveyPhase,
  Filters,
} from "@/types"

const STORAGE_KEY_ANTHROPIC = "panel-chat-key-anthropic"
const STORAGE_KEY_OPENAI = "panel-chat-key-openai"
const STORAGE_KEY_GOOGLE = "panel-chat-key-google"
const STORAGE_KEY_MODELS = "panel-chat-selected-models"
const STORAGE_KEY_ANALYZER = "panel-chat-analyzer-model"

function loadApiKeys(): ApiKeys {
  return {
    anthropic: localStorage.getItem(STORAGE_KEY_ANTHROPIC) || "",
    openai: localStorage.getItem(STORAGE_KEY_OPENAI) || "",
    google: localStorage.getItem(STORAGE_KEY_GOOGLE) || "",
  }
}

function loadSelectedModels(): string[] {
  const stored = localStorage.getItem(STORAGE_KEY_MODELS)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return []
    }
  }
  return []
}

interface SurveyState {
  // Settings
  apiKeys: ApiKeys
  selectedModels: string[]
  analyzerModel: string
  panelSize: number
  settingsOpen: boolean
  setApiKey: (provider: keyof ApiKeys, key: string) => void
  setSelectedModels: (models: string[]) => void
  setAnalyzerModel: (model: string) => void
  setPanelSize: (size: number) => void
  setSettingsOpen: (open: boolean) => void
  hasRequiredSettings: () => boolean

  // Filters
  filters: Filters
  setFilter: (key: keyof Filters, values: string[]) => void
  clearFilters: () => void

  // Survey state
  phase: SurveyPhase
  surveyId: string | null
  question: string | null
  panel: Respondent[]
  surveyModels: string[]
  breakdown: QuestionBreakdown | null
  responses: SurveyResponse[]
  error: string | null

  // Actions
  startAnalysis: (id: string, question: string, panel: Respondent[], models: string[]) => void
  setBreakdown: (breakdown: QuestionBreakdown) => void
  startRunning: () => void
  addResponse: (response: SurveyResponse) => void
  setSurveyDone: () => void
  setError: (error: string) => void
  reset: () => void

  // History
  history: SurveySummary[]
  setHistory: (history: SurveySummary[]) => void

  // Accumulated results
  completedSurveys: Record<string, CompletedSurvey>
  visibleSurveyIds: string[]
  addCompletedSurvey: (survey: CompletedSurvey) => void
  toggleSurveyVisibility: (id: string) => void
  removeSurveyFromResults: (id: string) => void

  // Load past survey
  loadSurvey: (
    id: string,
    question: string,
    panel: Respondent[],
    breakdown: QuestionBreakdown | null,
    responses: SurveyResponse[],
    models: string[],
  ) => void
}

export const useSurveyStore = create<SurveyState>((set, get) => ({
  apiKeys: loadApiKeys(),
  selectedModels: loadSelectedModels(),
  analyzerModel: localStorage.getItem(STORAGE_KEY_ANALYZER) || "",
  panelSize: 5,
  settingsOpen: !loadApiKeys().anthropic && !loadApiKeys().openai && !loadApiKeys().google,

  setApiKey: (provider, key) => {
    const storageMap: Record<keyof ApiKeys, string> = {
      anthropic: STORAGE_KEY_ANTHROPIC,
      openai: STORAGE_KEY_OPENAI,
      google: STORAGE_KEY_GOOGLE,
    }
    localStorage.setItem(storageMap[provider], key)
    set((state) => ({
      apiKeys: { ...state.apiKeys, [provider]: key },
    }))
  },

  setSelectedModels: (models) => {
    localStorage.setItem(STORAGE_KEY_MODELS, JSON.stringify(models))
    set({ selectedModels: models })
  },

  setAnalyzerModel: (model) => {
    localStorage.setItem(STORAGE_KEY_ANALYZER, model)
    set({ analyzerModel: model })
  },

  setPanelSize: (size) => set({ panelSize: size }),

  setSettingsOpen: (open) => set({ settingsOpen: open }),

  hasRequiredSettings: () => {
    const state = get()
    const hasKey = Object.values(state.apiKeys).some((k) => k.length > 0)
    if (!hasKey || state.selectedModels.length === 0) return false
    // At least one selected model must have a matching API key
    return state.selectedModels.some((model) => {
      const provider = _getProvider(model)
      return provider ? state.apiKeys[provider].length > 0 : false
    })
  },

  filters: {},
  setFilter: (key, values) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: values.length > 0 ? values : undefined,
      },
    })),
  clearFilters: () => set({ filters: {} }),

  phase: "idle",
  surveyId: null,
  question: null,
  panel: [],
  surveyModels: [],
  breakdown: null,
  responses: [],
  error: null,

  startAnalysis: (id, question, panel, models) =>
    set({
      phase: "analyzing",
      surveyId: id,
      question,
      panel,
      surveyModels: models,
      breakdown: null,
      responses: [],
      error: null,
    }),

  setBreakdown: (breakdown) =>
    set({ breakdown, phase: "reviewing" }),

  startRunning: () =>
    set({ phase: "running" }),

  addResponse: (response) =>
    set((state) => ({
      responses: [...state.responses, response],
    })),

  setSurveyDone: () => {
    const state = get()
    const updates: Partial<SurveyState> = { phase: "complete" }

    // Auto-add to completed surveys if we have the required data
    if (state.surveyId && state.question && state.breakdown) {
      const completed: CompletedSurvey = {
        id: state.surveyId,
        question: state.question,
        breakdown: state.breakdown,
        responses: state.responses,
        panel: state.panel,
      }
      updates.completedSurveys = {
        ...state.completedSurveys,
        [state.surveyId]: completed,
      }
      if (!state.visibleSurveyIds.includes(state.surveyId)) {
        updates.visibleSurveyIds = [...state.visibleSurveyIds, state.surveyId]
      }
    }

    set(updates)
  },

  setError: (error) =>
    set({ error, phase: "idle" }),

  reset: () =>
    set({
      phase: "idle",
      surveyId: null,
      question: null,
      panel: [],
      surveyModels: [],
      breakdown: null,
      responses: [],
      error: null,
    }),

  history: [],
  setHistory: (history) => set({ history }),

  completedSurveys: {},
  visibleSurveyIds: [],

  addCompletedSurvey: (survey) =>
    set((state) => ({
      completedSurveys: {
        ...state.completedSurveys,
        [survey.id]: survey,
      },
      visibleSurveyIds: state.visibleSurveyIds.includes(survey.id)
        ? state.visibleSurveyIds
        : [...state.visibleSurveyIds, survey.id],
    })),

  toggleSurveyVisibility: (id) =>
    set((state) => ({
      visibleSurveyIds: state.visibleSurveyIds.includes(id)
        ? state.visibleSurveyIds.filter((v) => v !== id)
        : [...state.visibleSurveyIds, id],
    })),

  removeSurveyFromResults: (id) =>
    set((state) => ({
      visibleSurveyIds: state.visibleSurveyIds.filter((v) => v !== id),
    })),

  loadSurvey: (id, question, panel, breakdown, responses, models) => {
    const state = get()
    const updates: Partial<SurveyState> = {
      phase: responses.length > 0 ? "complete" : breakdown ? "reviewing" : "idle",
      surveyId: id,
      question,
      panel,
      surveyModels: models,
      breakdown,
      responses,
      error: null,
    }

    // Auto-add loaded surveys with results to the accumulated view
    if (breakdown && responses.length > 0) {
      const completed: CompletedSurvey = {
        id,
        question,
        breakdown,
        responses,
        panel,
      }
      updates.completedSurveys = {
        ...state.completedSurveys,
        [id]: completed,
      }
      if (!state.visibleSurveyIds.includes(id)) {
        updates.visibleSurveyIds = [...state.visibleSurveyIds, id]
      }
    }

    set(updates)
  },
}))

function _getProvider(model: string): keyof ApiKeys | null {
  if (model.startsWith("claude")) return "anthropic"
  if (model.startsWith("gpt") || model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4")) return "openai"
  if (model.startsWith("gemini")) return "google"
  return null
}
