// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const Comments = Heap.Table(
  'blog.comments._0JhthrYv',
  {
    postId: Heap.Optional(
      Heap.String({
        customMeta: { title: 'ID поста' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    userId: Heap.Optional(
      Heap.String({
        customMeta: { title: 'ID пользователя' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    content: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Текст комментария' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    authorName: Heap.Optional(Heap.String({ customMeta: { title: 'Имя автора комментария' } }))
  },
  { customMeta: { title: 'Комментарии к постам' } }
)

export default Comments

export type CommentsRow = typeof Comments.T
export type CommentsRowJson = typeof Comments.JsonT
