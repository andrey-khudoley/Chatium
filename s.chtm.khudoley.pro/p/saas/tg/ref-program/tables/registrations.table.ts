// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TSaasRefProgramRegistration4Ab3Cd = Heap.Table(
  't__tg-ref-program__registration__4Ab3Cd',
  {
    campaignId: Heap.Optional(
      Heap.RefLink('t__tg-ref-program__campaign__8Hn4Lx', {
        customMeta: { title: 'Кампания' },
        onDelete: 'none'
      })
    ),
    ref: Heap.Optional(Heap.String({ customMeta: { title: 'Реферальный ID' } })),
    tgId: Heap.Optional(Heap.String({ customMeta: { title: 'Telegram ID' } })),
    gcId: Heap.Optional(Heap.String({ customMeta: { title: 'GetCourse ID' } })),
    name: Heap.Optional(Heap.String({ customMeta: { title: 'Имя' } })),
    email: Heap.Optional(Heap.String({ customMeta: { title: 'Email' } })),
    phone: Heap.Optional(Heap.String({ customMeta: { title: 'Телефон' } })),
    rawPayload: Heap.Optional(
      Heap.Any({
        customMeta: { title: 'Исходные данные webhook' }
      })
    )
  },
  { customMeta: { title: 'Регистрации', description: 'События регистрации' } }
)

export default TSaasRefProgramRegistration4Ab3Cd

export type TSaasRefProgramRegistration4Ab3CdRow = typeof TSaasRefProgramRegistration4Ab3Cd.T
export type TSaasRefProgramRegistration4Ab3CdRowJson =
  typeof TSaasRefProgramRegistration4Ab3Cd.JsonT
