import { Heap } from '@app/heap'

export const BrokerEventContracts = Heap.Table(
  't__template-metaproject__broker_event_contract__4Qr9Tx',
  {
    contractKey: Heap.String({
      customMeta: { title: 'Contract key eventType@eventVersion' },
      searchable: { langs: ['en'], embeddings: false }
    }),
    ownerModule: Heap.String({ customMeta: { title: 'Owner module' } }),
    eventType: Heap.String({ customMeta: { title: 'Event type' } }),
    eventVersion: Heap.Number({ customMeta: { title: 'Event version' } }),
    status: Heap.String({ customMeta: { title: 'active | deprecated | retired' } }),
    payloadSchemaFormat: Heap.String({ customMeta: { title: 'Payload schema format' } }),
    payloadSchema: Heap.Any({ customMeta: { title: 'Payload schema snapshot' } }),
    schemaHash: Heap.String({ customMeta: { title: 'Schema hash' } }),
    sourceRef: Heap.Any({ customMeta: { title: 'Module-owned source reference' } }),
    display: Heap.Any({ customMeta: { title: 'Display metadata' } }),
    examples: Heap.Any({ customMeta: { title: 'Examples' } }),
    description: Heap.String({ customMeta: { title: 'Description' } }),
    createdAt: Heap.Number({ customMeta: { title: 'Created at' } }),
    updatedAt: Heap.Number({ customMeta: { title: 'Updated at' } }),
    deprecatedAt: Heap.Number({ customMeta: { title: 'Deprecated at' } }),
    metadata: Heap.Any({ customMeta: { title: 'Metadata without secrets' } })
  }
)

export default BrokerEventContracts

export type BrokerEventContractsRow = typeof BrokerEventContracts.T
export type BrokerEventContractsRowJson = typeof BrokerEventContracts.JsonT
