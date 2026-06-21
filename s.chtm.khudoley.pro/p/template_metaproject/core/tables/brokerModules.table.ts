import { Heap } from '@app/heap'

export const BrokerModules = Heap.Table('t__template-metaproject__broker_module__3Mn7Qx', {
  moduleKey: Heap.String({
    customMeta: { title: 'Module key' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  displayName: Heap.String({ customMeta: { title: 'Display name' } }),
  kind: Heap.String({ customMeta: { title: 'core | interface | domain | worker | external' } }),
  enabled: Heap.Boolean({ customMeta: { title: 'Declared enabled' } }),
  adminDisabled: Heap.Boolean({ customMeta: { title: 'Admin disabled' } }),
  adminDisabledAt: Heap.Number({ customMeta: { title: 'Admin disabled at' } }),
  adminDisableReason: Heap.String({ customMeta: { title: 'Admin disable reason' } }),
  allowedPublishTypes: Heap.Any({ customMeta: { title: 'Allowed publish type patterns' } }),
  allowedSubscribeTypes: Heap.Any({ customMeta: { title: 'Allowed subscribe type patterns' } }),
  createdAt: Heap.Number({ customMeta: { title: 'Created at' } }),
  updatedAt: Heap.Number({ customMeta: { title: 'Updated at' } }),
  metadata: Heap.Any({ customMeta: { title: 'Metadata without secrets' } })
})

export default BrokerModules

export type BrokerModulesRow = typeof BrokerModules.T
export type BrokerModulesRowJson = typeof BrokerModules.JsonT
