import { Heap } from '@app/heap'

export const LavaLockLog = Heap.Table('t__lava-gc-integration__lock-log__5Fm2Nt', {
  lock_key: Heap.String({ customMeta: { title: 'Ключ блокировки' } }),
  request_id: Heap.String({ customMeta: { title: 'Корреляционный ID' } }),
  gc_order_id: Heap.String({ customMeta: { title: 'Заказ GetCourse' } }),
  acquired_at: Heap.Number({ customMeta: { title: 'Lock получен (Unix ms)' } }),
  released_at: Heap.Number({ customMeta: { title: 'Lock снят (Unix ms)' } }),
  result: Heap.String({ customMeta: { title: 'Результат (success/timeout/error)' } }),
  error_message: Heap.String({ customMeta: { title: 'Текст ошибки' } })
})

export default LavaLockLog

export type LavaLockLogRow = typeof LavaLockLog.T
export type LavaLockLogRowJson = typeof LavaLockLog.JsonT
