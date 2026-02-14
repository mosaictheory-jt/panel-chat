import { useMemo, useState } from "react"
import { useSurveyStore } from "@/store/surveyStore"
import { useSurvey } from "@/hooks/useSurvey"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Trash2, Play, BarChart3, PieChart, DollarSign, Swords } from "lucide-react"
import { estimateSurveyCost, formatCost } from "@/lib/pricing"
import type { SubQuestion, QuestionBreakdown } from "@/types"

export function BreakdownEditor() {
  const storeBreakdown = useSurveyStore((s) => s.breakdown)
  const surveyModels = useSurveyStore((s) => s.surveyModels)
  const panel = useSurveyStore((s) => s.panel)
  const chatMode = useSurveyStore((s) => s.chatMode)
  const debateRounds = useSurveyStore((s) => s.debateRounds)
  const { runSurvey } = useSurvey()

  const [subQuestions, setSubQuestions] = useState<SubQuestion[]>(
    storeBreakdown?.sub_questions ?? []
  )

  const originalQuestion = storeBreakdown?.original_question ?? ""

  const updateSubQuestion = (index: number, updates: Partial<SubQuestion>) => {
    setSubQuestions((prev) =>
      prev.map((sq, i) => (i === index ? { ...sq, ...updates } : sq))
    )
  }

  const addOption = (sqIndex: number) => {
    setSubQuestions((prev) =>
      prev.map((sq, i) =>
        i === sqIndex
          ? { ...sq, answer_options: [...sq.answer_options, "New option"] }
          : sq
      )
    )
  }

  const removeOption = (sqIndex: number, optIndex: number) => {
    setSubQuestions((prev) =>
      prev.map((sq, i) =>
        i === sqIndex
          ? {
              ...sq,
              answer_options: sq.answer_options.filter((_, j) => j !== optIndex),
            }
          : sq
      )
    )
  }

  const updateOption = (sqIndex: number, optIndex: number, value: string) => {
    setSubQuestions((prev) =>
      prev.map((sq, i) =>
        i === sqIndex
          ? {
              ...sq,
              answer_options: sq.answer_options.map((opt, j) =>
                j === optIndex ? value : opt
              ),
            }
          : sq
      )
    )
  }

  const addSubQuestion = () => {
    const nextId = `sq_${subQuestions.length + 1}`
    setSubQuestions((prev) => [
      ...prev,
      {
        id: nextId,
        text: "New sub-question",
        answer_options: ["Option A", "Option B", "Option C"],
        chart_type: "bar" as const,
      },
    ])
  }

  const removeSubQuestion = (index: number) => {
    setSubQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleChartType = (index: number) => {
    setSubQuestions((prev) =>
      prev.map((sq, i) =>
        i === index
          ? { ...sq, chart_type: sq.chart_type === "bar" ? "pie" as const : "bar" as const }
          : sq
      )
    )
  }

  const handleRunSurvey = () => {
    const breakdown: QuestionBreakdown = {
      original_question: originalQuestion,
      sub_questions: subQuestions,
    }
    runSurvey(breakdown)
  }

  const isValid =
    subQuestions.length > 0 &&
    subQuestions.every(
      (sq) => sq.text.trim() && sq.answer_options.length >= 2
    )

  const roundMultiplier = chatMode === "debate" ? debateRounds : 1
  const costEstimate = useMemo(
    () => {
      const base = estimateSurveyCost(surveyModels, panel.length, subQuestions.length)
      if (roundMultiplier <= 1) return base
      // Scale cost by number of debate rounds (+ summary calls per round)
      return {
        totalCost: base.totalCost * roundMultiplier,
        perProvider: Object.fromEntries(
          Object.entries(base.perProvider).map(([k, v]) => [
            k,
            {
              ...v,
              totalCost: v.totalCost * roundMultiplier,
              inputCost: v.inputCost * roundMultiplier,
              outputCost: v.outputCost * roundMultiplier,
              calls: v.calls * roundMultiplier,
            },
          ])
        ),
      }
    },
    [surveyModels, panel.length, subQuestions.length, roundMultiplier],
  )

  const providerEntries = Object.entries(costEstimate.perProvider)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">Review Question Breakdown</h3>
            {chatMode === "debate" && (
              <Badge className="text-xs bg-purple-500/10 text-purple-700 border-purple-500/30 gap-1">
                <Swords className="w-3 h-3" />
                Debate
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {chatMode === "debate"
              ? `Edit the sub-questions, then start a ${debateRounds}-round debate.`
              : "Edit the sub-questions and answer options, then run the survey."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {costEstimate.totalCost > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-default">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span className="tabular-nums font-medium">
                      ~{formatCost(costEstimate.totalCost)}
                    </span>
                    <span className="text-xs">est.</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs space-y-1.5 max-w-64">
                  <p className="font-semibold">Estimated cost breakdown</p>
                  <p className="text-muted-foreground">
                    {panel.length} panelists × {surveyModels.length} model{surveyModels.length !== 1 ? "s" : ""} × {subQuestions.length} question{subQuestions.length !== 1 ? "s" : ""}
                    {roundMultiplier > 1 && ` × ${roundMultiplier} rounds`}
                  </p>
                  {providerEntries.map(([provider, data]) => (
                    <div key={provider} className="flex justify-between gap-4">
                      <span>{provider}</span>
                      <span className="tabular-nums">
                        {formatCost(data.totalCost)}
                        <span className="text-muted-foreground ml-1">({data.calls} calls)</span>
                      </span>
                    </div>
                  ))}
                  <p className="text-muted-foreground border-t pt-1">
                    Input: ~{formatCost(providerEntries.reduce((s, [, d]) => s + d.inputCost, 0))}
                    {" · "}
                    Output: ~{formatCost(providerEntries.reduce((s, [, d]) => s + d.outputCost, 0))}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button onClick={handleRunSurvey} disabled={!isValid} className="gap-2">
            <Play className="w-4 h-4" />
            {chatMode === "debate" ? `Run Debate (${debateRounds} rounds)` : "Run Survey"}
          </Button>
        </div>
      </div>

      {subQuestions.map((sq, sqIndex) => (
        <Card key={sq.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {sq.id}
                  </Badge>
                  <button
                    onClick={() => toggleChartType(sqIndex)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    title={`Chart type: ${sq.chart_type}`}
                  >
                    {sq.chart_type === "bar" ? (
                      <BarChart3 className="w-4 h-4" />
                    ) : (
                      <PieChart className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <Input
                  value={sq.text}
                  onChange={(e) =>
                    updateSubQuestion(sqIndex, { text: e.target.value })
                  }
                  className="font-medium"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeSubQuestion(sqIndex)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Answer Options
            </Label>
            {sq.answer_options.map((opt, optIndex) => (
              <div key={optIndex} className="flex gap-2 items-center">
                <Input
                  value={opt}
                  onChange={(e) =>
                    updateOption(sqIndex, optIndex, e.target.value)
                  }
                  className="text-sm"
                />
                {sq.answer_options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeOption(sqIndex, optIndex)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => addOption(sqIndex)}
            >
              <Plus className="w-3 h-3" /> Add Option
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" className="w-full gap-2" onClick={addSubQuestion}>
        <Plus className="w-4 h-4" /> Add Sub-Question
      </Button>
    </div>
  )
}
