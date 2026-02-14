import { useMemo, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, PieChart as PieChartIcon } from "lucide-react"
import type { SubQuestion, SurveyResponse } from "@/types"

interface SubQuestionChartProps {
  subQuestion: SubQuestion
  responses: SurveyResponse[]
  colors: string[]
  selectedOption: string | null
  onOptionClick: (subQuestionId: string, option: string | null) => void
}

export function SubQuestionChart({
  subQuestion,
  responses,
  colors,
  selectedOption,
  onOptionClick,
}: SubQuestionChartProps) {
  const [chartType, setChartType] = useState<"bar" | "pie">(subQuestion.chart_type)

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const opt of subQuestion.answer_options) {
      counts[opt] = 0
    }
    for (const resp of responses) {
      const chosen = resp.answers[subQuestion.id]
      if (chosen && counts[chosen] !== undefined) {
        counts[chosen]++
      }
    }
    return subQuestion.answer_options.map((opt, i) => ({
      name: opt,
      count: counts[opt],
      fill: colors[i % colors.length],
    }))
  }, [subQuestion, responses, colors])

  const totalResponses = useMemo(
    () => chartData.reduce((sum, d) => sum + d.count, 0),
    [chartData]
  )

  const uniqueModels = useMemo(() => {
    const models = new Set(responses.map((r) => r.model))
    return Array.from(models)
  }, [responses])

  const modelChartData = useMemo(() => {
    if (uniqueModels.length <= 1) return null
    return subQuestion.answer_options.map((opt) => {
      const row: Record<string, string | number> = { name: opt }
      for (const model of uniqueModels) {
        row[model] = responses.filter(
          (r) => r.model === model && r.answers[subQuestion.id] === opt
        ).length
      }
      return row
    })
  }, [subQuestion, responses, uniqueModels])

  const useGroupedBar = chartType === "bar" && modelChartData && uniqueModels.length > 1

  const handleBarClick = (data: { name?: string; payload?: { name?: string } }) => {
    const name = data?.name ?? data?.payload?.name
    if (!name) return
    onOptionClick(subQuestion.id, name === selectedOption ? null : name)
  }

  const handlePieClick = (_: unknown, index: number) => {
    const opt = subQuestion.answer_options[index]
    if (!opt) return
    onOptionClick(subQuestion.id, opt === selectedOption ? null : opt)
  }

  const isActive = selectedOption !== null

  const tooltipStyles = {
    contentStyle: {
      backgroundColor: "var(--popover)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      fontSize: "12px",
      color: "var(--popover-foreground)",
    },
    labelStyle: { color: "var(--popover-foreground)" },
    itemStyle: { color: "var(--popover-foreground)" },
  }

  return (
    <Card className={isActive ? "ring-2 ring-primary/30" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium flex-1">{subQuestion.text}</CardTitle>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setChartType("bar")}
              className={`p-1 rounded transition-colors ${
                chartType === "bar"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Bar chart"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType("pie")}
              className={`p-1 rounded transition-colors ${
                chartType === "pie"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Pie chart"
            >
              <PieChartIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {selectedOption && (
          <button
            onClick={() => onOptionClick(subQuestion.id, null)}
            className="text-xs text-primary hover:underline self-start"
          >
            Showing: "{selectedOption}" — click to clear
          </button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <ResponsiveContainer width="100%" height={220}>
          {chartType === "pie" ? (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                dataKey="count"
                nameKey="name"
                cursor="pointer"
                onClick={handlePieClick}
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={colors[index % colors.length]}
                    opacity={selectedOption && entry.name !== selectedOption ? 0.3 : 1}
                    stroke={entry.name === selectedOption ? "var(--foreground)" : "transparent"}
                    strokeWidth={entry.name === selectedOption ? 2 : 0}
                  />
                ))}
              </Pie>
              <Tooltip
                {...tooltipStyles}
                formatter={(value: number, name: string) => [
                  `${value} (${totalResponses > 0 ? Math.round((value / totalResponses) * 100) : 0}%)`,
                  name,
                ]}
              />
            </PieChart>
          ) : useGroupedBar ? (
            <BarChart data={modelChartData} onClick={(e) => e?.activePayload?.[0] && handleBarClick(e.activePayload[0])}>
              <XAxis dataKey="name" tick={false} height={8} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={30} />
              <Tooltip {...tooltipStyles} />
              {uniqueModels.map((model, i) => (
                <Bar
                  key={model}
                  dataKey={model}
                  fill={colors[i % colors.length]}
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                />
              ))}
            </BarChart>
          ) : (
            <BarChart data={chartData} onClick={(e) => e?.activePayload?.[0] && handleBarClick(e.activePayload[0].payload)}>
              <XAxis dataKey="name" tick={false} height={8} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={30} />
              <Tooltip
                {...tooltipStyles}
                formatter={(value: number) => [
                  `${value} (${totalResponses > 0 ? Math.round((value / totalResponses) * 100) : 0}%)`,
                  "Responses",
                ]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer">
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={colors[index % colors.length]}
                    opacity={selectedOption && entry.name !== selectedOption ? 0.3 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>

        {/* Legend with counts */}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {chartData.map((entry, index) => {
            const pct = totalResponses > 0 ? Math.round((entry.count / totalResponses) * 100) : 0
            const isSelected = entry.name === selectedOption
            const isDimmed = selectedOption && !isSelected
            return (
              <button
                key={entry.name}
                onClick={() => onOptionClick(subQuestion.id, isSelected ? null : entry.name)}
                className={`flex items-center gap-1.5 text-[10px] leading-tight transition-opacity ${
                  isDimmed ? "opacity-40" : "opacity-100"
                } hover:opacity-100`}
                title={`${entry.name}: ${entry.count} responses (${pct}%)`}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="truncate max-w-[120px]">{entry.name}</span>
                <span className="font-semibold tabular-nums">{entry.count}</span>
                <span className="text-muted-foreground">({pct}%)</span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
