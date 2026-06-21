import { Heap } from '@app/heap'

export const DocsCache = Heap.Table('t__knowledge-app__docCache__K2m9Qx', {
  key: Heap.String({
    customMeta: { title: 'Document filename' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  markdown: Heap.String({
    customMeta: { title: 'Document markdown' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  size: Heap.Number({
    customMeta: { title: 'Document size (bytes)' }
  }),
  lastModified: Heap.String({
    customMeta: { title: 'Document last modified (ISO)' }
  }),
  etag: Heap.String({
    customMeta: { title: 'Document etag' }
  }),
  instructions: Heap.Any({
    customMeta: { title: 'Parsed instructions from first markdown line' }
  }),
  cachedAt: Heap.Number({
    customMeta: { title: 'Cache update timestamp (ms)' }
  })
})

export default DocsCache

export type DocsCacheRow = typeof DocsCache.T
export type DocsCacheRowJson = typeof DocsCache.JsonT
