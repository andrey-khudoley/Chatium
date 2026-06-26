import { Heap } from '@app/heap'

export const Diagnostics = Heap.Table('t__larina__task2606__diagnostics__x7Wr2L', {
  visitorId: Heap.Optional(
    Heap.String({
      customMeta: { title: 'ID визитёра (accountUserId)' }
    })
  ),
  ip: Heap.Optional(
    Heap.String({
      customMeta: { title: 'IP' }
    })
  ),
  url: Heap.Optional(
    Heap.String({
      customMeta: { title: 'URL без query' },
      searchable: { langs: ['ru', 'en'], embeddings: false }
    })
  ),
  params: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Query-параметры' }
    })
  ),
  dom: Heap.Optional(
    Heap.String({
      customMeta: { title: 'outerHTML без script/style/comments' }
    })
  ),
  info: Heap.Optional(
    Heap.Any({
      customMeta: { title: 'Прочие window-переменные (плоский JSON)' }
    })
  )
})

export default Diagnostics

export type DiagnosticsRow = typeof Diagnostics.T
export type DiagnosticsRowJson = typeof Diagnostics.JsonT
