import { Heap } from '@app/heap'

/**
 * Клиенты для иерархии «клиент → проект → задача» (привязка к пользователю).
 */
export const TaskClients = Heap.Table('t__assistant__task_client__7Hk3mN', {
  userId: Heap.String({
    customMeta: { title: 'Владелец' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  name: Heap.String({
    customMeta: { title: 'Название клиента' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  sortOrder: Heap.Number({
    customMeta: { title: 'Порядок в списке' }
  })
})

export default TaskClients

export type TaskClientsRow = typeof TaskClients.T
export type TaskClientsRowJson = typeof TaskClients.JsonT
