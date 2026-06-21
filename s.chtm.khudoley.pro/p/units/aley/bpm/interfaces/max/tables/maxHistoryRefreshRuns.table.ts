import { Heap } from '@app/heap'

export const MaxHistoryRefreshRuns = Heap.Table(
  't__units-aley-bpm-interfaces-max__max_history_refresh_run__L9r5Bn',
  {
    runId: Heap.String({
      customMeta: { title: 'History refresh run id' },
      searchable: { langs: ['en'], embeddings: false }
    }),
    scope: Heap.String({ customMeta: { title: 'chat | all_known' } }),
    chatId: Heap.String({ customMeta: { title: 'Chat id as string' } }),
    status: Heap.String({
      customMeta: { title: 'queued | deleting | fetching | succeeded | failed | cancelled' }
    }),
    phase: Heap.String({ customMeta: { title: 'delete_old_messages | fetch_messages | done' } }),
    requestedAt: Heap.Number({ customMeta: { title: 'Requested at' } }),
    startedAt: Heap.Number({ customMeta: { title: 'Started at' } }),
    finishedAt: Heap.Number({ customMeta: { title: 'Finished at' } }),
    cursorTimestamp: Heap.Number({ customMeta: { title: 'Cursor timestamp' } }),
    batchSize: Heap.Number({ customMeta: { title: 'Batch size' } }),
    deleted: Heap.Number({ customMeta: { title: 'Deleted rows' } }),
    fetched: Heap.Number({ customMeta: { title: 'Fetched messages' } }),
    inserted: Heap.Number({ customMeta: { title: 'Inserted messages' } }),
    batches: Heap.Number({ customMeta: { title: 'Fetch batches' } }),
    lastJobAt: Heap.Number({ customMeta: { title: 'Last job at' } }),
    nextJobAt: Heap.Number({ customMeta: { title: 'Next job at' } }),
    lastError: Heap.String({ customMeta: { title: 'Safe last error' } }),
    metadata: Heap.Any({ customMeta: { title: 'Metadata without secrets' } })
  }
)

export default MaxHistoryRefreshRuns

export type MaxHistoryRefreshRunsRow = typeof MaxHistoryRefreshRuns.T
export type MaxHistoryRefreshRunsRowJson = typeof MaxHistoryRefreshRuns.JsonT
