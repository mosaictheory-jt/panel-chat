import { useEffect, useRef, useState } from "react"
import { useSurveyStore } from "@/store/surveyStore"
import { getFilterOptions, getRespondentCount } from "@/api/client"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { FilterOptions, Filters } from "@/types"
import { X, AlertTriangle } from "lucide-react"

const FILTER_KEYS: { key: keyof Filters; label: string }[] = [
  { key: "role", label: "Role" },
  { key: "org_size", label: "Org Size" },
  { key: "industry", label: "Industry" },
  { key: "region", label: "Region" },
  { key: "ai_usage_frequency", label: "AI Usage" },
  { key: "architecture_trend", label: "Architecture" },
]

export function FilterPanel() {
  const { filters, setFilter, clearFilters, panelSize, setPanelSize } = useSurveyStore()
  const [options, setOptions] = useState<FilterOptions | null>(null)
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    getFilterOptions().then(setOptions).catch(console.error)
  }, [])

  useEffect(() => {
    const activeFilters: Record<string, string[]> = {}
    for (const [key, values] of Object.entries(filters)) {
      if (values && values.length > 0) {
        activeFilters[key] = values
      }
    }
    getRespondentCount(activeFilters).then((r) => setCount(r.count)).catch(console.error)
  }, [filters])

  const [editingSize, setEditingSize] = useState(false)
  const [editValue, setEditValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const maxSize = Math.min(count ?? 1136, 1136)

  const startEditing = () => {
    setEditValue(String(panelSize))
    setEditingSize(true)
    requestAnimationFrame(() => inputRef.current?.select())
  }

  const commitEdit = () => {
    const v = parseInt(editValue, 10)
    if (!isNaN(v) && v >= 1 && v <= maxSize) {
      setPanelSize(v)
    }
    setEditingSize(false)
  }

  if (!options) return null

  const hasFilters = Object.values(filters).some((v) => v && v.length > 0)

  return (
    <div className="space-y-3">
      {/* Panel Size */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-1">
          <Label className="text-xs">Panel Size:</Label>
          {editingSize ? (
            <input
              ref={inputRef}
              type="number"
              min={1}
              max={maxSize}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit()
                if (e.key === "Escape") setEditingSize(false)
              }}
              className="w-14 bg-transparent border-b border-primary text-xs font-semibold outline-none tabular-nums px-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              autoFocus
            />
          ) : (
            <button
              onClick={startEditing}
              className="text-xs font-semibold tabular-nums hover:text-primary border-b border-transparent hover:border-primary transition-colors cursor-text"
              title="Click to type a value"
            >
              {panelSize}
            </button>
          )}
        </div>
        <Slider
          value={[panelSize]}
          onValueChange={([v]) => setPanelSize(v)}
          min={1}
          max={maxSize}
          step={panelSize < 12 ? 1 : panelSize < 50 ? 2 : panelSize < 200 ? 10 : 50}
        />
        {panelSize > 20 && (
          <div className="flex items-start gap-1.5 text-[10px] text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
            <span>Large panels use more API credits</span>
          </div>
        )}
      </div>

      <Separator />

      {/* Filters */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
          Filters
        </h3>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={clearFilters}>
            <X className="w-3 h-3 mr-0.5" /> Clear
          </Button>
        )}
      </div>

      {count !== null && (
        <Badge variant="secondary" className="text-[10px]">
          {count} respondents match
        </Badge>
      )}

      {FILTER_KEYS.map(({ key, label }) => {
        const vals = options[key] || []
        if (vals.length === 0) return null
        const selected = filters[key]
        return (
          <div key={key} className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">{label}</Label>
            <Select
              value={selected?.[0] ?? "__all__"}
              onValueChange={(v) => setFilter(key, v === "__all__" ? [] : [v])}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder={`All ${label}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                {vals.map((v) => (
                  <SelectItem key={v} value={v} className="text-xs">
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      })}
    </div>
  )
}
