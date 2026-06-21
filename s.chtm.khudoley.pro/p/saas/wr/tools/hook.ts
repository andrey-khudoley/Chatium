import { getAutowebinarTextAroundTimeTool } from './getAutowebinarTextAroundTime'
import { searchAutowebinarTextTool } from './searchAuthowebinarText'
import { sendMessageToAutowebinarChatTool } from './sendMessageToAutowebinarChat'

// Регистрируем тулы для агентов
app.accountHook('@start/agent/tools', async (ctx) => {
  return [
    sendMessageToAutowebinarChatTool,
    searchAutowebinarTextTool,
    getAutowebinarTextAroundTimeTool
  ]
})
