import { Heap } from '@app/heap'

/** KV-состояние инструментов фокуса на пользователя (см. shared/focus-tools-types.ts, ключ USER_TOOL_STATE_KEY). */
export const UserToolState = Heap.Table('t__assistant__user_tool_state__7Kp3mN', {
  userId: Heap.String({
    customMeta: { title: 'Владелец' },
    searchable: { langs: ['ru', 'en'], embeddings: false },
  }),
  key: Heap.String({
    customMeta: { title: 'Ключ записи' },
    searchable: { langs: ['ru', 'en'], embeddings: false },
  }),
  value: Heap.Any({ customMeta: { title: 'JSON-обёртка {type, schema, data}' } }),
  updatedAtMs: Heap.Number({ customMeta: { title: 'Обновлено (ms)' } }),
})

export default UserToolState

export type UserToolStateRow = typeof UserToolState.T
export type UserToolStateRowJson = typeof UserToolState.JsonT
