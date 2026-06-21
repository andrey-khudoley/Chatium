// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TPUnitsGoncharovLpLiveahalfLiveahalfRegistrationsJwp = Heap.Table(
  't_p_units_goncharov_lp_liveahalf_liveahalf_registrations_jwp',
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

export default TPUnitsGoncharovLpLiveahalfLiveahalfRegistrationsJwp

export type TPUnitsGoncharovLpLiveahalfLiveahalfRegistrationsJwpRow =
  typeof TPUnitsGoncharovLpLiveahalfLiveahalfRegistrationsJwp.T
export type TPUnitsGoncharovLpLiveahalfLiveahalfRegistrationsJwpRowJson =
  typeof TPUnitsGoncharovLpLiveahalfLiveahalfRegistrationsJwp.JsonT
