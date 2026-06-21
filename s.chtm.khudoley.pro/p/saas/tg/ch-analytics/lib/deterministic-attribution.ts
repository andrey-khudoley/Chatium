// @shared
import { TrackingLinks } from '../tables/tracking-links.table'
import { LinkClicks } from '../tables/link-clicks.table'
import { JoinEvents } from '../tables/join-events.table'
import { Debug } from '../shared/debug'

/**
 * Минимальная длина префикса invite_link для поиска TrackingLink
 * Используется для совпадения начала invite_link
 */
const MIN_INVITE_LINK_PREFIX_LENGTH = 20

/**
 * Находит TrackingLink по совпадению начала invite_link
 *
 * Для закрытых каналов (без chat.username) Telegram передаёт полный invite_link в webhook,
 * который можно сопоставить с invite_link, сохранённым в TrackingLinks.
 *
 * Алгоритм:
 * 1. Ищем TrackingLink, у которого inviteLink начинается с первых N символов inviteLink из webhook
 * 2. Или наоборот: inviteLink из webhook начинается с inviteLink из TrackingLink
 * 3. Возвращаем первый найденный TrackingLink и соответствующий LinkClick
 *
 * @param ctx - контекст
 * @param projectId - ID проекта
 * @param inviteLink - invite_link из webhook
 * @returns объект с trackingLink и linkClick, или null если не найдено
 */
export async function findTrackingLinkByInviteLink(
  ctx: RichUgcCtx,
  projectId: string,
  inviteLink: string
): Promise<{ trackingLink: any; linkClick: any } | null> {
  if (
    !inviteLink ||
    typeof inviteLink !== 'string' ||
    inviteLink.length < MIN_INVITE_LINK_PREFIX_LENGTH
  ) {
    Debug.warn(
      ctx,
      `[deterministic-attribution] Некорректный inviteLink: длина=${inviteLink?.length || 0}, минимальная длина=${MIN_INVITE_LINK_PREFIX_LENGTH}`
    )
    return null
  }

  Debug.info(
    ctx,
    `[deterministic-attribution] Поиск TrackingLink по inviteLink для проекта ${projectId}, префикс inviteLink: ${inviteLink.substring(0, Math.min(50, inviteLink.length))}...`
  )

  // Получаем все TrackingLinks для проекта
  const trackingLinks = await TrackingLinks.findAll(ctx, {
    where: {
      projectId
    }
  })

  Debug.info(
    ctx,
    `[deterministic-attribution] Найдено TrackingLinks для проекта: ${trackingLinks.length}`
  )

  // Ищем TrackingLink, у которого inviteLink совпадает с началом inviteLink из webhook
  // или наоборот: inviteLink из webhook начинается с inviteLink из TrackingLink
  for (const trackingLink of trackingLinks) {
    if (!trackingLink.inviteLink) {
      continue
    }

    const trackingLinkInvite = trackingLink.inviteLink

    // Проверяем два варианта совпадения:
    // 1. inviteLink из webhook начинается с inviteLink из TrackingLink
    // 2. inviteLink из TrackingLink начинается с inviteLink из webhook
    const webhookStartsWithTracking = inviteLink.startsWith(trackingLinkInvite)
    const trackingStartsWithWebhook = trackingLinkInvite.startsWith(inviteLink)

    if (webhookStartsWithTracking || trackingStartsWithWebhook) {
      Debug.info(
        ctx,
        `[deterministic-attribution] ✅ Найден TrackingLink: id=${trackingLink.id}, name=${trackingLink.name}`
      )
      Debug.info(
        ctx,
        `[deterministic-attribution] Совпадение: webhookStartsWithTracking=${webhookStartsWithTracking}, trackingStartsWithWebhook=${trackingStartsWithWebhook}`
      )

      // Ищем соответствующий LinkClick по inviteLink
      // LinkClick должен иметь тот же inviteLink, что и TrackingLink
      const linkClick = await LinkClicks.findOneBy(ctx, {
        linkId: trackingLink.id,
        inviteLink: trackingLinkInvite
      })

      if (linkClick) {
        Debug.info(
          ctx,
          `[deterministic-attribution] ✅ Найден LinkClick: id=${linkClick.id}, clickedAt=${linkClick.clickedAt?.toISOString()}`
        )
        return { trackingLink, linkClick }
      } else {
        Debug.warn(
          ctx,
          `[deterministic-attribution] ⚠️ TrackingLink найден, но LinkClick не найден для inviteLink: ${trackingLinkInvite.substring(0, Math.min(50, trackingLinkInvite.length))}...`
        )
        // Возвращаем TrackingLink даже без LinkClick, так как он может быть создан позже
        return { trackingLink, linkClick: null }
      }
    }
  }

  Debug.warn(
    ctx,
    `[deterministic-attribution] ❌ TrackingLink не найден для inviteLink: ${inviteLink.substring(0, Math.min(50, inviteLink.length))}...`
  )
  return null
}

