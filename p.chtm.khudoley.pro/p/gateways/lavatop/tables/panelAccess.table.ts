/**
 * Выданные доступы к панели Lava.Top Gateway для не-Admin пользователей
 * (внутренняя система доступов, по модели lifepay/sbp-client).
 *
 * Одна запись на пользователя. Admin Chatium-аккаунта проходит проверку
 * `requireInternalAccess` без записи в этой таблице.
 *
 * Уникальность `userId` платформа Heap в схеме не выражает — обеспечивается
 * на уровне приложения: в `lib/access/invites.consumeInvite` перед созданием
 * записи проверяется отсутствие активного grant.
 *
 * Запись с непустым `revokedAt` считается недействительной (`requireInternalAccess`
 * возвращает 403).
 */

import { Heap } from '@app/heap'

export const PanelAccess = Heap.Table('t__saas-gw-lavatop__paccess__W2dB5m', {
  userId: Heap.String({
    customMeta: { title: 'ID пользователя, которому выдан доступ (уникальный)' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  grantedAt: Heap.Number({
    customMeta: { title: 'Unix ms момента выдачи доступа' }
  }),
  grantedByUserId: Heap.String({
    customMeta: { title: "ID Admin'а, через инвайт которого выдан доступ" }
  }),
  inviteId: Heap.String({
    customMeta: { title: 'ID использованного инвайта (panel_invites.id, для аудита)' }
  }),
  revokedAt: Heap.Optional(
    Heap.Number({
      customMeta: { title: 'Unix ms момента отзыва доступа (null если активен)' }
    })
  ),
  revokedByUserId: Heap.Optional(
    Heap.String({
      customMeta: { title: 'ID пользователя, отозвавшего доступ (null если активен)' }
    })
  )
})

export default PanelAccess

export type PanelAccessRow = typeof PanelAccess.T
export type PanelAccessRowJson = typeof PanelAccess.JsonT
