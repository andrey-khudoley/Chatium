/**
 * Одноразовые пригласительные токены для доступа к панели GetCourse Gateway
 * (внутренняя система доступов, по модели sbp-client).
 *
 * Жизненный цикл: создан Admin → передан получателю → потреблён по `/web/access/invite`
 * → проставлены `usedAt`/`usedByUserId`. До потребления ссылка валидна любое число
 * открытий в пределах TTL и пока Admin не отозвал.
 *
 * Уникальность `token` платформа Heap в схеме не выражает — обеспечивается на уровне
 * приложения: токен генерируется случайно (длина ≥ 32), параллельные потребления
 * одного токена защищены `runWithExclusiveLock` в `lib/access/invites.consumeInvite`.
 *
 * `token` — searchable, поскольку основной путь чтения — поиск по строке из query.
 *
 * TTL `expiresAt = issuedAt + INVITE_TTL_DAYS дней` (константа в `lib/access/constants.ts`).
 *
 * Момент создания хранится в собственном поле `issuedAt` (Unix ms), а не `createdAt`:
 * имя `createdAt` зарезервировано Heap под системное поле (см. inner/docs/008-heap.md).
 */

import { Heap } from '@app/heap'

export const PanelInvites = Heap.Table('t__saas-gw-gc__pinvite__U7FaXD', {
  token: Heap.String({
    customMeta: { title: 'Пригласительный токен (≥ 32 символа, уникальный)' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  createdByUserId: Heap.String({
    customMeta: { title: "ID Admin'а, создавшего инвайт" }
  }),
  issuedAt: Heap.Number({
    customMeta: { title: 'Unix ms момента создания (createdAt зарезервировано Heap)' }
  }),
  expiresAt: Heap.Number({
    customMeta: { title: 'Unix ms момента истечения (issuedAt + INVITE_TTL_DAYS)' }
  }),
  usedAt: Heap.Optional(
    Heap.Number({
      customMeta: { title: 'Unix ms момента потребления (null если не использован)' }
    })
  ),
  usedByUserId: Heap.Optional(
    Heap.String({
      customMeta: { title: 'ID пользователя, использовавшего инвайт (null если не использован)' }
    })
  ),
  revokedAt: Heap.Optional(
    Heap.Number({
      customMeta: { title: "Unix ms момента отзыва Admin'ом (null если активен)" }
    })
  ),
  note: Heap.Optional(
    Heap.String({
      customMeta: { title: "Комментарий Admin'а при создании (например «для Ольги»)" }
    })
  )
})

export default PanelInvites

export type PanelInvitesRow = typeof PanelInvites.T
export type PanelInvitesRowJson = typeof PanelInvites.JsonT
