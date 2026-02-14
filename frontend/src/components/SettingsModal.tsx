import { useSurveyStore } from "@/store/surveyStore"
import { MODEL_OPTIONS, PROVIDER_NAMES, getProviderKey, getModelMaxTemp } from "@/types"
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
import { Switch } from "@/components/ui/switch"
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
import { Check, Thermometer } from "lucide-react"

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
    modelTemperatures,
    setModelTemperature,
    personaMemory,
    setPersonaMemory,
  } = useSurveyStore()

  const toggleModel = (modelValue: string) => {
    if (selectedModels.includes(modelValue)) {
      setSelectedModels(selectedModels.filter((m) => m !== modelValue))
    } else {
      setSelectedModels([...selectedModels, modelValue])
      // Set default temperature to max if not already set
      if (modelTemperatures[modelValue] === undefined) {
        setModelTemperature(modelValue, getModelMaxTemp(modelValue))
      }
    }
  }

  const getTemp = (modelValue: string): number => {
    return modelTemperatures[modelValue] ?? getModelMaxTemp(modelValue)
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

          {/* Response Models — multi-select checkboxes with temperature */}
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
                      const temp = getTemp(m.value)
                      return (
                        <div key={m.value}>
                          <button
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

                          {/* Temperature slider — shown when model is selected */}
                          {isSelected && (
                            <div className="flex items-center gap-3 pl-8 pr-2 py-1.5">
                              <Thermometer className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <Slider
                                value={[temp]}
                                onValueChange={([v]) => setModelTemperature(m.value, v)}
                                min={0}
                                max={m.maxTemp}
                                step={0.1}
                                className="flex-1"
                              />
                              <span className="text-xs tabular-nums w-8 text-right text-muted-foreground">
                                {temp.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
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

          {/* Persona Memory */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm">Persona Memory</Label>
              <p className="text-xs text-muted-foreground">
                Personas recall their past survey answers when responding.
              </p>
            </div>
            <Switch
              checked={personaMemory}
              onCheckedChange={setPersonaMemory}
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
