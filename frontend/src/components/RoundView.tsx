import type { AgentMessage } from "@/types"
import { AgentCard } from "./AgentCard"
import { Separator } from "@/components/ui/separator"

interface RoundViewProps {
  roundNum: number
  messages: AgentMessage[]
}

export function RoundView({ roundNum, messages }: RoundViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-sm font-medium text-muted-foreground">
          Round {roundNum}
        </span>
        <Separator className="flex-1" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {messages.map((msg) => (
          <AgentCard
            key={msg.respondent_id + "-" + msg.round_num}
            agentName={msg.agent_name}
            content={msg.content}
            roundNum={msg.round_num}
          />
        ))}
      </div>
    </div>
  )
}
