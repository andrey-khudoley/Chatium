// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TDocConfigY55 = Heap.Table(
  't_doc_config_wXC',
  {
    key: Heap.Optional(Heap.String({ customMeta: { title: 'Config Key' } })),
    value: Heap.Optional(Heap.String({ customMeta: { title: 'Config Value' } })),
    description: Heap.Optional(Heap.String({ customMeta: { title: 'Description' } }))
  },
  { customMeta: { title: 'Configuration', description: 'Configuration' } }
)

export default TDocConfigY55

export type TDocConfigY55Row = typeof TDocConfigY55.T
export type TDocConfigY55RowJson = typeof TDocConfigY55.JsonT
