import { useMemo } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getAvatar } from "@/lib/avatar"
import { MessageSquare, Vote, Sparkles } from "lucide-react"
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
  const respondentMap = useMemo(() => {
    const map = new Map<number, Respondent>()
    for (const r of panel) map.set(r.id, r)
    return map
  }, [panel])

  // Group messages by round
  const rounds = useMemo(() => {
    const maxRound = Math.max(
      ...debateMessages.map((m) => m.round),
      ...roundSummaries.map((s) => s.round),
      ...responses.filter((r) => r.round).map((r) => r.round!),
      0,
    )

    const result: Array<{
      number: number
      type: "discussion" | "vote"
      messages: DebateMessage[]
      summary: string | null
      votes: SurveyResponse[]
    }> = []

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

    // Include unrounded responses (final vote) if not already captured
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg !gap-0 overflow-hidden flex flex-col">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle className="text-base">Debate Transcript</SheetTitle>
          <p className="text-xs text-muted-foreground leading-snug">{question}</p>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-6">
            {rounds.map((round) => (
              <div key={round.number} className="space-y-3">
                {/* Round header */}
                <div className="flex items-center gap-2">
                  {round.type === "vote" ? (
                    <Badge className="gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-xs">
                      <Vote className="w-3 h-3" />
                      Final Vote
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <MessageSquare className="w-3 h-3" />
                      Round {round.number}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {round.type === "vote"
                      ? `${round.votes.length} votes`
                      : `${round.messages.length} responses`}
                  </span>
                </div>

                {/* Discussion messages */}
                {round.messages.map((msg, idx) => {
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
                {round.summary && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span className="text-xs font-medium text-primary">Round {round.number} Summary</span>
                    </div>
                    <div className="text-xs text-foreground/80 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{round.summary}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Final vote results */}
                {round.votes.length > 0 && (
                  <div className="space-y-2">
                    {round.votes.map((vote) => {
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

                {round.number < rounds.length && <Separator />}
              </div>
            ))}

            {rounds.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                No debate data yet.
              </p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
