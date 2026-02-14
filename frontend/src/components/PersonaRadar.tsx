import { useMemo } from "react"
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { computePersonaProfile, type PersonaTrait } from "@/lib/personaTraits"
import type { Respondent } from "@/types"

interface PersonaRadarProps {
  respondent: Respondent
}

export function PersonaRadar({ respondent }: PersonaRadarProps) {
  const profile = useMemo(
    () => computePersonaProfile(respondent),
    [respondent],
  )

  const chartData = profile.traits.map((t) => ({
    dimension: t.dimension,
    score: t.score,
    fullMark: 5,
    label: t.label,
  }))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
          Technical Profile
        </h4>
        <Badge variant="secondary" className="text-[10px]">
          {profile.archetype}
        </Badge>
      </div>

      <div className="rounded-lg border bg-muted/20 p-3">
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid
              stroke="var(--border)"
              strokeOpacity={0.5}
            />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 5]}
              tickCount={6}
              tick={false}
              axisLine={false}
            />
            <Radar
              dataKey="score"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--primary))" }}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.[0]) return null
                const data = payload[0].payload as (typeof chartData)[number]
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                    <p className="font-semibold">{data.dimension}: {data.score}/5</p>
                    <p className="text-muted-foreground mt-0.5">{data.label}</p>
                  </div>
                )
              }}
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* Trait legend */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
          {profile.traits.map((t) => (
            <div key={t.dimension} className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">{t.dimension}</span>
              <div className="flex items-center gap-1">
                <div className="flex gap-px">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${
                        i < t.score ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
