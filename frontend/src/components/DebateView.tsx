import { useEffect, useRef } from "react"
import { useDebateStore } from "@/store/debateStore"
import { RoundView } from "./RoundView"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Loader2 } from "lucide-react"
import type { AgentMessage } from "@/types"

export function DebateView() {
  const { question, panel, messages, isRunning, error } = useDebateStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  if (!question) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
        <MessageSquare className="w-16 h-16 opacity-30" />
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Panel Chat</h2>
          <p className="text-sm max-w-md">
            Ask a question and AI agents representing real data engineering survey
            respondents will debate it from their unique perspectives.
          </p>
        </div>
      </div>
    )
  }

  // Group messages by round
  const rounds = new Map<number, AgentMessage[]>()
  for (const msg of messages) {
    const existing = rounds.get(msg.round_num) || []
    existing.push(msg)
    rounds.set(msg.round_num, existing)
  }

  const sortedRounds = Array.from(rounds.entries()).sort(
    ([a], [b]) => a - b
  )

  return (
    <div className="space-y-6 pb-4">
      {/* Question banner */}
      <div className="bg-primary/5 border rounded-lg p-4">
        <p className="font-semibold text-lg">{question}</p>
        <div className="flex gap-2 mt-2 flex-wrap">
          {panel.map((p) => {
            const name = [
              p.role || "Unknown",
              p.industry ? `@ ${p.industry}` : "",
            ]
              .filter(Boolean)
              .join(" ")
            return (
              <Badge key={p.id} variant="outline" className="text-xs">
                {name}
              </Badge>
            )
          })}
        </div>
      </div>

      {/* Rounds */}
      {sortedRounds.map(([roundNum, msgs]) => (
        <RoundView key={roundNum} roundNum={roundNum} messages={msgs} />
      ))}

      {/* Loading indicator */}
      {isRunning && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Agents are thinking...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
