import { Heap } from '@app/heap'

/**
 * Ответы посетителей на открытые вопросы КП (публичные «комментарии»).
 *
 * Каждая запись — один ответ на один вопрос. Привязка к вопросу — строкой
 * `questionId` (стабильные id заданы в `shared/content.ts`, без RefLink,
 * чтобы не создавать циклов и лишних таблиц).
 *
 * Писать может любой посетитель, включая анонимного (см. `api/answers/create.ts`,
 * `requireAnyUser`). `authorType` фиксирует, был ли автор реальным пользователем.
 * Системные поля `id`, `createdAt`, `updatedAt` добавляются Heap автоматически —
 * не объявляем. Для стабильной сортировки храним собственный `createdAtMs`.
 */
export const Answers = Heap.Table(
  't__ipsen-kp__answers__q7Kp2Za',
  {
    questionId: Heap.String({
      customMeta: { title: 'ID вопроса' }
    }),
    text: Heap.String({
      customMeta: { title: 'Текст ответа' },
      searchable: { langs: ['ru', 'en'], embeddings: false }
    }),
    authorName: Heap.String({
      customMeta: { title: 'Имя автора' },
      searchable: { langs: ['ru', 'en'], embeddings: false }
    }),
    authorUserId: Heap.String({
      customMeta: { title: 'ID автора (Chatium)' }
    }),
    authorType: Heap.String({
      customMeta: { title: 'Тип автора (Real/Anonymous/Bot)' }
    }),
    createdAtMs: Heap.Number({
      customMeta: { title: 'Создано (Unix ms)' }
    })
  },
  { customMeta: { title: 'Ответы на открытые вопросы' } }
)

export default Answers

export type AnswerRow = typeof Answers.T
export type AnswerRowJson = typeof Answers.JsonT
