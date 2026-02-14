import { getAvatar } from "@/lib/avatar"
import { ChevronRight } from "lucide-react"
import type { Respondent, SurveyResponse, QuestionBreakdown } from "@/types"

interface ResponseCardProps {
  response: SurveyResponse
  respondent: Respondent | undefined
  breakdown: QuestionBreakdown | null
  historicalCount?: number
  onClick: () => void
}

export function ResponseCard({ response, respondent, breakdown, historicalCount, onClick }: ResponseCardProps) {
  const sqLookup = new Map(
    breakdown?.sub_questions.map((sq) => [sq.id, sq.text]) ?? []
  )

  const avatar = getAvatar(response.respondent_id, respondent?.role ?? null)

  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-2 rounded-lg border bg-card p-2.5 text-left text-xs transition-shadow hover:shadow-md"
    >
      <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-sm ${avatar.colorClass}`}>
        {avatar.emoji}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="font-medium truncate text-[11px] leading-tight">
            {respondent?.role || response.agent_name}
          </p>
          <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
        <p className="text-muted-foreground truncate text-[10px]">
          {[respondent?.industry, respondent?.region].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-1 space-y-0.5">
          {Object.entries(response.answers).map(([sqId, answer]) => (
            <p key={sqId} className="truncate text-[10px]">
              <span className="text-muted-foreground">{sqLookup.get(sqId) ?? sqId}: </span>
              <span className="font-medium">{answer}</span>
            </p>
          ))}
        </div>
        {historicalCount !== undefined && historicalCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground mt-0.5">
            +{historicalCount} past {historicalCount === 1 ? "survey" : "surveys"}
          </span>
        )}
      </div>
    </button>
  )
}
