import { Heap } from '@app/heap'

/**
 * Связь «пользователь + проект задач» → фид чата с AI на странице задач.
 */
export const TaskAiChatFeeds = Heap.Table('t__assistant__task_ai_chat_feed__3Kp9mX', {
  userId: Heap.String({
    customMeta: { title: 'Владелец' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  projectId: Heap.String({
    customMeta: { title: 'ID проекта задач' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  feedId: Heap.String({
    customMeta: { title: 'UID фида Chatium' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  })
})

export default TaskAiChatFeeds

export type TaskAiChatFeedsRow = typeof TaskAiChatFeeds.T
export type TaskAiChatFeedsRowJson = typeof TaskAiChatFeeds.JsonT
