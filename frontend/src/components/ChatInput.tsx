import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useDebate } from "@/hooks/useDebate"
import { useDebateStore } from "@/store/debateStore"
import { Send } from "lucide-react"

export function ChatInput() {
  const [input, setInput] = useState("")
  const { startDebate } = useDebate()
  const isRunning = useDebateStore((s) => s.isRunning)
  const hasSettings = useDebateStore((s) => s.hasRequiredSettings())

  const disabled = isRunning || !hasSettings

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = input.trim()
    if (!q || disabled) return
    setInput("")
    try {
      await startDebate(q)
    } catch (err) {
      console.error("Failed to start debate:", err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={hasSettings ? "Ask the panel a question..." : "Configure API key in settings"}
        disabled={disabled}
        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button type="submit" disabled={disabled || !input.trim()} size="icon">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  )
}
