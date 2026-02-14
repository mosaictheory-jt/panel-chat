import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getAvatar } from "@/lib/avatar"
import {
  Lightbulb,
  Zap,
  Users,
  ChevronDown,
  ChevronUp,
  MessageSquareText,
} from "lucide-react"
import type { DebateAnalysis, DebateTheme, Respondent } from "@/types"
import ReactMarkdown from "react-markdown"

const SENTIMENT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  positive: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", label: "Positive" },
  negative: { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-400", label: "Negative" },
  mixed: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", label: "Mixed" },
  neutral: { bg: "bg-zinc-500/10", text: "text-zinc-700 dark:text-zinc-400", label: "Neutral" },
}

const THEME_COLORS = [
  "border-l-blue-500",
  "border-l-purple-500",
  "border-l-emerald-500",
  "border-l-amber-500",
  "border-l-rose-500",
  "border-l-cyan-500",
  "border-l-indigo-500",
  "border-l-lime-500",
]

interface DebateAnalysisViewProps {
  analysis: DebateAnalysis
  panel: Respondent[]
  onRespondentClick?: (respondent: Respondent) => void
  onViewTranscript?: () => void
}

function ThemeCard({
  theme,
  index,
  respondentMap,
  onRespondentClick,
}: {
  theme: DebateTheme
  index: number
  respondentMap: Map<number, Respondent>
  onRespondentClick?: (respondent: Respondent) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const sentimentStyle = SENTIMENT_STYLES[theme.sentiment] ?? SENTIMENT_STYLES.neutral
  const borderColor = THEME_COLORS[index % THEME_COLORS.length]

  const themeRespondents = theme.respondent_ids
    .map((id) => respondentMap.get(id))
    .filter((r): r is Respondent => r !== undefined)

  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-sm">{theme.label}</h4>
              <Badge className={`text-[10px] ${sentimentStyle.bg} ${sentimentStyle.text} border-0`}>
                {sentimentStyle.label}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {theme.respondent_ids.length} panelist{theme.respondent_ids.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {theme.description}
            </p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-3">
          {/* Key arguments */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Key Arguments
            </p>
            <ul className="space-y-1">
              {theme.key_arguments.map((arg, argIdx) => (
                <li key={argIdx} className="text-xs text-foreground/90 flex gap-2">
                  <span className="text-muted-foreground shrink-0 mt-0.5">•</span>
                  <span className="leading-relaxed">{arg}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Panelists in this theme */}
          {themeRespondents.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Panelists
              </p>
              <div className="flex flex-wrap gap-1.5">
                {themeRespondents.map((respondent) => {
                  const avatar = getAvatar(respondent.id, respondent.role)
                  return (
                    <button
                      key={respondent.id}
                      onClick={() => onRespondentClick?.(respondent)}
                      className="flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-[10px] hover:bg-muted transition-colors"
                    >
                      <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[8px] ${avatar.colorClass}`}>
                        {avatar.emoji}
                      </span>
                      <span className="truncate max-w-[120px]">
                        {respondent.role || "Unknown"}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export function DebateAnalysisView({
  analysis,
  panel,
  onRespondentClick,
  onViewTranscript,
}: DebateAnalysisViewProps) {
  const respondentMap = new Map(panel.map((r) => [r.id, r]))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Debate Analysis</h3>
          <Badge variant="secondary" className="text-[10px]">
            {analysis.themes?.length ?? 0} theme{(analysis.themes?.length ?? 0) !== 1 ? "s" : ""}
          </Badge>
        </div>
        {onViewTranscript && (
          <button
            onClick={onViewTranscript}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageSquareText className="w-3.5 h-3.5" />
            View Transcript
          </button>
        )}
      </div>

      {/* Synthesis */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-3">
          <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
            <ReactMarkdown>{analysis.synthesis}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {/* Theme clusters */}
      <div className="space-y-2">
        {(analysis.themes ?? []).map((theme, idx) => (
          <ThemeCard
            key={idx}
            theme={theme}
            index={idx}
            respondentMap={respondentMap}
            onRespondentClick={onRespondentClick}
          />
        ))}
      </div>

      {/* Consensus & Tensions */}
      {((analysis.consensus_points?.length ?? 0) > 0 || (analysis.key_tensions?.length ?? 0) > 0) && (
        <>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Consensus */}
            {(analysis.consensus_points?.length ?? 0) > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-xs font-semibold">Consensus</p>
                </div>
                <ul className="space-y-1">
                  {(analysis.consensus_points ?? []).map((point, idx) => (
                    <li key={idx} className="text-xs text-foreground/90 flex gap-2">
                      <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tensions */}
            {(analysis.key_tensions?.length ?? 0) > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs font-semibold">Key Tensions</p>
                </div>
                <ul className="space-y-1">
                  {(analysis.key_tensions ?? []).map((tension, idx) => (
                    <li key={idx} className="text-xs text-foreground/90 flex gap-2">
                      <span className="text-amber-500 shrink-0 mt-0.5">⚡</span>
                      <span className="leading-relaxed">{tension}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
