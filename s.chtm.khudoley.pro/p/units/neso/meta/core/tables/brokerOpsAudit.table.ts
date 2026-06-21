import { Heap } from '@app/heap'

export const BrokerOpsAudit = Heap.Table('t__neso-meta__broker_ops_audit__7Rt8Lm', {
  auditId: Heap.String({
    customMeta: { title: 'Audit id' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  action: Heap.String({ customMeta: { title: 'Action' } }),
  targetType: Heap.String({ customMeta: { title: 'Target type' } }),
  targetId: Heap.String({ customMeta: { title: 'Target id' } }),
  adminUserId: Heap.String({ customMeta: { title: 'Admin user id' } }),
  reason: Heap.String({ customMeta: { title: 'Reason' } }),
  before: Heap.Any({ customMeta: { title: 'Safe before snapshot' } }),
  after: Heap.Any({ customMeta: { title: 'Safe after snapshot' } }),
  createdAt: Heap.Number({ customMeta: { title: 'Created at' } }),
  metadata: Heap.Any({ customMeta: { title: 'Metadata without secrets' } })
})

export default BrokerOpsAudit

export type BrokerOpsAuditRow = typeof BrokerOpsAudit.T
export type BrokerOpsAuditRowJson = typeof BrokerOpsAudit.JsonT
