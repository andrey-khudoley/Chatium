// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TMdxEditorDocumentsEYy = Heap.Table(
  't_mdxEditor_documents_zFY',
  {
    title: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Название' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    slug: Heap.Optional(
      Heap.String({
        customMeta: { title: 'URL идентификатор' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    type: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Тип' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    mdxCode: Heap.Optional(
      Heap.String({
        customMeta: { title: 'MDX код' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    userId: Heap.Optional(Heap.UserRefLink({ customMeta: { title: 'Автор' } })),
    parentId: Heap.Optional(
      Heap.RefLink('t_mdxEditor_documents_zFY', { customMeta: { title: 'Родительская страница' } })
    ),
    order: Heap.Optional(
      Heap.Number({
        customMeta: { title: 'Порядок сортировки' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    icon: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Иконка' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    imageHash: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Изображение (hash)' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    isPublished: Heap.Optional(
      Heap.Boolean({
        customMeta: { title: 'Опубликовано' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    )
  },
  { customMeta: { title: 'documents.table.ts', description: 'documents.table.ts' } }
)

export default TMdxEditorDocumentsEYy

export type TMdxEditorDocumentsEYyRow = typeof TMdxEditorDocumentsEYy.T
export type TMdxEditorDocumentsEYyRowJson = typeof TMdxEditorDocumentsEYy.JsonT
