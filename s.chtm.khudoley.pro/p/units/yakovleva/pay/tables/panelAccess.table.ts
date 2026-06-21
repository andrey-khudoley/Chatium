/**
 * Выданные доступы к панели для не-Admin пользователей
 * (implementation-plan §1.11.1, ADR 0003).
 *
 * Одна запись на пользователя. Admin Chatium-аккаунта проходит проверку
 * `requireInternalAccess` без записи в этой таблице (§1.11.2).
 *
 * Уникальность `userId` платформа Heap не выражает в схеме — обеспечивается
 * на уровне приложения: в `lib/access/invites.consumeInvite` перед созданием
 * записи проверяется отсутствие активного grant (см. §1.11.3, шаг 5).
 *
 * `userId` — searchable, поскольку основной путь чтения — поиск по ID при
 * проверке прав (`requireInternalAccess`).
 *
 * Запись с непустым `revokedAt` считается недействительной (`requireInternalAccess`
 * возвращает 403). При выдаче нового доступа тому же пользователю обновлять
 * существующую запись, сбрасывая `revokedAt`/`revokedByUserId` и проставляя
 * новые `grantedAt`/`grantedByUserId`/`inviteId`.
 */

import { Heap } from '@app/heap'

// Rebuild Heap registry after project path migration to p/units/yakovleva/pay.
export const PanelAccess = Heap.Table('t__yakovleva-pay__paccess__g7Cy3M', {
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
