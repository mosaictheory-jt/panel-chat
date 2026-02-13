import { useCallback, useRef } from "react"
import { createDebate, listDebates } from "@/api/client"
import { connectDebateWS } from "@/api/ws"
import { useDebateStore } from "@/store/debateStore"
import type { AgentMessage, WSMessage } from "@/types"

export function useDebate() {
  const store = useDebateStore()
  const wsRef = useRef<WebSocket | null>(null)

  const refreshHistory = useCallback(async () => {
    try {
      const debates = await listDebates()
      store.setHistory(debates)
    } catch {
      // ignore
    }
  }, [store])

  const startDebate = useCallback(
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

      const session = await createDebate({
        question,
        panel_size: store.panelSize,
        num_rounds: store.numRounds,
        filters: Object.keys(activeFilters).length > 0 ? activeFilters : null,
        model: store.model,
        api_key: store.apiKey,
      })

      store.startDebate(session.id, question, session.panel as never[])

      // Connect WebSocket
      const ws = connectDebateWS(
        session.id,
        store.apiKey,
        (msg: WSMessage) => {
          switch (msg.type) {
            case "agent_response": {
              const data = msg.data as unknown as AgentMessage
              store.addMessage(data)
              break
            }
            case "round_done": {
              const roundNum = msg.data.round_num as number
              store.setRoundDone(roundNum)
              break
            }
            case "debate_done": {
              store.setDebateDone()
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
        }
      )

      wsRef.current = ws
    },
    [store, refreshHistory]
  )

  return { startDebate, refreshHistory }
}
