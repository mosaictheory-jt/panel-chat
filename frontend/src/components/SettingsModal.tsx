import { useDebateStore } from "@/store/debateStore"
import { MODEL_OPTIONS } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle } from "lucide-react"

const PROVIDERS = ["Anthropic", "OpenAI", "Google"] as const

function getProviderForModel(model: string) {
  return MODEL_OPTIONS.find((m) => m.value === model)?.provider ?? "Anthropic"
}

export function SettingsModal() {
  const {
    settingsOpen,
    setSettingsOpen,
    apiKey,
    setApiKey,
    model,
    setModel,
    panelSize,
    setPanelSize,
    numRounds,
    setNumRounds,
  } = useDebateStore()

  const provider = getProviderForModel(model)

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Model selector */}
          <div className="space-y-2">
            <Label className="text-sm">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectGroup key={p}>
                    <SelectLabel>{p}</SelectLabel>
                    {MODEL_OPTIONS.filter((m) => m.provider === p).map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label className="text-sm">API Key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${provider} API key`}
            />
            <p className="text-xs text-muted-foreground">
              Required for {provider}. Your key is stored locally and sent directly to the provider.
            </p>
          </div>

          {/* Panel Size */}
          <div className="space-y-2">
            <Label className="text-sm">Panel Size: {panelSize}</Label>
            <Slider
              value={[panelSize]}
              onValueChange={([v]) => setPanelSize(v)}
              min={2}
              max={1136}
              step={panelSize < 12 ? 1 : panelSize < 50 ? 2 : panelSize < 200 ? 10 : 50}
            />
            {panelSize > 20 && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-2 text-xs text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Large panels will be slow and use significant API credits</span>
              </div>
            )}
          </div>

          {/* Rounds */}
          <div className="space-y-2">
            <Label className="text-sm">Rounds: {numRounds}</Label>
            <Slider
              value={[numRounds]}
              onValueChange={([v]) => setNumRounds(v)}
              min={1}
              max={5}
              step={1}
            />
          </div>
        </div>

        <Button onClick={() => setSettingsOpen(false)} className="w-full">
          Save
        </Button>
      </DialogContent>
    </Dialog>
  )
}
