import { create } from "zustand"
import type { AgentMessage, DebateSummary, Filters, Respondent } from "@/types"

interface DebateState {
  // Settings
  panelSize: number
  numRounds: number
  llmProvider: "anthropic" | "openai"
  setPanelSize: (size: number) => void
  setNumRounds: (rounds: number) => void
  setLlmProvider: (provider: "anthropic" | "openai") => void

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

export const useDebateStore = create<DebateState>((set) => ({
  panelSize: 5,
  numRounds: 2,
  llmProvider: "anthropic",
  setPanelSize: (size) => set({ panelSize: size }),
  setNumRounds: (rounds) => set({ numRounds: rounds }),
  setLlmProvider: (provider) => set({ llmProvider: provider }),

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
