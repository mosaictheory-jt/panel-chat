import { useMemo, useState } from "react"
import { SubQuestionChart } from "./SubQuestionChart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getAvatar } from "@/lib/avatar"
import { X, EyeOff } from "lucide-react"
import type { CompletedSurvey, Respondent } from "@/types"

interface ResultsViewProps {
  /** All survey datasets to display, in order */
  surveys: CompletedSurvey[]
  /** Called when user wants to hide a survey from the results */
  onHideSurvey?: (surveyId: string) => void
  /** Called when user clicks a respondent in drill-down */
  onRespondentClick?: (respondent: Respondent) => void
}

export function ResultsView({
  surveys,
  onHideSurvey,
  onRespondentClick,
}: ResultsViewProps) {
  // Track which chart + option is selected for drill-down, scoped by survey
  const [drillDown, setDrillDown] = useState<{
    surveyId: string
    sqId: string
    option: string
  } | null>(null)

  const handleOptionClick = (surveyId: string, sqId: string, option: string | null) => {
    if (!option) {
      setDrillDown(null)
    } else {
      setDrillDown({ surveyId, sqId, option })
    }
  }

  if (surveys.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        No results to display yet.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {surveys.map((survey) => (
        <SurveyResultGroup
          key={survey.id}
          survey={survey}
          drillDown={drillDown?.surveyId === survey.id ? drillDown : null}
          onOptionClick={(sqId, option) => handleOptionClick(survey.id, sqId, option)}
          onHide={() => onHideSurvey?.(survey.id)}
          onRespondentClick={onRespondentClick}
        />
      ))}
    </div>
  )
}

interface SurveyResultGroupProps {
  survey: CompletedSurvey
  drillDown: { sqId: string; option: string } | null
  onOptionClick: (sqId: string, option: string | null) => void
  onHide: () => void
  onRespondentClick?: (respondent: Respondent) => void
}

function SurveyResultGroup({
  survey,
  drillDown,
  onOptionClick,
  onHide,
  onRespondentClick,
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

  const drillDownQuestion = drillDown
    ? survey.breakdown.sub_questions.find((sq) => sq.id === drillDown.sqId)
    : null

  return (
    <div className="space-y-4">
      {/* Survey group header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-tight">{survey.question}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {survey.responses.length} responses · {survey.panel.length} panelists
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onHide}
          title="Hide from results"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {survey.breakdown.sub_questions.map((sq) => (
          <SubQuestionChart
            key={sq.id}
            subQuestion={sq}
            responses={survey.responses}
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
