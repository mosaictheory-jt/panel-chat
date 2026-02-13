import { useMemo } from "react"
import { Progress } from "@/components/ui/progress"
import { getAvatar } from "@/lib/avatar"
import { Check, Loader2 } from "lucide-react"
import type { Respondent, SurveyResponse } from "@/types"

interface PanelProgressProps {
  panel: Respondent[]
  responses: SurveyResponse[]
  totalExpected: number
  onSelectRespondent: (respondent: Respondent) => void
}

export function PanelProgress({
  panel,
  responses,
  totalExpected,
  onSelectRespondent,
}: PanelProgressProps) {
  const respondedIds = useMemo(() => {
    const ids = new Set<number>()
    for (const r of responses) {
      ids.add(r.respondent_id)
    }
    return ids
  }, [responses])

  const progressPercent = totalExpected > 0
    ? Math.round((responses.length / totalExpected) * 100)
    : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Surveying Panel</h3>
          <p className="text-xs text-muted-foreground">
            {responses.length} of {totalExpected} responses collected
          </p>
        </div>
        <span className="text-sm font-medium tabular-nums">{progressPercent}%</span>
      </div>

      <Progress value={progressPercent} className="h-2" />

      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {panel.map((respondent) => {
          const hasResponded = respondedIds.has(respondent.id)
          const avatar = getAvatar(respondent.id, respondent.role)

          return (
            <button
              key={respondent.id}
              onClick={() => onSelectRespondent(respondent)}
              className={`relative flex items-start gap-2.5 rounded-lg border p-3 text-left text-xs transition-all duration-300 hover:shadow-md ${
                hasResponded
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-border bg-card animate-pulse-subtle"
              }`}
            >
              {/* Avatar */}
              <div className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 text-lg ${avatar.colorClass}`}>
                {avatar.emoji}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium truncate pr-5">
                  {respondent.role || "Unknown Role"}
                </p>
                <p className="text-muted-foreground truncate">
                  {respondent.industry || "Unknown Industry"}
                </p>
                {respondent.region && (
                  <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground mt-1">
                    {respondent.region}
                  </span>
                )}
              </div>

              {/* Status indicator */}
              <div className="absolute top-2 right-2">
                {hasResponded ? (
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white">
                    <Check className="w-3 h-3" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted">
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
