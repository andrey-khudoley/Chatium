import { Heap } from '@app/heap'

/**
 * Служебная таблица состояния job батч-матчинга
 * Хранит время следующего запуска и taskId для отмены/перепланирования
 */
export const BatchAttributionState = Heap.Table(
  't__tg_channel_analytics__batch_attribution_state__c7d8e9f0',
  {
    key: Heap.String({
      customMeta: { title: 'Ключ состояния job' }
    }),
    lastRunAt: Heap.Optional(
      Heap.DateTime({
        customMeta: { title: 'Время последнего запуска' }
      })
    ),
    nextRunAt: Heap.Optional(
      Heap.DateTime({
        customMeta: { title: 'Запланированное время следующего запуска' }
      })
    ),
    nextTaskId: Heap.Optional(
      Heap.String({
        customMeta: { title: 'ID запланированной задачи (taskId)' }
      })
    )
  }
)

export default BatchAttributionState
