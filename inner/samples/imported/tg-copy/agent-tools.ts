import { replyInGroupChat } from './tools/replyInGroupChat'
import { sendImageToGroupChat } from './tools/sendImageToGroupChat'

/**
 * Регистрация инструментов для AI-агентов
 * Этот файл подключает инструменты к системе агентов Chatium
 */
app.accountHook('@start/agent/tools', async (ctx, params) => {
  return [replyInGroupChat, sendImageToGroupChat]
})
