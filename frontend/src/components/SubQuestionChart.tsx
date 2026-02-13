import { useMemo } from "react"
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
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SubQuestion, SurveyResponse } from "@/types"

const COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
]

interface SubQuestionChartProps {
  subQuestion: SubQuestion
  responses: SurveyResponse[]
  selectedOption: string | null
  onOptionClick: (subQuestionId: string, option: string | null) => void
}

export function SubQuestionChart({
  subQuestion,
  responses,
  selectedOption,
  onOptionClick,
}: SubQuestionChartProps) {
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
    return subQuestion.answer_options.map((opt) => ({
      name: opt,
      count: counts[opt],
    }))
  }, [subQuestion, responses])

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

  const useGroupedBar = modelChartData && uniqueModels.length > 1

  const handleBarClick = (data: { name?: string; payload?: { name?: string } }) => {
    const name = data?.name ?? data?.payload?.name
    if (!name) return
    if (name === selectedOption) {
      onOptionClick(subQuestion.id, null)
    } else {
      onOptionClick(subQuestion.id, name)
    }
  }

  const handlePieClick = (_: unknown, index: number) => {
    const opt = subQuestion.answer_options[index]
    if (!opt) return
    if (opt === selectedOption) {
      onOptionClick(subQuestion.id, null)
    } else {
      onOptionClick(subQuestion.id, opt)
    }
  }

  const isActive = selectedOption !== null

  return (
    <Card className={isActive ? "ring-2 ring-primary/30" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{subQuestion.text}</CardTitle>
        {selectedOption && (
          <button
            onClick={() => onOptionClick(subQuestion.id, null)}
            className="text-xs text-primary hover:underline self-start"
          >
            Showing: "{selectedOption}" — click to clear
          </button>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          {subQuestion.chart_type === "pie" ? (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="count"
                nameKey="name"
                label={({ name, count }) => count > 0 ? `${name}: ${count}` : ""}
                cursor="pointer"
                onClick={handlePieClick}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                    opacity={selectedOption && entry.name !== selectedOption ? 0.3 : 1}
                    stroke={entry.name === selectedOption ? "#000" : undefined}
                    strokeWidth={entry.name === selectedOption ? 2 : 0}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          ) : useGroupedBar ? (
            <BarChart data={modelChartData} onClick={(e) => e?.activePayload?.[0] && handleBarClick(e.activePayload[0])}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              {uniqueModels.map((model, i) => (
                <Bar
                  key={model}
                  dataKey={model}
                  fill={COLORS[i % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                />
              ))}
            </BarChart>
          ) : (
            <BarChart data={chartData} onClick={(e) => e?.activePayload?.[0] && handleBarClick(e.activePayload[0].payload)}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer">
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                    opacity={selectedOption && entry.name !== selectedOption ? 0.3 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
