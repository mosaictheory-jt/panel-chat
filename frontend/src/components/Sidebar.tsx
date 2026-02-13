import { useEffect } from "react"
import { useDebateStore } from "@/store/debateStore"
import { getDebate, listDebates } from "@/api/client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { FilterPanel } from "./FilterPanel"
import { Settings } from "lucide-react"
import type { AgentMessage, Respondent } from "@/types"

export function Sidebar() {
  const { history, setHistory, loadDebate, debateId, setSettingsOpen } = useDebateStore()

  useEffect(() => {
    listDebates().then(setHistory).catch(console.error)
  }, [setHistory])

  const handleSelectDebate = async (id: string) => {
    if (id === debateId) return
    try {
      const debate = await getDebate(id)
      loadDebate(
        debate.id,
        debate.question,
        debate.panel as unknown as Respondent[],
        debate.messages as AgentMessage[]
      )
    } catch (err) {
      console.error("Failed to load debate:", err)
    }
  }

  return (
    <div className="w-72 border-r flex flex-col h-full bg-sidebar">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">Panel Chat</h1>
          <p className="text-xs text-muted-foreground">
            AI-powered survey panel debates
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4 py-4">
        <FilterPanel />
        <Separator className="my-4" />

        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
          History
        </h3>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">No debates yet</p>
        ) : (
          <div className="space-y-2">
            {history.map((d) => (
              <button
                key={d.id}
                onClick={() => handleSelectDebate(d.id)}
                className={`w-full text-left rounded-md p-2 text-xs hover:bg-accent transition-colors ${
                  d.id === debateId ? "bg-accent" : ""
                }`}
              >
                <p className="font-medium truncate">{d.question}</p>
                <p className="text-muted-foreground mt-0.5">
                  {d.panel_size} panelists, {d.num_rounds} rounds
                </p>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
