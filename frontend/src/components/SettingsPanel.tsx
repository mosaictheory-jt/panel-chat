import { useDebateStore } from "@/store/debateStore"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function SettingsPanel() {
  const { panelSize, numRounds, llmProvider, setPanelSize, setNumRounds, setLlmProvider } =
    useDebateStore()

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
        Settings
      </h3>

      <div className="space-y-2">
        <Label className="text-xs">Panel Size: {panelSize}</Label>
        <Slider
          value={[panelSize]}
          onValueChange={([v]) => setPanelSize(v)}
          min={2}
          max={12}
          step={1}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Rounds: {numRounds}</Label>
        <Slider
          value={[numRounds]}
          onValueChange={([v]) => setNumRounds(v)}
          min={1}
          max={5}
          step={1}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">LLM Provider</Label>
        <Select value={llmProvider} onValueChange={(v) => setLlmProvider(v as "anthropic" | "openai")}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="anthropic">Anthropic</SelectItem>
            <SelectItem value="openai">OpenAI</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
