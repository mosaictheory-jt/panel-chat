import { useCallback, useRef } from "react"
import { createSurvey, analyzeSurvey, submitBreakdown, listSurveys } from "@/api/client"
import { connectSurveyWS } from "@/api/ws"
import { useSurveyStore } from "@/store/surveyStore"
import type { QuestionBreakdown, SurveyResponse, WSMessage } from "@/types"
import { getModelProvider, getProviderKey } from "@/types"

export function useSurvey() {
  const store = useSurveyStore()
  const wsRef = useRef<WebSocket | null>(null)

  const refreshHistory = useCallback(async () => {
    try {
      const surveys = await listSurveys()
      store.setHistory(surveys)
    } catch {
      // ignore
    }
  }, [store])

  const startSurvey = useCallback(
    async (question: string) => {
      // Clean up existing WS
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }

      const activeFilters: Record<string, string[]> = {}
      for (const [key, values] of Object.entries(store.filters)) {
        if (values && values.length > 0) {
          activeFilters[key] = values
        }
      }

      // Create survey
      const session = await createSurvey({
        question,
        panel_size: store.panelSize,
        filters: Object.keys(activeFilters).length > 0 ? activeFilters : null,
        models: store.selectedModels,
        analyzer_model: store.analyzerModel,
      })

      store.startAnalysis(session.id, question, session.panel as never[], session.models)

      // Run analysis — find the API key for the analyzer model
      const analyzerProvider = getProviderKey(getModelProvider(store.analyzerModel))
      const analyzerApiKey = store.apiKeys[analyzerProvider]

      try {
        const breakdown = await analyzeSurvey(session.id, store.analyzerModel, analyzerApiKey)
        store.setBreakdown(breakdown)
      } catch (err) {
        store.setError(err instanceof Error ? err.message : "Analysis failed")
      }
    },
    [store],
  )

  const runSurvey = useCallback(
    async (breakdown: QuestionBreakdown) => {
      if (!store.surveyId) return

      // Clean up existing WS
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }

      // Submit the (possibly edited) breakdown
      await submitBreakdown(store.surveyId, breakdown)
      store.startRunning()

      // Connect WebSocket
      const ws = connectSurveyWS(
        store.surveyId,
        store.apiKeys,
        (msg: WSMessage) => {
          switch (msg.type) {
            case "survey_response": {
              const data = msg.data as unknown as SurveyResponse
              store.addResponse(data)
              break
            }
            case "survey_done": {
              store.setSurveyDone()
              refreshHistory()
              break
            }
            case "error": {
              store.setError(msg.data.message as string)
              break
            }
          }
        },
        () => {
          // onClose
        },
        () => {
          store.setError("WebSocket connection failed")
        },
      )

      wsRef.current = ws
    },
    [store, refreshHistory],
  )

  return { startSurvey, runSurvey, refreshHistory }
}
