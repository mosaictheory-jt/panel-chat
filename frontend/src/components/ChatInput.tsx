import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useSurvey } from "@/hooks/useSurvey"
import { useSurveyStore } from "@/store/surveyStore"
import { Send } from "lucide-react"

export function ChatInput() {
  const [input, setInput] = useState("")
  const { startSurvey } = useSurvey()
  const phase = useSurveyStore((s) => s.phase)
  const hasSettings = useSurveyStore((s) => s.hasRequiredSettings())
  const chatMode = useSurveyStore((s) => s.chatMode)

  const isBusy = phase === "analyzing" || phase === "running"
  const disabled = isBusy || !hasSettings

  const placeholder = !hasSettings
    ? "Configure API keys in settings"
    : chatMode === "debate"
      ? "Ask a question for the panel to debate..."
      : "Ask the panel a question..."

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = input.trim()
    if (!q || disabled) return
    setInput("")
    try {
      await startSurvey(q)
    } catch (err) {
      console.error("Failed to start survey:", err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button type="submit" disabled={disabled || !input.trim()} size="icon">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  )
}
