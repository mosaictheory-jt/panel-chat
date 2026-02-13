import { Layout } from "@/components/Layout"
import { SurveyView } from "@/components/SurveyView"
import { ChatInput } from "@/components/ChatInput"
import { SettingsModal } from "@/components/SettingsModal"

function App() {
  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-6">
        <SurveyView />
      </div>
      <div className="border-t p-4 shrink-0">
        <ChatInput />
      </div>
      <SettingsModal />
    </Layout>
  )
}

export default App
