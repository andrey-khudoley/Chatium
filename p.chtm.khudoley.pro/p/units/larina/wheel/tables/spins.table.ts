import { Heap } from '@app/heap'
import Segments from './segments.table'

export const Spins = Heap.Table('t__larina-wheel__spin__7AabM8', {
  email: Heap.String({
    customMeta: { title: 'Email пользователя (нормализованный)' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  segment: Heap.RefLink(Segments, {
    customMeta: { title: 'Выигранный сегмент' },
    onDelete: 'none'
  }),
  timestamp: Heap.Number({
    customMeta: { title: 'Время вращения (Unix ms)' }
  })
})

export default Spins

export type SpinsRow = typeof Spins.T
export type SpinsRowJson = typeof Spins.JsonT
