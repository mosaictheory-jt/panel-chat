/**
 * Deterministic fun avatar generator for respondents.
 * Uses role/industry to pick a consistent emoji and background color.
 */

const AVATARS = [
  "🦊", "🐼", "🦉", "🐙", "🦈", "🐳", "🦁", "🐯",
  "🦄", "🐲", "🦅", "🐧", "🦜", "🐬", "🦋", "🐢",
  "🦇", "🐺", "🦎", "🐸", "🦩", "🐝", "🦀", "🐿️",
  "🦦", "🐨", "🦥", "🐮", "🦘", "🐷",
]

const BG_COLORS = [
  "bg-rose-100 text-rose-700",
  "bg-pink-100 text-pink-700",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-purple-100 text-purple-700",
  "bg-violet-100 text-violet-700",
  "bg-indigo-100 text-indigo-700",
  "bg-blue-100 text-blue-700",
  "bg-sky-100 text-sky-700",
  "bg-cyan-100 text-cyan-700",
  "bg-teal-100 text-teal-700",
  "bg-emerald-100 text-emerald-700",
  "bg-green-100 text-green-700",
  "bg-lime-100 text-lime-700",
  "bg-yellow-100 text-yellow-700",
  "bg-amber-100 text-amber-700",
  "bg-orange-100 text-orange-700",
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit int
  }
  return Math.abs(hash)
}

export function getAvatar(id: number, role: string | null): { emoji: string; colorClass: string } {
  const seed = hashString(`${id}-${role ?? "unknown"}`)
  return {
    emoji: AVATARS[seed % AVATARS.length],
    colorClass: BG_COLORS[seed % BG_COLORS.length],
  }
}
