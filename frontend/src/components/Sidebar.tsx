import { useEffect } from "react"
import { useSurveyStore } from "@/store/surveyStore"
import { getSurvey, listSurveys } from "@/api/client"
import { useTheme } from "@/lib/theme"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { FilterPanel } from "./FilterPanel"
import { Settings, Eye, EyeOff, Sun, Moon, Monitor } from "lucide-react"
import type { Respondent, SurveyResponse } from "@/types"

export function Sidebar() {
  const {
    history,
    setHistory,
    loadSurvey,
    surveyId,
    setSettingsOpen,
    completedSurveys,
    visibleSurveyIds,
    toggleSurveyVisibility,
  } = useSurveyStore()

  useEffect(() => {
    listSurveys().then(setHistory).catch(console.error)
  }, [setHistory])

  const handleSelectSurvey = async (id: string) => {
    if (id === surveyId) return
    try {
      const survey = await getSurvey(id)
      loadSurvey(
        survey.id,
        survey.question,
        survey.panel as unknown as Respondent[],
        survey.breakdown,
        survey.responses as SurveyResponse[],
        survey.models,
      )
    } catch (err) {
      console.error("Failed to load survey:", err)
    }
  }

  const handleToggleVisibility = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    toggleSurveyVisibility(id)
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
              const isCompleted = s.id in completedSurveys
              const isVisible = visibleSurveyIds.includes(s.id)
              const isActive = s.id === surveyId

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

                  {isCompleted && (
                    <button
                      onClick={(e) => handleToggleVisibility(e, s.id)}
                      className={`shrink-0 p-1 rounded transition-colors ${
                        isVisible
                          ? "text-primary hover:text-primary/80"
                          : "text-muted-foreground/40 hover:text-muted-foreground"
                      }`}
                      title={isVisible ? "Hide from results" : "Show in results"}
                    >
                      {isVisible ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
