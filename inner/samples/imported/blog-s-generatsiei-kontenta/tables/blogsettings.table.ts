// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const BlogSettings = Heap.Table(
  'blog.settings._gVpf1jvH',
  {
    key: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Ключ настройки' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    value: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Значение настройки' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    description: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Описание настройки' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    )
  },
  { customMeta: { title: 'Настройки блога' } }
)

export default BlogSettings

export type BlogSettingsRow = typeof BlogSettings.T
export type BlogSettingsRowJson = typeof BlogSettings.JsonT
