import type { ApiKeys, WSMessage } from "@/types"

const WS_BASE = "ws://localhost:8000"

export function connectSurveyWS(
  surveyId: string,
  apiKeys: ApiKeys,
  temperatures: Record<string, number>,
  onMessage: (msg: WSMessage) => void,
  onClose?: () => void,
  onError?: (err: Event) => void,
): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/ws/surveys/${surveyId}`)

  ws.onopen = () => {
    // Send only keys that have values
    const keysToSend: Record<string, string> = {}
    for (const [provider, key] of Object.entries(apiKeys)) {
      if (key) keysToSend[provider] = key
    }
    ws.send(JSON.stringify({ api_keys: keysToSend, temperatures }))
  }

  ws.onmessage = (event) => {
    const msg: WSMessage = JSON.parse(event.data)
    onMessage(msg)
  }

  ws.onclose = () => {
    onClose?.()
  }

  ws.onerror = (err) => {
    onError?.(err)
  }

  return ws
}
