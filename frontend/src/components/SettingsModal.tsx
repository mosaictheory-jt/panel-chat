import { useSurveyStore } from "@/store/surveyStore"
import { MODEL_OPTIONS, PROVIDER_NAMES, getProviderKey } from "@/types"
import type { ProviderName } from "@/types"
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
import { AlertTriangle, Check } from "lucide-react"

export function SettingsModal() {
  const {
    settingsOpen,
    setSettingsOpen,
    apiKeys,
    setApiKey,
    selectedModels,
    setSelectedModels,
    analyzerModel,
    setAnalyzerModel,
    panelSize,
    setPanelSize,
  } = useSurveyStore()

  const toggleModel = (modelValue: string) => {
    if (selectedModels.includes(modelValue)) {
      setSelectedModels(selectedModels.filter((m) => m !== modelValue))
    } else {
      setSelectedModels([...selectedModels, modelValue])
    }
  }

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* API Keys — one per provider */}
          {PROVIDER_NAMES.map((provider: ProviderName) => {
            const keyField = getProviderKey(provider)
            return (
              <div key={provider} className="space-y-2">
                <Label className="text-sm">{provider} API Key</Label>
                <Input
                  type="password"
                  value={apiKeys[keyField]}
                  onChange={(e) => setApiKey(keyField, e.target.value)}
                  placeholder={`Enter your ${provider} API key`}
                />
              </div>
            )
          })}

          <p className="text-xs text-muted-foreground">
            Keys are stored locally and sent directly to providers. Only configure the providers you want to use.
          </p>

          {/* Response Models — multi-select checkboxes */}
          <div className="space-y-2">
            <Label className="text-sm">Response Models</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select one or more models. Each panelist will respond once per selected model.
            </p>
            <div className="space-y-1">
              {PROVIDER_NAMES.map((provider) => {
                const providerModels = MODEL_OPTIONS.filter((m) => m.provider === provider)
                const keyField = getProviderKey(provider)
                const hasKey = apiKeys[keyField].length > 0
                return (
                  <div key={provider}>
                    <p className="text-xs font-medium text-muted-foreground mt-2 mb-1">
                      {provider} {!hasKey && "(no key)"}
                    </p>
                    {providerModels.map((m) => {
                      const isSelected = selectedModels.includes(m.value)
                      return (
                        <button
                          key={m.value}
                          onClick={() => toggleModel(m.value)}
                          disabled={!hasKey}
                          className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors ${
                            isSelected
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-accent"
                          } ${!hasKey ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-input"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          {m.label}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Analyzer Model — single select */}
          <div className="space-y-2">
            <Label className="text-sm">Analyzer Model</Label>
            <p className="text-xs text-muted-foreground">
              Used to break down your question into sub-questions.
            </p>
            <Select value={analyzerModel} onValueChange={setAnalyzerModel}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_NAMES.map((p) => (
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
        </div>

        <Button onClick={() => setSettingsOpen(false)} className="w-full">
          Save
        </Button>
      </DialogContent>
    </Dialog>
  )
}
