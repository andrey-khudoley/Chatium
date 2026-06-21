// Fork проекта half: уникальные Heap ID отдельно от liveahalf (не делить таблицы между копиями).
import { Heap } from '@app/heap'

export const TPUnitsGoncharovLpHalfRegistrationsN4p = Heap.Table(
  't_p_units_goncharov_lp_half_registrations_n4p',
  {
    name: Heap.Optional(
      Heap.String({ customMeta: { title: 'Имя' }, searchable: { langs: ['ru', 'en'] } })
    ),
    email: Heap.Optional(
      Heap.String({ customMeta: { title: 'Email' }, searchable: { langs: ['ru', 'en'] } })
    ),
    phone: Heap.Optional(
      Heap.String({ customMeta: { title: 'Телефон' }, searchable: { langs: ['ru', 'en'] } })
    ),
    utmSource: Heap.Optional(Heap.String({ customMeta: { title: 'UTM Source' } })),
    utmMedium: Heap.Optional(Heap.String({ customMeta: { title: 'UTM Medium' } })),
    utmCampaign: Heap.Optional(Heap.String({ customMeta: { title: 'UTM Campaign' } })),
    utmContent: Heap.Optional(Heap.String({ customMeta: { title: 'UTM Content' } })),
    utmTerm: Heap.Optional(Heap.String({ customMeta: { title: 'UTM Term' } }))
  },
  { customMeta: { title: 'registrations.table.ts', description: '' } }
)

export default TPUnitsGoncharovLpHalfRegistrationsN4p

export type TPUnitsGoncharovLpHalfRegistrationsN4pRow =
  typeof TPUnitsGoncharovLpHalfRegistrationsN4p.T
export type TPUnitsGoncharovLpHalfRegistrationsN4pRowJson =
  typeof TPUnitsGoncharovLpHalfRegistrationsN4p.JsonT
