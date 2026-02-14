import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DollarSign } from "lucide-react"
import {
  computeActualCost,
  estimateSurveyCost,
  formatCost,
  type CostEstimate,
} from "@/lib/pricing"
import type { SurveyResponse } from "@/types"

interface CostBadgeProps {
  responses: SurveyResponse[]
  models: string[]
  panelSize: number
  subQuestionCount: number
  totalExpected: number
  isComplete: boolean
}

export function CostBadge({
  responses,
  models,
  panelSize,
  subQuestionCount,
  totalExpected,
  isComplete,
}: CostBadgeProps) {
  const cost: CostEstimate & { isEstimated: boolean } = useMemo(() => {
    const hasTokenData = responses.some((r) => r.token_usage)

    if (isComplete && hasTokenData) {
      // All done — use actual token counts
      return { ...computeActualCost(responses), isEstimated: false }
    }

    if (hasTokenData && responses.length > 0) {
      // In-progress: actual cost for received + estimate for remaining
      const actual = computeActualCost(responses)
      const remaining = totalExpected - responses.length
      if (remaining > 0) {
        const estimate = estimateSurveyCost(models, panelSize, subQuestionCount)
        const perCallEstimate = estimate.totalCost / Math.max(totalExpected, 1)
        actual.totalCost += perCallEstimate * remaining
      }
      return { ...actual, isEstimated: true }
    }

    // No token data yet — pure estimate
    return { ...estimateSurveyCost(models, panelSize, subQuestionCount), isEstimated: true }
  }, [responses, models, panelSize, subQuestionCount, totalExpected, isComplete])

  if (cost.totalCost <= 0) return null

  const providerEntries = Object.entries(cost.perProvider)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`text-xs gap-1 cursor-default ${
              isComplete && !cost.isEstimated
                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400"
                : ""
            }`}
          >
            <DollarSign className="w-3 h-3" />
            <span className="tabular-nums">
              {cost.isEstimated ? "~" : ""}
              {formatCost(cost.totalCost)}
            </span>
            {cost.isEstimated && (
              <span className="text-muted-foreground text-[10px]">est.</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs space-y-1.5 max-w-72">
          <p className="font-semibold">
            {cost.isEstimated ? "Estimated cost" : "Actual cost"}
          </p>
          {providerEntries.length > 0 && (
            <div className="space-y-1">
              {providerEntries.map(([provider, data]) => (
                <div key={provider} className="flex justify-between gap-6">
                  <span>{provider} ({data.calls} calls)</span>
                  <span className="tabular-nums font-medium">
                    {formatCost(data.totalCost)}
                  </span>
                </div>
              ))}
              {providerEntries.length > 1 && (
                <div className="flex justify-between gap-6 border-t pt-1 font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {cost.isEstimated ? "~" : ""}
                    {formatCost(cost.totalCost)}
                  </span>
                </div>
              )}
            </div>
          )}
          {!cost.isEstimated && providerEntries.length > 0 && (
            <p className="text-muted-foreground border-t pt-1">
              Input: {formatCost(providerEntries.reduce((s, [, d]) => s + d.inputCost, 0))}
              {" · "}
              Output: {formatCost(providerEntries.reduce((s, [, d]) => s + d.outputCost, 0))}
            </p>
          )}
          {cost.isEstimated && (
            <p className="text-muted-foreground border-t pt-1">
              Based on estimated token counts. Actual cost may vary.
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
