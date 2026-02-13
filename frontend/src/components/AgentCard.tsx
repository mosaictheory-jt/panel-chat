import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Markdown from "react-markdown"

interface AgentCardProps {
  agentName: string
  content: string
  roundNum: number
  isLoading?: boolean
}

export function AgentCard({ agentName, content, roundNum, isLoading }: AgentCardProps) {
  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{agentName}</CardTitle>
          <Badge variant="secondary" className="text-xs">
            Round {roundNum}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded w-full" />
            <div className="h-4 bg-muted animate-pulse rounded w-4/5" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/5" />
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-sm text-card-foreground">
            <Markdown>{content}</Markdown>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
