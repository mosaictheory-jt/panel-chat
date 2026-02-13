import { create } from "zustand"
import type { AgentMessage, DebateSummary, Filters, Respondent } from "@/types"

const STORAGE_KEY_API_KEY = "panel-chat-api-key"
const STORAGE_KEY_MODEL = "panel-chat-model"

interface DebateState {
  // Settings
  panelSize: number
  numRounds: number
  model: string
  apiKey: string
  settingsOpen: boolean
  setPanelSize: (size: number) => void
  setNumRounds: (rounds: number) => void
  setModel: (model: string) => void
  setApiKey: (apiKey: string) => void
  setSettingsOpen: (open: boolean) => void
  hasRequiredSettings: () => boolean

  // Filters
  filters: Filters
  setFilter: (key: keyof Filters, values: string[]) => void
  clearFilters: () => void

  // Current debate
  debateId: string | null
  question: string | null
  panel: Respondent[]
  messages: AgentMessage[]
  currentRound: number
  isRunning: boolean
  error: string | null

  startDebate: (id: string, question: string, panel: Respondent[]) => void
  addMessage: (msg: AgentMessage) => void
  setRoundDone: (roundNum: number) => void
  setDebateDone: () => void
  setError: (error: string) => void
  reset: () => void

  // History
  history: DebateSummary[]
  setHistory: (history: DebateSummary[]) => void

  // Loaded debate (for viewing past debates)
  loadDebate: (
    id: string,
    question: string,
    panel: Respondent[],
    messages: AgentMessage[]
  ) => void
}

export const useDebateStore = create<DebateState>((set, get) => ({
  panelSize: 5,
  numRounds: 2,
  model: localStorage.getItem(STORAGE_KEY_MODEL) || "claude-sonnet-4-20250514",
  apiKey: localStorage.getItem(STORAGE_KEY_API_KEY) || "",
  settingsOpen: !localStorage.getItem(STORAGE_KEY_API_KEY),
  setPanelSize: (size) => set({ panelSize: size }),
  setNumRounds: (rounds) => set({ numRounds: rounds }),
  setModel: (model) => {
    localStorage.setItem(STORAGE_KEY_MODEL, model)
    set({ model })
  },
  setApiKey: (apiKey) => {
    localStorage.setItem(STORAGE_KEY_API_KEY, apiKey)
    set({ apiKey })
  },
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  hasRequiredSettings: () => get().apiKey.length > 0,

  filters: {},
  setFilter: (key, values) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: values.length > 0 ? values : undefined,
      },
    })),
  clearFilters: () => set({ filters: {} }),

  debateId: null,
  question: null,
  panel: [],
  messages: [],
  currentRound: 0,
  isRunning: false,
  error: null,

  startDebate: (id, question, panel) =>
    set({
      debateId: id,
      question,
      panel,
      messages: [],
      currentRound: 1,
      isRunning: true,
      error: null,
    }),

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),

  setRoundDone: (roundNum) =>
    set({ currentRound: roundNum + 1 }),

  setDebateDone: () =>
    set({ isRunning: false }),

  setError: (error) =>
    set({ error, isRunning: false }),

  reset: () =>
    set({
      debateId: null,
      question: null,
      panel: [],
      messages: [],
      currentRound: 0,
      isRunning: false,
      error: null,
    }),

  history: [],
  setHistory: (history) => set({ history }),

  loadDebate: (id, question, panel, messages) =>
    set({
      debateId: id,
      question,
      panel,
      messages,
      currentRound: 0,
      isRunning: false,
      error: null,
    }),
}))
