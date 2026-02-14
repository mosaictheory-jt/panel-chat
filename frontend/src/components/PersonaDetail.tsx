import { useMemo } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PersonaRadar } from "./PersonaRadar"
import { getAvatar } from "@/lib/avatar"
import {
  User,
  Building2,
  MapPin,
  Users,
  Brain,
  Database,
  TrendingUp,
  AlertTriangle,
  GraduationCap,
  Lightbulb,
} from "lucide-react"
import type { Respondent, CompletedSurvey, SurveyResponse, SubQuestion } from "@/types"

interface PersonaDetailProps {
  respondent: Respondent | null
  visibleSurveys: CompletedSurvey[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ProfileField {
  icon: React.ReactNode
  label: string
  value: string | null
}

interface SurveyAnswerGroup {
  surveyId: string
  question: string
  responses: SurveyResponse[]
  subQuestions: SubQuestion[]
}

export function PersonaDetail({
  respondent,
  visibleSurveys,
  open,
  onOpenChange,
}: PersonaDetailProps) {
  if (!respondent) return null

  const avatar = getAvatar(respondent.id, respondent.role)

  // Gather this respondent's responses across all visible surveys
  const answerGroups: SurveyAnswerGroup[] = useMemo(() => {
    const groups: SurveyAnswerGroup[] = []
    for (const survey of visibleSurveys) {
      const matching = survey.responses.filter(
        (r) => r.respondent_id === respondent.id
      )
      if (matching.length > 0) {
        groups.push({
          surveyId: survey.id,
          question: survey.question,
          responses: matching,
          subQuestions: survey.breakdown.sub_questions,
        })
      }
    }
    return groups
  }, [visibleSurveys, respondent.id])

  const profileSections: { title: string; fields: ProfileField[] }[] = [
    {
      title: "Role & Organization",
      fields: [
        { icon: <User className="w-3.5 h-3.5" />, label: "Role", value: respondent.role },
        { icon: <Building2 className="w-3.5 h-3.5" />, label: "Industry", value: respondent.industry },
        { icon: <Users className="w-3.5 h-3.5" />, label: "Org Size", value: respondent.org_size },
        { icon: <MapPin className="w-3.5 h-3.5" />, label: "Region", value: respondent.region },
        { icon: <Users className="w-3.5 h-3.5" />, label: "Team Focus", value: respondent.team_focus },
      ],
    },
    {
      title: "Tech Stack",
      fields: [
        { icon: <Database className="w-3.5 h-3.5" />, label: "Storage", value: respondent.storage_environment },
        { icon: <Database className="w-3.5 h-3.5" />, label: "Orchestration", value: respondent.orchestration },
        { icon: <Database className="w-3.5 h-3.5" />, label: "Modeling", value: respondent.modeling_approach },
        { icon: <TrendingUp className="w-3.5 h-3.5" />, label: "Architecture Trend", value: respondent.architecture_trend },
      ],
    },
    {
      title: "AI & Pain Points",
      fields: [
        { icon: <Brain className="w-3.5 h-3.5" />, label: "AI Usage", value: respondent.ai_usage_frequency },
        { icon: <Brain className="w-3.5 h-3.5" />, label: "AI Helps With", value: respondent.ai_helps_with },
        { icon: <Brain className="w-3.5 h-3.5" />, label: "AI Adoption", value: respondent.ai_adoption },
        { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Modeling Pain Points", value: respondent.modeling_pain_points },
        { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Biggest Bottleneck", value: respondent.biggest_bottleneck },
      ],
    },
    {
      title: "Outlook",
      fields: [
        { icon: <TrendingUp className="w-3.5 h-3.5" />, label: "Team Growth 2026", value: respondent.team_growth_2026 },
        { icon: <GraduationCap className="w-3.5 h-3.5" />, label: "Education Interest", value: respondent.education_topic },
        { icon: <Lightbulb className="w-3.5 h-3.5" />, label: "Industry Wish", value: respondent.industry_wish },
      ],
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md !gap-0 overflow-hidden flex flex-col">
        {/* Fixed header */}
        <SheetHeader className="shrink-0 border-b px-5 py-4">
          <div className="flex items-center gap-3 pr-8">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full text-2xl shrink-0 ${avatar.colorClass}`}>
              {avatar.emoji}
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base truncate">
                {respondent.role || "Unknown Role"}
              </SheetTitle>
              <SheetDescription className="truncate">
                {[respondent.industry, respondent.org_size, respondent.region]
                  .filter(Boolean)
                  .join(" · ")}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Technical Persona Radar */}
          <PersonaRadar respondent={respondent} />

          <Separator />

          {/* Survey Responses — grouped by survey */}
          {answerGroups.length > 0 && (
            <div>
              <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Survey Responses ({answerGroups.length} {answerGroups.length === 1 ? "survey" : "surveys"})
              </h4>
              <div className="space-y-3">
                {answerGroups.map((group) => {
                  const sqLookup = new Map(
                    group.subQuestions.map((sq) => [sq.id, sq])
                  )
                  return (
                    <div key={group.surveyId} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                      <p className="text-[11px] font-semibold leading-tight text-foreground">
                        {group.question}
                      </p>
                      {group.responses.map((resp) => (
                        <div key={resp.id} className="space-y-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {resp.model}
                          </Badge>
                          {Object.entries(resp.answers).map(([sqId, answer]) => {
                            const sq = sqLookup.get(sqId)
                            return (
                              <div key={sqId}>
                                <p className="text-[11px] text-muted-foreground leading-tight">
                                  {sq?.text ?? sqId}
                                </p>
                                <p className="text-sm font-medium">{answer}</p>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {answerGroups.length > 0 && <Separator />}

          {/* Full Profile */}
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Original Survey Profile
            </h4>
            <div className="space-y-4">
              {profileSections.map((section) => {
                const nonNullFields = section.fields.filter((f) => f.value)
                if (nonNullFields.length === 0) return null
                return (
                  <div key={section.title} className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {section.title}
                    </p>
                    <div className="space-y-1">
                      {nonNullFields.map((field) => (
                        <div
                          key={field.label}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="text-muted-foreground mt-0.5 shrink-0">
                            {field.icon}
                          </span>
                          <div className="min-w-0">
                            <span className="text-muted-foreground text-[11px]">
                              {field.label}
                            </span>
                            <p className="font-medium text-xs leading-snug">{field.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
