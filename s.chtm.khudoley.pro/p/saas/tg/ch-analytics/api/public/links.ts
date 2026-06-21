// @shared-route

import { LinkClicks } from '../../tables/link-clicks.table'
import { TrackingLinks } from '../../tables/tracking-links.table'
import { Debug } from '../../shared/debug'
import { applyDebugLevel } from '../../lib/logging'

/**
 * POST /api/public/links/last-click
 * Публичный эндпоинт для получения информации о последнем переходе по tg_id
 *
 * Фактический URL: /api/public/links~last-click (file-based роутинг)
 *
 * НЕ требует авторизации
 *
 * Параметры:
 * - tg_id: tg_id подписчика (обязательно)
 *
 * Возвращает:
 * - linkName: название ссылки
 * - queryParams: query-параметры перехода (JSON объект или строка)
 * - subscribedAt: время подписки (если есть)
 * - subscriberName: имя подписчика (если есть)
 */
export const apiPublicLinksLastClickRoute = app.post('/last-click', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/public/links/last-click')
    Debug.info(ctx, '[api/public/links/last-click] Начало обработки запроса')

    // НЕ требуем авторизацию - это публичный эндпоинт

    const { tg_id } = req.body

    if (!tg_id || typeof tg_id !== 'string' || !tg_id.trim()) {
      Debug.warn(ctx, '[api/public/links/last-click] tg_id не предоставлен или некорректен')
      return {
        success: false,
        error: 'Параметр tg_id обязателен'
      }
    }

    const trimmedTgId = tg_id.trim()
    Debug.info(
      ctx,
      `[api/public/links/last-click] Поиск последнего перехода для tg_id: ${trimmedTgId}`
    )

    // Находим последний LinkClick с данным subscriberTgId
    // Сортируем по clickedAt DESC, чтобы получить самый последний переход
    const linkClicks = await LinkClicks.findAll(ctx, {
      where: {
        subscriberTgId: trimmedTgId
      },
      order: { clickedAt: 'desc' },
      limit: 1
    })

    if (!linkClicks || linkClicks.length === 0) {
      Debug.info(ctx, `[api/public/links/last-click] Переходы для tg_id ${trimmedTgId} не найдены`)
      return {
        success: false,
        error: 'Переходы не найдены'
      }
    }

    const lastClick = linkClicks[0]
    Debug.info(
      ctx,
      `[api/public/links/last-click] Найден переход: linkId=${lastClick.linkId}, clickedAt=${lastClick.clickedAt}`
    )

    // Получаем информацию о ссылке для получения linkName
    const trackingLink = await TrackingLinks.findById(ctx, lastClick.linkId)

    if (!trackingLink) {
      Debug.warn(ctx, `[api/public/links/last-click] Ссылка с ID ${lastClick.linkId} не найдена`)
      return {
        success: false,
        error: 'Ссылка не найдена'
      }
    }

    Debug.info(
      ctx,
      `[api/public/links/last-click] Информация успешно получена: linkName=${trackingLink.name}`
    )

    // Парсим queryParams из JSON строки
    let queryParams: any = null
    try {
      if (lastClick.queryParams) {
        queryParams = JSON.parse(lastClick.queryParams)
      }
    } catch (parseError: any) {
      Debug.warn(
        ctx,
        `[api/public/links/last-click] Ошибка парсинга queryParams: ${parseError.message}`
      )
      // Если не удалось распарсить, возвращаем как есть
      queryParams = lastClick.queryParams
    }

    return {
      success: true,
      linkName: trackingLink.name,
      queryParams: queryParams,
      subscribedAt: lastClick.subscribedAt || null,
      subscriberName: lastClick.subscriberName || null
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/public/links/last-click] Ошибка при обработке запроса: ${error.message}`,
      'E_PUBLIC_LINKS_LAST_CLICK'
    )
    Debug.error(ctx, `[api/public/links/last-click] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при получении информации о переходе'
    }
  }
})
