import { Layout } from "@/components/Layout"
import { DebateView } from "@/components/DebateView"
import { ChatInput } from "@/components/ChatInput"
import { ScrollArea } from "@/components/ui/scroll-area"

function App() {
  return (
    <Layout>
      <ScrollArea className="flex-1 p-6">
        <DebateView />
      </ScrollArea>
      <div className="border-t p-4">
        <ChatInput />
      </div>
    </Layout>
  )
}

export default App
