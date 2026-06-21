// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TKSharedSettings = Heap.Table(
  't_k_shared_settings',
  {
    key: Heap.Optional(
      Heap.String({ customMeta: { title: 'Setting Key' }, searchable: { langs: ['ru', 'en'], embeddings: true } }),
    ),
    value: Heap.Optional(
      Heap.String({ customMeta: { title: 'Setting Value' }, searchable: { langs: ['ru', 'en'], embeddings: true } }),
    ),
  },
  { customMeta: { title: 'Settings', description: 'Settings' } },
)

export default TKSharedSettings

export type TKSharedSettingsRow = typeof TKSharedSettings.T
export type TKSharedSettingsRowJson = typeof TKSharedSettings.JsonT