/**
 * Выполняет детерминированную атрибуцию JoinEvent к TrackingLink и LinkClick
 *
 * Обновляет:
 * - JoinEvent: status='attributed', attributionMethod='deterministic', confidence=1.0
 * - LinkClick: subscribedAt, subscriberTgId, subscriberName (если linkClick существует)
 *
 * @param ctx - контекст
 * @param joinEvent - объект JoinEvent (или его ID)
 * @param trackingLink - объект TrackingLink
 * @param linkClick - объект LinkClick (опционально, может быть null)
 * @returns обновлённый JoinEvent
 */
export async function attributeJoinDeterministic(
  ctx: RichUgcCtx,
  joinEvent: { id: string } | string,
  trackingLink: { id: string },
  linkClick: { id: string } | string | null
): Promise<any> {
  const joinEventId = typeof joinEvent === 'string' ? joinEvent : joinEvent.id
  const linkClickId = linkClick ? (typeof linkClick === 'string' ? linkClick : linkClick.id) : null

  Debug.info(
    ctx,
    `[deterministic-attribution] Выполнение детерминированной атрибуции: joinEventId=${joinEventId}, trackingLinkId=${trackingLink.id}, linkClickId=${linkClickId || 'null'}`
  )

  // Получаем текущий JoinEvent
  const currentJoinEvent = await JoinEvents.findById(ctx, joinEventId)
  if (!currentJoinEvent) {
    throw new Error(`JoinEvent с ID ${joinEventId} не найден`)
  }

  // Обновляем JoinEvent
  const updatedJoinEvent = await JoinEvents.update(ctx, {
    id: joinEventId,
    status: 'attributed',
    attributionMethod: 'deterministic',
    confidence: 1.0,
    attributedToTrackingLinkId: trackingLink.id,
    attributedToLinkClickId: linkClickId
  })

  Debug.info(
    ctx,
    `[deterministic-attribution] ✅ JoinEvent обновлён: id=${updatedJoinEvent.id}, status=${updatedJoinEvent.status}, attributionMethod=${updatedJoinEvent.attributionMethod}`
  )

  // Обновляем LinkClick, если он существует
  if (linkClickId) {
    const currentLinkClick = await LinkClicks.findById(ctx, linkClickId)
    if (currentLinkClick) {
      // Обновляем только если subscribedAt ещё не установлен
      if (!currentLinkClick.subscribedAt) {
        await LinkClicks.update(ctx, {
          id: linkClickId,
          subscribedAt: currentJoinEvent.joinedAt,
          subscriberTgId: currentJoinEvent.userId,
          subscriberName: currentJoinEvent.userName,
          status: 'subscribed'
        })
        Debug.info(
          ctx,
          `[deterministic-attribution] ✅ LinkClick обновлён: id=${linkClickId}, subscriberTgId=${currentJoinEvent.userId}, subscriberName=${currentJoinEvent.userName}`
        )
      } else {
        Debug.info(
          ctx,
          `[deterministic-attribution] ℹ️ LinkClick уже имеет subscribedAt: ${currentLinkClick.subscribedAt.toISOString()}, пропускаем обновление`
        )
      }
    } else {
      Debug.warn(
        ctx,
        `[deterministic-attribution] ⚠️ LinkClick с ID ${linkClickId} не найден, пропускаем обновление`
      )
    }
  } else {
    Debug.info(
      ctx,
      `[deterministic-attribution] ℹ️ LinkClick не указан, пропускаем обновление LinkClick`
    )
  }

  return updatedJoinEvent
}
