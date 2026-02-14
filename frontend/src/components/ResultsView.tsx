import { useMemo, useState } from "react"
import { SubQuestionChart } from "./SubQuestionChart"
import { DebateAnalysisView } from "./DebateAnalysisView"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getAvatar } from "@/lib/avatar"
import {
  CHART_THEMES,
  getChartTheme,
  getStoredChartThemeId,
  storeChartThemeId,
} from "@/lib/chartThemes"
import { computeActualCost, formatCost } from "@/lib/pricing"
import { X, EyeOff, Palette, DollarSign, MessageSquareText, Swords } from "lucide-react"
import type { CompletedSurvey, Respondent } from "@/types"

interface ResultsViewProps {
  surveys: CompletedSurvey[]
  onHideSurvey?: (surveyId: string) => void
  onRespondentClick?: (respondent: Respondent) => void
  onViewDebate?: (survey: CompletedSurvey) => void
}

export function ResultsView({
  surveys,
  onHideSurvey,
  onRespondentClick,
  onViewDebate,
}: ResultsViewProps) {
  const [drillDown, setDrillDown] = useState<{
    surveyId: string
    sqId: string
    option: string
  } | null>(null)

  const [themeId, setThemeId] = useState(getStoredChartThemeId)
  const [themePanelOpen, setThemePanelOpen] = useState(false)

  const chartTheme = getChartTheme(themeId)

  const handleThemeChange = (id: string) => {
    setThemeId(id)
    storeChartThemeId(id)
  }

  const handleOptionClick = (surveyId: string, sqId: string, option: string | null) => {
    if (!option) {
      setDrillDown(null)
    } else {
      setDrillDown({ surveyId, sqId, option })
    }
  }

  // Check if any surveys have charts (need theme picker)
  const hasChartSurveys = surveys.some((s) => s.breakdown && s.breakdown.sub_questions.length > 0)

  if (surveys.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        No results to display yet.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Theme picker — only when we have chart-based surveys */}
      {hasChartSurveys && (
        <>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setThemePanelOpen(!themePanelOpen)}
            >
              <Palette className="w-3.5 h-3.5" />
              {chartTheme.name}
            </Button>
          </div>

          {themePanelOpen && (
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Chart Color Theme</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {CHART_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeChange(theme.id)}
                    className={`rounded-lg border p-2 text-left transition-all hover:shadow-sm ${
                      theme.id === themeId
                        ? "ring-2 ring-primary border-primary"
                        : "border-border hover:border-foreground/20"
                    }`}
                  >
                    <div className="flex gap-0.5 mb-1.5">
                      {theme.colors.slice(0, 6).map((color, i) => (
                        <span
                          key={i}
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] font-medium">{theme.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Result groups — each survey renders as charts or debate analysis */}
      {surveys.map((survey) => {
        const isDebateSurvey = !!survey.debateAnalysis
        const isSurveySurvey = survey.breakdown && survey.breakdown.sub_questions.length > 0

        if (isDebateSurvey) {
          return (
            <DebateResultGroup
              key={survey.id}
              survey={survey}
              onHide={() => onHideSurvey?.(survey.id)}
              onRespondentClick={onRespondentClick}
              onViewTranscript={
                survey.debateMessages && survey.debateMessages.length > 0
                  ? () => onViewDebate?.(survey)
                  : undefined
              }
            />
          )
        }

        if (isSurveySurvey) {
          return (
            <SurveyResultGroup
              key={survey.id}
              survey={survey}
              colors={chartTheme.colors}
              drillDown={drillDown?.surveyId === survey.id ? drillDown : null}
              onOptionClick={(sqId, option) => handleOptionClick(survey.id, sqId, option)}
              onHide={() => onHideSurvey?.(survey.id)}
              onRespondentClick={onRespondentClick}
              onViewDebate={survey.debateMessages && survey.debateMessages.length > 0 ? () => onViewDebate?.(survey) : undefined}
            />
          )
        }

        // Fallback: survey with no breakdown and no analysis (shouldn't normally happen)
        return null
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Debate result group — wraps DebateAnalysisView with a header + hide button
// ---------------------------------------------------------------------------

interface DebateResultGroupProps {
  survey: CompletedSurvey
  onHide: () => void
  onRespondentClick?: (respondent: Respondent) => void
  onViewTranscript?: () => void
}

function DebateResultGroup({
  survey,
  onHide,
  onRespondentClick,
  onViewTranscript,
}: DebateResultGroupProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm leading-tight">{survey.question}</p>
            <Badge className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 gap-0.5 shrink-0">
              <Swords className="w-2.5 h-2.5" />
              Debate
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {survey.panel.length} panelists
            {survey.debateMessages && survey.debateMessages.length > 0 && (
              <> · {survey.debateMessages.length} messages</>
            )}
            {survey.debateAnalysis && (
              <> · {survey.debateAnalysis.themes.length} theme{survey.debateAnalysis.themes.length !== 1 ? "s" : ""}</>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
          onClick={onHide}
          title="Hide from results"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Analysis content */}
      {survey.debateAnalysis && (
        <DebateAnalysisView
          analysis={survey.debateAnalysis}
          panel={survey.panel}
          onRespondentClick={onRespondentClick}
          onViewTranscript={onViewTranscript}
        />
      )}
    </div>
  )
}

interface SurveyResultGroupProps {
  survey: CompletedSurvey
  colors: string[]
  drillDown: { sqId: string; option: string } | null
  onOptionClick: (sqId: string, option: string | null) => void
  onHide: () => void
  onRespondentClick?: (respondent: Respondent) => void
  onViewDebate?: () => void
}

function SurveyResultGroup({
  survey,
  colors,
  drillDown,
  onOptionClick,
  onHide,
  onRespondentClick,
  onViewDebate,
}: SurveyResultGroupProps) {
  const respondentMap = useMemo(() => {
    const map = new Map<number, Respondent>()
    for (const r of survey.panel) {
      map.set(r.id, r)
    }
    return map
  }, [survey.panel])

  const filteredResponses = useMemo(() => {
    if (!drillDown) return []
    return survey.responses.filter(
      (r) => r.answers[drillDown.sqId] === drillDown.option
    )
  }, [drillDown, survey.responses])

  const drillDownQuestion = drillDown && survey.breakdown
    ? survey.breakdown.sub_questions.find((sq) => sq.id === drillDown.sqId)
    : null

  const surveyCost = useMemo(
    () => computeActualCost(survey.responses),
    [survey.responses],
  )

  const providerEntries = Object.entries(surveyCost.perProvider)

  return (
    <div className="space-y-4">
      {/* Survey group header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-tight">{survey.question}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {survey.responses.length} responses · {survey.panel.length} panelists
            </p>
            {surveyCost.totalCost > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground cursor-default">
                      <DollarSign className="w-3 h-3" />
                      <span className="tabular-nums">{formatCost(surveyCost.totalCost)}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs space-y-1 max-w-64">
                    <p className="font-semibold">Actual cost</p>
                    {providerEntries.map(([provider, data]) => (
                      <div key={provider} className="flex justify-between gap-4">
                        <span>{provider} ({data.calls} calls)</span>
                        <span className="tabular-nums font-medium">{formatCost(data.totalCost)}</span>
                      </div>
                    ))}
                    <p className="text-muted-foreground border-t pt-1">
                      Input: {formatCost(providerEntries.reduce((s, [, d]) => s + d.inputCost, 0))}
                      {" · "}
                      Output: {formatCost(providerEntries.reduce((s, [, d]) => s + d.outputCost, 0))}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onViewDebate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={onViewDebate}
              title="View debate transcript"
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              Debate
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onHide}
            title="Hide from results"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {(survey.breakdown?.sub_questions ?? []).map((sq) => (
          <SubQuestionChart
            key={sq.id}
            subQuestion={sq}
            responses={survey.responses}
            colors={colors}
            selectedOption={drillDown?.sqId === sq.id ? drillDown.option : null}
            onOptionClick={(sqId, option) => onOptionClick(sqId, option)}
          />
        ))}
      </div>

      {/* Drill-down panelist list */}
      {drillDown && filteredResponses.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                Respondents who answered "{drillDown.option}"
              </p>
              <p className="text-xs text-muted-foreground">
                {drillDownQuestion?.text} — {filteredResponses.length} panelist{filteredResponses.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onOptionClick(drillDown.sqId, null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredResponses.map((resp) => {
              const respondent = respondentMap.get(resp.respondent_id)
              const avatar = getAvatar(resp.respondent_id, respondent?.role ?? null)
              return (
                <button
                  key={resp.id}
                  onClick={() => respondent && onRespondentClick?.(respondent)}
                  className="flex items-center gap-2.5 rounded-lg border bg-background p-2.5 text-left text-xs hover:shadow-sm transition-shadow"
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-base ${avatar.colorClass}`}>
                    {avatar.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {respondent?.role || resp.agent_name}
                    </p>
                    <p className="text-muted-foreground truncate">
                      {[respondent?.industry, respondent?.region].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] shrink-0">
                    {resp.model}
                  </Badge>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
