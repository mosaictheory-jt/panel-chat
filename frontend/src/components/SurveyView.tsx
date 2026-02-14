import { useEffect, useMemo, useRef, useState } from "react"
import { useSurveyStore } from "@/store/surveyStore"
import { BreakdownEditor } from "./BreakdownEditor"
import { ResultsView } from "./ResultsView"
import { ResponseCard } from "./ResponseCard"
import { PersonaDetail } from "./PersonaDetail"
import { CostBadge } from "./CostBadge"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAvatar } from "@/lib/avatar"
import { ClipboardList, Loader2, Users, BarChart3 } from "lucide-react"
import type { CompletedSurvey, Respondent, SurveyResponse } from "@/types"

interface MergedPanelist {
  respondent: Respondent
  /** In the current active survey's panel */
  isActive: boolean
  /** Has responded in the current active survey */
  hasActiveResponse: boolean
  /** Their responses from the current active survey */
  activeResponses: SurveyResponse[]
  /** Number of visible completed surveys they appeared in (excluding current if still running) */
  historicalSurveyCount: number
}

export function SurveyView() {
  const {
    phase,
    question,
    panel,
    responses,
    breakdown,
    error,
    surveyModels,
    surveyId,
    completedSurveys,
    visibleSurveyIds,
    removeSurveyFromResults,
  } = useSurveyStore()

  const [selectedRespondent, setSelectedRespondent] = useState<Respondent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("panelists")
  const prevPhaseRef = useRef(phase)

  const modelCount = surveyModels.length || 1
  const totalExpected = panel.length * modelCount

  // Build the list of surveys to show in the Results tab
  const visibleSurveys: CompletedSurvey[] = useMemo(() => {
    const result: CompletedSurvey[] = []
    const addedIds = new Set<string>()

    for (const id of visibleSurveyIds) {
      const survey = completedSurveys[id]
      if (survey) {
        result.push(survey)
        addedIds.add(id)
      }
    }

    // Include live running survey data if not already in completed
    if (
      phase === "running" &&
      surveyId &&
      breakdown &&
      responses.length > 0 &&
      !addedIds.has(surveyId)
    ) {
      result.push({
        id: surveyId,
        question: question ?? "",
        breakdown,
        responses,
        panel,
      })
    }

    return result
  }, [visibleSurveyIds, completedSurveys, phase, surveyId, breakdown, responses, question, panel])

  // Active survey's respondent lookup
  const activeRespondentIds = useMemo(() => new Set(panel.map((r) => r.id)), [panel])

  const activeResponsesByRespondent = useMemo(() => {
    const map = new Map<number, SurveyResponse[]>()
    for (const r of responses) {
      const list = map.get(r.respondent_id) ?? []
      list.push(r)
      map.set(r.respondent_id, list)
    }
    return map
  }, [responses])

  // Build merged panelist list: current panel + historical panelists from visible surveys
  const mergedPanelists: MergedPanelist[] = useMemo(() => {
    const respondentById = new Map<number, Respondent>()
    const historicalCounts = new Map<number, number>()

    // Collect all respondents from visible completed surveys (excluding the active survey)
    for (const survey of Object.values(completedSurveys)) {
      if (!visibleSurveyIds.includes(survey.id)) continue
      if (survey.id === surveyId) continue // skip active survey, handled separately
      for (const r of survey.panel) {
        if (!respondentById.has(r.id)) respondentById.set(r.id, r)
        historicalCounts.set(r.id, (historicalCounts.get(r.id) ?? 0) + 1)
      }
    }

    // Add current panel respondents
    for (const r of panel) {
      respondentById.set(r.id, r)
    }

    const result: MergedPanelist[] = []

    // Active panelists first
    for (const r of panel) {
      const activeResps = activeResponsesByRespondent.get(r.id) ?? []
      result.push({
        respondent: r,
        isActive: true,
        hasActiveResponse: activeResps.length > 0,
        activeResponses: activeResps,
        historicalSurveyCount: historicalCounts.get(r.id) ?? 0,
      })
    }

    // Historical-only panelists (not in current panel)
    for (const [id, respondent] of respondentById) {
      if (activeRespondentIds.has(id)) continue
      result.push({
        respondent,
        isActive: false,
        hasActiveResponse: false,
        activeResponses: [],
        historicalSurveyCount: historicalCounts.get(id) ?? 0,
      })
    }

    return result
  }, [panel, completedSurveys, visibleSurveyIds, surveyId, activeRespondentIds, activeResponsesByRespondent])

  const openPersonaDetail = (respondent: Respondent) => {
    setSelectedRespondent(respondent)
    setDetailOpen(true)
  }

  // Auto-switch to charts tab when survey completes
  useEffect(() => {
    if (prevPhaseRef.current === "running" && phase === "complete") {
      setActiveTab("charts")
    }
    prevPhaseRef.current = phase
  }, [phase])

  // Reset to panelists tab when a new survey starts running
  useEffect(() => {
    if (phase === "running") {
      setActiveTab("panelists")
    }
  }, [phase === "running"])

  const progressPercent = totalExpected > 0
    ? Math.round((responses.length / totalExpected) * 100)
    : 0

  // Idle — empty state
  if (phase === "idle" && !question && visibleSurveys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
        <ClipboardList className="w-16 h-16 opacity-30" />
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Panel Chat</h2>
          <p className="text-sm max-w-md">
            Ask a question and AI agents representing real data engineering survey
            respondents will answer structured sub-questions. Results are
            automatically visualized with charts.
          </p>
        </div>
      </div>
    )
  }

  // If idle but we have visible past results, show only the charts
  if ((phase === "idle" || phase === "complete") && !question && visibleSurveys.length > 0) {
    return (
      <div className="space-y-6 pb-4">
        <ResultsView
          surveys={visibleSurveys}
          onHideSurvey={removeSurveyFromResults}
          onRespondentClick={openPersonaDetail}
        />
        <PersonaDetail
          respondent={selectedRespondent}
          visibleSurveys={visibleSurveys}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      </div>
    )
  }

  const showTabs = phase === "running" || phase === "complete"
  const uniquePanelistCount = mergedPanelists.length

  return (
    <div className="space-y-6 pb-4">
      {/* Question banner */}
      {question && (
        <div className="bg-primary/5 border rounded-lg p-4">
          <p className="font-semibold text-lg">{question}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {panel.length} panelists
            </Badge>
            <Badge variant="outline" className="text-xs">
              {modelCount} model{modelCount !== 1 ? "s" : ""}
            </Badge>
            {phase === "complete" && (
              <Badge className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                {responses.length} responses
              </Badge>
            )}
            {phase === "running" && (
              <Badge className="text-xs bg-blue-500/10 text-blue-700 border-blue-500/30">
                {responses.length} / {totalExpected} responses
              </Badge>
            )}
            {(phase === "running" || phase === "complete") && breakdown && (
              <CostBadge
                responses={responses}
                models={surveyModels}
                panelSize={panel.length}
                subQuestionCount={breakdown.sub_questions.length}
                totalExpected={totalExpected}
                isComplete={phase === "complete"}
              />
            )}
          </div>
        </div>
      )}

      {/* Analyzing phase */}
      {phase === "analyzing" && (
        <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
          <div className="text-center">
            <p className="text-sm font-medium">Breaking down your question...</p>
            <p className="text-xs mt-1">The analyzer is creating structured sub-questions</p>
          </div>
        </div>
      )}

      {/* Reviewing phase — show breakdown editor */}
      {phase === "reviewing" && breakdown && (
        <BreakdownEditor />
      )}

      {/* Tabbed results (running or complete) */}
      {showTabs && breakdown && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="panelists" className="flex-1 gap-2">
              <Users className="w-4 h-4" />
              Panelists ({uniquePanelistCount})
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex-1 gap-2">
              <BarChart3 className="w-4 h-4" />
              Results
              {visibleSurveys.length > 1 && (
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {visibleSurveys.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="panelists" className="mt-4 space-y-4">
            {/* Progress bar */}
            {phase === "running" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{responses.length} of {totalExpected} responses collected</span>
                  <span className="font-medium tabular-nums">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            {/* Unified panelist grid — one card per panelist */}
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {mergedPanelists.map((mp) => {
                const { respondent, isActive, hasActiveResponse, activeResponses, historicalSurveyCount } = mp

                // Active panelist who has responded → response card
                if (isActive && hasActiveResponse && activeResponses.length > 0) {
                  return (
                    <ResponseCard
                      key={respondent.id}
                      response={activeResponses[0]}
                      respondent={respondent}
                      breakdown={breakdown}
                      historicalCount={historicalSurveyCount}
                      onClick={() => openPersonaDetail(respondent)}
                    />
                  )
                }

                // Active panelist still pending
                if (isActive && !hasActiveResponse) {
                  const avatar = getAvatar(respondent.id, respondent.role)
                  return (
                    <button
                      key={respondent.id}
                      onClick={() => openPersonaDetail(respondent)}
                      className="flex items-start gap-2 rounded-lg border border-border bg-card p-2.5 text-left text-xs transition-all duration-300 hover:shadow-md animate-pulse-subtle"
                    >
                      <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-sm ${avatar.colorClass}`}>
                        {avatar.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate text-[11px] leading-tight">
                          {respondent.role || "Unknown Role"}
                        </p>
                        <p className="text-muted-foreground truncate text-[10px]">
                          {respondent.industry || "Unknown Industry"}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                      </div>
                    </button>
                  )
                }

                // Historical-only panelist — greyed out
                const avatar = getAvatar(respondent.id, respondent.role)
                return (
                  <button
                    key={respondent.id}
                    onClick={() => openPersonaDetail(respondent)}
                    className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 p-2.5 text-left text-xs opacity-60 hover:opacity-100 transition-all hover:shadow-sm"
                  >
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-sm grayscale ${avatar.colorClass}`}>
                      {avatar.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-[11px] leading-tight">
                        {respondent.role || "Unknown Role"}
                      </p>
                      <p className="text-muted-foreground truncate text-[10px]">
                        {respondent.industry || "Unknown Industry"}
                      </p>
                      {historicalSurveyCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground mt-0.5">
                          {historicalSurveyCount} past {historicalSurveyCount === 1 ? "survey" : "surveys"}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="charts" className="mt-4">
            <ResultsView
              surveys={visibleSurveys}
              onHideSurvey={removeSurveyFromResults}
              onRespondentClick={openPersonaDetail}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {/* Persona Detail Sheet */}
      <PersonaDetail
        respondent={selectedRespondent}
        visibleSurveys={visibleSurveys}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
