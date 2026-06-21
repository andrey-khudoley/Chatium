import { Heap } from '@app/heap'

/**
 * Таблица для хранения активных taskId джобов
 * Каждая запись = один активный джоб
 * Это исключает race condition при одновременном добавлении/удалении
 */
export const ActiveJobs = Heap.Table('active_jobs_b5c8d9e1', {
  // Уникальный taskId джоба (строка для совместимости)
  taskId: Heap.String({
    customMeta: { title: 'ID задачи (taskId)' }
  }),

  // Тип джоба (опционально, для отладки)
  jobType: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Тип джоба (например, monitor-events, load-cache-batch)' }
    })
  ),

  // ID родительского джоба (опционально, для цепочек джобов)
  parentTaskId: Heap.Optional(
    Heap.String({
      customMeta: { title: 'ID родительского джоба' }
    })
  ),

  // Дополнительная информация (опционально)
  metadata: Heap.Optional(
    Heap.Any({
      customMeta: { title: 'Дополнительная информация о джобе' }
    })
  )

  // createdAt и updatedAt добавляются автоматически Heap
})

/**
 * Получить все активные джобы
 */
export async function getAllActiveJobs(ctx: app.Ctx) {
  return await ActiveJobs.findAll(ctx, {
    order: { createdAt: 'desc' }
  })
}

/**
 * Получить список активных taskId
 */
export async function getActiveTaskIds(ctx: app.Ctx): Promise<string[]> {
  const records = await ActiveJobs.findAll(ctx)
  return records.map((r) => r.taskId)
}

export default ActiveJobs
