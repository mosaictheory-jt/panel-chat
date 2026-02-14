import { useEffect, useState } from "react"
import { useSurveyStore } from "@/store/surveyStore"
import { getSurvey, listSurveys } from "@/api/client"
import { useTheme } from "@/lib/theme"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { FilterPanel } from "./FilterPanel"
import { Settings, Eye, EyeOff, Sun, Moon, Monitor, Loader2 } from "lucide-react"
import type { CompletedSurvey, Respondent, SurveyResponse, DebateMessage, RoundSummary, DebateAnalysis } from "@/types"

export function Sidebar() {
  const {
    history,
    setHistory,
    loadSurvey,
    surveyId,
    phase,
    setSettingsOpen,
    completedSurveys,
    visibleSurveyIds,
    toggleSurveyVisibility,
    addCompletedSurvey,
  } = useSurveyStore()

  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    listSurveys().then(setHistory).catch(console.error)
  }, [setHistory])

  const mapRoundSummaries = (raw: Record<string, unknown>[]): RoundSummary[] =>
    raw.map((rs) => ({
      round: rs.round as number,
      totalRounds: (rs.totalRounds ?? rs.total_rounds) as number,
      summary: rs.summary as string,
    }))

  const handleSelectSurvey = async (id: string) => {
    if (id === surveyId) return
    try {
      const survey = await getSurvey(id)
      const roundSummaries = mapRoundSummaries((survey.round_summaries ?? []) as Record<string, unknown>[])
      loadSurvey(
        survey.id,
        survey.question,
        survey.panel as unknown as Respondent[],
        survey.breakdown,
        survey.responses as SurveyResponse[],
        survey.models,
        (survey.debate_messages ?? []) as DebateMessage[],
        roundSummaries,
        (survey.debate_analysis ?? null) as DebateAnalysis | null,
      )
    } catch (err) {
      console.error("Failed to load survey:", err)
    }
  }

  const handleToggleVisibility = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const isCurrentlyVisible = visibleSurveyIds.includes(id)
    const isLoaded = id in completedSurveys
    const noActiveSurvey = !surveyId || phase === "idle"

    if (isLoaded && isCurrentlyVisible) {
      // Hiding an already-visible item — just toggle off
      toggleSurveyVisibility(id)
      return
    }

    if (isLoaded && !isCurrentlyVisible) {
      // Showing an already-loaded item
      toggleSurveyVisibility(id)
      // If no active chat, also set it as the active survey
      if (noActiveSurvey) {
        const completed = completedSurveys[id]
        loadSurvey(
          completed.id,
          completed.question,
          completed.panel,
          completed.breakdown,
          completed.responses,
          [],
          completed.debateMessages,
          completed.roundSummaries,
          completed.debateAnalysis,
        )
      }
      return
    }

    // Not loaded yet — fetch from API, add to completed, and make visible
    setLoadingIds((prev) => new Set(prev).add(id))
    try {
      const survey = await getSurvey(id)
      const panel = survey.panel as unknown as Respondent[]
      const responses = survey.responses as SurveyResponse[]
      const debateMessages = (survey.debate_messages ?? []) as DebateMessage[]
      const roundSummaries = mapRoundSummaries((survey.round_summaries ?? []) as Record<string, unknown>[])
      const debateAnalysis = (survey.debate_analysis ?? null) as DebateAnalysis | null

      const completed: CompletedSurvey = {
        id: survey.id,
        question: survey.question,
        breakdown: survey.breakdown,
        responses,
        panel,
        debateMessages: debateMessages.length > 0 ? debateMessages : undefined,
        roundSummaries: roundSummaries.length > 0 ? roundSummaries : undefined,
        debateAnalysis: debateAnalysis ?? undefined,
      }
      addCompletedSurvey(completed)

      // If no active chat, also load as the active survey
      if (noActiveSurvey) {
        loadSurvey(
          survey.id,
          survey.question,
          panel,
          survey.breakdown,
          responses,
          survey.models,
          debateMessages,
          roundSummaries,
          debateAnalysis,
        )
      }
    } catch (err) {
      console.error("Failed to load survey for visibility:", err)
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light"
    setTheme(next)
  }

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor

  return (
    <aside className="w-72 shrink-0 border-r flex flex-col h-full bg-sidebar overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-bold text-lg">Panel Chat</h1>
          <p className="text-xs text-muted-foreground">
            AI-powered survey panel
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            aria-label={`Theme: ${theme}`}
            title={`Theme: ${theme}`}
          >
            <ThemeIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <FilterPanel />
        <Separator className="my-4" />

        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
          History
        </h3>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">No surveys yet</p>
        ) : (
          <div className="space-y-1">
            {history.map((s) => {
              const isVisible = visibleSurveyIds.includes(s.id)
              const isActive = s.id === surveyId
              const isLoading = loadingIds.has(s.id)

              return (
                <div
                  key={s.id}
                  className={`group flex items-start gap-1 rounded-md p-2 text-xs hover:bg-accent transition-colors ${
                    isActive ? "bg-accent" : ""
                  }`}
                >
                  <button
                    onClick={() => handleSelectSurvey(s.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="font-medium truncate">{s.question}</p>
                    <p className="text-muted-foreground mt-0.5">
                      {s.panel_size} panelists
                    </p>
                  </button>

                  <button
                    onClick={(e) => handleToggleVisibility(e, s.id)}
                    disabled={isLoading}
                    className={`shrink-0 p-1 rounded transition-colors ${
                      isLoading
                        ? "text-muted-foreground/40"
                        : isVisible
                          ? "text-primary hover:text-primary/80"
                          : "text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100"
                    }`}
                    title={isVisible ? "Hide from results" : "Show in results"}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isVisible ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
