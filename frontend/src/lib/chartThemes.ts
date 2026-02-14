export interface ChartTheme {
  id: string
  name: string
  colors: string[]
}

export const CHART_THEMES: ChartTheme[] = [
  {
    id: "indigo",
    name: "Indigo",
    colors: ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#4f46e5", "#4338ca", "#3730a3", "#312e81"],
  },
  {
    id: "spectrum",
    name: "Spectrum",
    colors: ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6"],
  },
  {
    id: "ocean",
    name: "Ocean",
    colors: ["#0ea5e9", "#06b6d4", "#14b8a6", "#2dd4bf", "#38bdf8", "#67e8f9", "#0284c7", "#0369a1"],
  },
  {
    id: "sunset",
    name: "Sunset",
    colors: ["#f97316", "#fb923c", "#f59e0b", "#fbbf24", "#ef4444", "#f87171", "#dc2626", "#ea580c"],
  },
  {
    id: "forest",
    name: "Forest",
    colors: ["#22c55e", "#16a34a", "#15803d", "#4ade80", "#86efac", "#166534", "#a3e635", "#65a30d"],
  },
  {
    id: "berry",
    name: "Berry",
    colors: ["#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#c084fc", "#e879f9", "#f472b6", "#9333ea"],
  },
  {
    id: "earth",
    name: "Earth",
    colors: ["#92400e", "#b45309", "#d97706", "#ca8a04", "#a16207", "#78716c", "#57534e", "#44403c"],
  },
  {
    id: "neon",
    name: "Neon",
    colors: ["#00ff87", "#00d4ff", "#ff00e5", "#ffe600", "#ff6b00", "#7c3aed", "#06b6d4", "#f43f5e"],
  },
  {
    id: "pastel",
    name: "Pastel",
    colors: ["#93c5fd", "#c4b5fd", "#f9a8d4", "#fda4af", "#fcd34d", "#86efac", "#a5f3fc", "#d8b4fe"],
  },
  {
    id: "slate",
    name: "Slate",
    colors: ["#475569", "#64748b", "#94a3b8", "#cbd5e1", "#334155", "#1e293b", "#0f172a", "#e2e8f0"],
  },
]

const STORAGE_KEY = "panel-chat-chart-theme"
const DEFAULT_THEME_ID = "spectrum"

export function getStoredChartThemeId(): string {
  if (typeof window === "undefined") return DEFAULT_THEME_ID
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME_ID
}

export function storeChartThemeId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id)
}

export function getChartTheme(id: string): ChartTheme {
  return CHART_THEMES.find((t) => t.id === id) ?? CHART_THEMES[1]
}
