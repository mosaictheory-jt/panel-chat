import { useMemo, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getAvatar } from "@/lib/avatar"
import { MessageSquare, Vote, Sparkles, ChevronLeft, ChevronRight } from "lucide-react"
import type { DebateMessage, RoundSummary, Respondent, SurveyResponse, QuestionBreakdown } from "@/types"
import ReactMarkdown from "react-markdown"

interface DebateTranscriptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: string
  debateMessages: DebateMessage[]
  roundSummaries: RoundSummary[]
  responses: SurveyResponse[]
  breakdown: QuestionBreakdown
  panel: Respondent[]
}

interface RoundData {
  number: number
  type: "discussion" | "vote"
  messages: DebateMessage[]
  summary: string | null
  votes: SurveyResponse[]
}

export function DebateTranscript({
  open,
  onOpenChange,
  question,
  debateMessages,
  roundSummaries,
  responses,
  breakdown,
  panel,
}: DebateTranscriptProps) {
  const [activeRound, setActiveRound] = useState(1)

  const respondentMap = useMemo(() => {
    const map = new Map<number, Respondent>()
    for (const r of panel) map.set(r.id, r)
    return map
  }, [panel])

  const rounds: RoundData[] = useMemo(() => {
    const maxRound = Math.max(
      ...debateMessages.map((m) => m.round),
      ...roundSummaries.map((s) => s.round),
      ...responses.filter((r) => r.round).map((r) => r.round!),
      0,
    )

    const result: RoundData[] = []

    for (let i = 1; i <= maxRound; i++) {
      const msgs = debateMessages.filter((m) => m.round === i)
      const summary = roundSummaries.find((s) => s.round === i)?.summary ?? null
      const votes = responses.filter((r) => r.round === i)

      result.push({
        number: i,
        type: votes.length > 0 ? "vote" : "discussion",
        messages: msgs,
        summary,
        votes,
      })
    }

    const votesWithoutRound = responses.filter((r) => !r.round)
    if (votesWithoutRound.length > 0 && result.every((r) => r.votes.length === 0)) {
      result.push({
        number: maxRound + 1,
        type: "vote",
        messages: [],
        summary: null,
        votes: votesWithoutRound,
      })
    }

    return result
  }, [debateMessages, roundSummaries, responses])

  const sqLookup = useMemo(() => {
    const map = new Map<string, string>()
    for (const sq of breakdown.sub_questions) {
      map.set(sq.id, sq.text)
    }
    return map
  }, [breakdown])

  const currentRound = rounds.find((r) => r.number === activeRound) ?? rounds[0]
  const totalRounds = rounds.length
  const canPrev = activeRound > 1
  const canNext = activeRound < totalRounds

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg !gap-0 overflow-hidden flex flex-col">
        {/* Fixed header */}
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle className="text-base">Debate Transcript</SheetTitle>
          <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{question}</p>
        </SheetHeader>

        {/* Round navigator — fixed */}
        {totalRounds > 0 && (
          <div className="px-5 py-3 border-b shrink-0 bg-muted/30">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={!canPrev}
                onClick={() => setActiveRound((r) => r - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex gap-1 flex-wrap justify-center flex-1">
                {rounds.map((round) => (
                  <button
                    key={round.number}
                    onClick={() => setActiveRound(round.number)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                      round.number === activeRound
                        ? round.type === "vote"
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                          : "bg-primary/15 text-primary ring-1 ring-primary/30"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    {round.type === "vote" ? (
                      <Vote className="w-3 h-3" />
                    ) : (
                      <MessageSquare className="w-3 h-3" />
                    )}
                    {round.type === "vote" ? "Vote" : `R${round.number}`}
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={!canNext}
                onClick={() => setActiveRound((r) => r + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Scrollable round content */}
        <div className="flex-1 overflow-y-auto">
          {currentRound && (
            <div className="px-5 py-4 space-y-3">
              {/* Round heading */}
              <div className="flex items-center gap-2">
                {currentRound.type === "vote" ? (
                  <Badge className="gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-xs">
                    <Vote className="w-3 h-3" />
                    Final Vote
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <MessageSquare className="w-3 h-3" />
                    Round {currentRound.number} Discussion
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {currentRound.type === "vote"
                    ? `${currentRound.votes.length} votes`
                    : `${currentRound.messages.length} responses`}
                </span>
              </div>

              {/* Discussion messages */}
              {currentRound.messages.map((msg, idx) => {
                const respondent = respondentMap.get(msg.respondent_id)
                const avatar = getAvatar(msg.respondent_id, respondent?.role ?? null)
                return (
                  <div
                    key={`${msg.respondent_id}-${msg.round}-${idx}`}
                    className="flex gap-2.5 rounded-lg border bg-card p-3"
                  >
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-sm ${avatar.colorClass}`}>
                      {avatar.emoji}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium">
                          {respondent?.role || msg.agent_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {respondent?.industry}
                        </span>
                      </div>
                      <div className="text-xs text-foreground/90 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Round summary */}
              {currentRound.summary && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-xs font-medium text-primary">Moderator Summary</span>
                  </div>
                  <div className="text-xs text-foreground/80 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{currentRound.summary}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Final vote results */}
              {currentRound.votes.length > 0 && (
                <div className="space-y-2">
                  {currentRound.votes.map((vote) => {
                    const respondent = respondentMap.get(vote.respondent_id)
                    const avatar = getAvatar(vote.respondent_id, respondent?.role ?? null)
                    return (
                      <div
                        key={vote.id}
                        className="flex gap-2.5 rounded-lg border bg-emerald-500/5 p-2.5"
                      >
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 text-xs ${avatar.colorClass}`}>
                          {avatar.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] font-medium">
                            {respondent?.role || vote.agent_name}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(vote.answers).map(([sqId, answer]) => (
                              <Badge key={sqId} variant="secondary" className="text-[9px] gap-0.5">
                                <span className="text-muted-foreground">{sqLookup.get(sqId) ?? sqId}:</span>
                                {" "}{answer}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {currentRound.messages.length === 0 && currentRound.votes.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Waiting for responses...
                </p>
              )}
            </div>
          )}

          {rounds.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              No debate data yet.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
