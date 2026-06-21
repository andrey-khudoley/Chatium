import { Heap } from '@app/heap'

/**
 * Таблица ответов квиза App B — каждая строка — один сданный квиз.
 * Heap App B изолирован от других client'ов и от gateway/SDK.
 *
 * Содержит:
 * - идентификатор квиза (`quizId`) — позволяет иметь несколько квизов в будущем;
 * - ответы пользователя (`answers` JSON) — массив `{ questionId, value }`;
 * - результат опциональной синхронизации с GC (`gcSyncOk`, `gcSyncErrorCode`).
 */
export const QuizAnswers = Heap.Table('t__chatiumclub-client2__quiz_answer__9Hx2Ee', {
  quizId: Heap.String({
    customMeta: { title: 'ID квиза' }
  }),
  email: Heap.String({
    customMeta: { title: 'Email респондента' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  name: Heap.String({
    customMeta: { title: 'Имя респондента' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  answers: Heap.Any({
    customMeta: { title: 'Ответы (JSON)' }
  }),
  gcSyncOk: Heap.Boolean({
    customMeta: { title: 'Синхронизация с GC: ok' }
  }),
  gcSyncErrorCode: Heap.String({
    customMeta: { title: 'Синхронизация с GC: error.code' }
  }),
  gatewayRequestId: Heap.String({
    customMeta: { title: 'requestId gateway' }
  }),
  completedAt: Heap.Number({
    customMeta: { title: 'Завершено (Unix ms)' }
  })
})

export default QuizAnswers

export type QuizAnswersRow = typeof QuizAnswers.T
export type QuizAnswersRowJson = typeof QuizAnswers.JsonT
