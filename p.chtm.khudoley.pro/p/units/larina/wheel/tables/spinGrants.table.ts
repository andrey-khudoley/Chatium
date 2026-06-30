import { Heap } from '@app/heap'

export const SpinGrants = Heap.Table('t__larina-wheel__spinGrant__CpgY7S', {
  email: Heap.String({
    customMeta: { title: 'Email пользователя (нормализованный)' }
  }),
  count: Heap.Number({
    customMeta: { title: 'Количество дополнительных попыток' }
  }),
  grantedAt: Heap.Number({
    customMeta: { title: 'Время выдачи (Unix ms)' }
  })
})

export default SpinGrants

export type SpinGrantsRow = typeof SpinGrants.T
export type SpinGrantsRowJson = typeof SpinGrants.JsonT
