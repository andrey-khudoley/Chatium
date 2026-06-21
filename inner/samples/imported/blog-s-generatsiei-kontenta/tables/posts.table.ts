// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const Posts = Heap.Table(
  'blog.posts._hr6oKF5a',
  {
    title: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Заголовок поста' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    slug: Heap.Optional(
      Heap.String({
        customMeta: { title: 'URL-slug поста' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    content: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Содержимое поста' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    excerpt: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Краткое описание поста' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    coverImage: Heap.Optional(Heap.ImageFile({ customMeta: { title: 'Обложка поста' } })),
    published: Heap.Optional(
      Heap.Boolean({
        customMeta: { title: 'Опубликован' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    publishedAt: Heap.Optional(
      Heap.DateTime({
        customMeta: { title: 'Дата публикации' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    tags: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Теги (через запятую)' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    readingTime: Heap.Optional(Heap.Number({ customMeta: { title: 'Время на чтение (минуты)' } }))
  },
  { customMeta: { title: 'Посты блога' } }
)

export default Posts

export type PostsRow = typeof Posts.T
export type PostsRowJson = typeof Posts.JsonT
