import type { WSMessage } from "@/types"

const WS_BASE = "ws://localhost:8000"

export function connectDebateWS(
  debateId: string,
  apiKey: string,
  onMessage: (msg: WSMessage) => void,
  onClose?: () => void,
  onError?: (err: Event) => void
): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/ws/debates/${debateId}`)

  ws.onopen = () => {
    ws.send(JSON.stringify({ api_key: apiKey }))
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
