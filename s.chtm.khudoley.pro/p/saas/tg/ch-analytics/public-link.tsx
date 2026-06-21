// @shared-route

import { TrackingLinks } from './tables/tracking-links.table'
import { LinkClicks } from './tables/link-clicks.table'
import { TelegramChats } from './tables/chats.table'
import { BotTokens } from './tables/bot-tokens.table'
import { request } from '@app/request'
import { Debug } from './shared/debug'
import { applyDebugLevel } from './lib/logging'
import { revokeLinksJob } from './jobs/revoke-links.job'
import { generateFingerprint } from './lib/fingerprint'

/**
 * GET /:id
 * Публичный роут для обработки переходов по отслеживаемым ссылкам
 *
 * Параметры:
 * - id: ID ссылки из TrackingLinks (в пути)
 * - query параметры: любые query параметры из URL сохраняются в LinkClicks
 *
 * Процесс:
 * 1. Извлекает query-параметры из URL
 * 2. Находит TrackingLink по ID
 * 3. Получает информацию о боте и канале
 * 4. Генерирует инвайт-линк через Telegram Bot API
 * 5. Сохраняет LinkClick с query-параметрами
 * 6. Обновляет TrackingLink с inviteLink и inviteLinkCreatedAt
 * 7. Выполняет редирект на инвайт-линк
 */
export const publicLinkRoute = app.get('/:id', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'public-link')
    Debug.info(ctx, '[public-link] ===== НАЧАЛО ОБРАБОТКИ ПЕРЕХОДА ПО ССЫЛКЕ =====')
    Debug.info(ctx, `[public-link] URL запроса: ${req.url || 'N/A'}`)
    Debug.info(ctx, `[public-link] Метод запроса: ${req.method || 'N/A'}`)
    Debug.info(ctx, `[public-link] Путь запроса: ${req.path || 'N/A'}`)
    Debug.info(ctx, `[public-link] Параметры пути: ${JSON.stringify(req.params || {})}`)
    Debug.info(ctx, `[public-link] Query параметры: ${JSON.stringify(req.query || {})}`)

    // НЕ требуем авторизацию - это публичный роут

    const { id } = req.params

    if (!id || !id.trim()) {
      Debug.warn(ctx, '[public-link] ID ссылки не предоставлен')
      // Возвращаем простую HTML страницу с ошибкой
      return (
        <html>
          <head>
            <title>Ошибка</title>
            <meta charset="UTF-8" />
          </head>
          <body>
            <p>Ссылка не найдена</p>
          </body>
        </html>
      )
    }

    const trimmedId = id.trim()
    Debug.info(ctx, `[public-link] Обработка перехода по ссылке с ID: ${trimmedId}`)

    // Извлекаем query-параметры из URL
    const queryParams: Record<string, string> = {}
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (value !== undefined && value !== null) {
          queryParams[key] = String(value)
        }
      }
    }

    Debug.info(ctx, `[public-link] Query параметры: ${JSON.stringify(queryParams)}`)

    // Находим ссылку
    const trackingLink = await TrackingLinks.findById(ctx, trimmedId)

    if (!trackingLink) {
      Debug.warn(ctx, `[public-link] Ссылка с ID ${trimmedId} не найдена`)
      return (
        <html>
          <head>
            <title>Ссылка не найдена</title>
            <meta charset="UTF-8" />
          </head>
          <body>
            <p>Ссылка не найдена</p>
          </body>
        </html>
      )
    }

    Debug.info(
      ctx,
      `[public-link] Ссылка найдена: name=${trackingLink.name}, channelId=${trackingLink.channelId}, botId=${trackingLink.botId}`
    )

    // Проверяем, не отозвана ли ссылка
    if (trackingLink.revokedAt) {
      Debug.warn(
        ctx,
        `[public-link] Ссылка отозвана: linkId=${trimmedId}, revokedAt=${trackingLink.revokedAt}`
      )
      return (
        <html>
          <head>
            <title>Ссылка отозвана</title>
            <meta charset="UTF-8" />
          </head>
          <body>
            <p>Эта ссылка больше не действительна</p>
          </body>
        </html>
      )
    }

    // Получаем информацию о канале
    const channel = await TelegramChats.findById(ctx, trackingLink.channelId)

    if (!channel) {
      Debug.warn(ctx, `[public-link] Канал с ID ${trackingLink.channelId} не найден`)
      return (
        <html>
          <head>
            <title>Ошибка</title>
            <meta charset="UTF-8" />
          </head>
          <body>
            <p>Канал не найден</p>
          </body>
        </html>
      )
    }

    // Получаем информацию о боте
    const bot = await BotTokens.findById(ctx, trackingLink.botId)

    if (!bot) {
      Debug.warn(ctx, `[public-link] Бот с ID ${trackingLink.botId} не найден`)
      return (
        <html>
          <head>
            <title>Ошибка</title>
            <meta charset="UTF-8" />
          </head>
          <body>
            <p>Бот не найден</p>
          </body>
        </html>
      )
    }

    Debug.info(
      ctx,
      `[public-link] Канал: chatId=${channel.chatId}, Бот: token=${bot.token.substring(0, 10)}...`
    )

    // Проверяем, есть ли уже инвайт-линк и он не отозван
    let inviteLink = trackingLink.inviteLink

    if (!inviteLink || !trackingLink.inviteLinkCreatedAt) {
      // Генерируем новый инвайт-линк
      Debug.info(ctx, `[public-link] Генерация нового инвайт-линка для канала ${channel.chatId}`)

      const trimmedToken = bot.token.trim()
      const telegramApiUrl = `https://api.telegram.org/bot${trimmedToken}/createChatInviteLink`

      const inviteResponse = await request({
        url: telegramApiUrl,
        method: 'post',
        json: {
          chat_id: channel.chatId,
          creates_join_request: false // обычная подписка
        },
        responseType: 'json',
        throwHttpErrors: false,
        timeout: 10000
      })

      const inviteBody = inviteResponse.body as any

      if (inviteResponse.statusCode === 200 && inviteBody?.ok && inviteBody?.result?.invite_link) {
        inviteLink = inviteBody.result.invite_link
        Debug.info(ctx, `[public-link] Инвайт-линк успешно создан: ${inviteLink}`)

        const inviteLinkCreatedAt = new Date()

        // Обновляем TrackingLink с новым инвайт-линком
        await TrackingLinks.update(ctx, {
          id: trimmedId,
          inviteLink: inviteLink,
          inviteLinkCreatedAt: inviteLinkCreatedAt
        })

        Debug.info(ctx, `[public-link] TrackingLink обновлён с новым инвайт-линком`)

        // Очищаем информацию об ошибках в БД бота при успешном создании
        try {
          await BotTokens.update(ctx, {
            id: bot.id,
            lastError: null,
            lastErrorAt: null,
            lastErrorType: null
          })
          Debug.info(ctx, `[public-link] Информация об ошибках очищена в БД бота`)
        } catch (updateError: any) {
          Debug.error(
            ctx,
            `[public-link] Ошибка очистки информации об ошибках в БД бота: ${updateError.message}`,
            'E_CLEAR_BOT_ERROR'
          )
          // Не прерываем выполнение - инвайт-линк создан успешно
        }

        // Планируем отзыв инвайт-линка через 1 час
        try {
          const revokeAt = new Date(inviteLinkCreatedAt.getTime() + 1 * 60 * 60 * 1000)
          await revokeLinksJob.scheduleJobAt(ctx, revokeAt, {
            linkId: trimmedId
          })
          Debug.info(
            ctx,
            `[public-link] Запланирован отзыв инвайт-линка через 1 час: ${revokeAt.toISOString()}`
          )
        } catch (scheduleError: any) {
          Debug.error(
            ctx,
            `[public-link] Ошибка планирования отзыва инвайт-линка: ${scheduleError.message}`,
            'E_SCHEDULE_REVOKE'
          )
          Debug.error(ctx, `[public-link] Stack trace: ${scheduleError.stack || 'N/A'}`)
          // Не прерываем процесс - инвайт-линк создан, отзыв произойдет при следующем запуске периодического джоба
        }
      } else {
        const errorMessage = inviteBody?.description || 'Ошибка создания инвайт-линка'
        const errorCode = inviteBody?.error_code || null
        Debug.error(
          ctx,
          `[public-link] Ошибка создания инвайт-линка: statusCode=${inviteResponse.statusCode}, error=${errorMessage}, errorCode=${errorCode}`,
          'E_CREATE_INVITE_LINK'
        )

        // Проверяем, является ли ошибка связанной с правами администратора
        const isPermissionError =
          inviteResponse.statusCode === 400 ||
          inviteResponse.statusCode === 403 ||
          (typeof errorMessage === 'string' &&
            (errorMessage.toLowerCase().includes('not enough rights') ||
              errorMessage.toLowerCase().includes('not an administrator') ||
              errorMessage.toLowerCase().includes('admin required') ||
              errorMessage.toLowerCase().includes('chat_admin_required') ||
              errorMessage.toLowerCase().includes("can't invite users") ||
              errorMessage.toLowerCase().includes('can not invite users'))) ||
          errorCode === 400 ||
          errorCode === 403

        // Сохраняем информацию об ошибке в БД бота
        try {
          const errorType = isPermissionError
            ? 'admin_permission_required'
            : 'invite_link_creation_failed'
          await BotTokens.update(ctx, {
            id: bot.id,
            lastError: errorMessage,
            lastErrorAt: new Date(),
            lastErrorType: errorType
          })
          Debug.info(
            ctx,
            `[public-link] Информация об ошибке сохранена в БД бота: errorType=${errorType}, errorMessage=${errorMessage}`
          )
        } catch (updateError: any) {
          Debug.error(
            ctx,
            `[public-link] Ошибка сохранения информации об ошибке в БД бота: ${updateError.message}`,
            'E_UPDATE_BOT_ERROR'
          )
          // Не прерываем выполнение - ошибка уже залогирована
        }

        return (
          <html>
            <head>
              <title>Ошибка</title>
              <meta charset="UTF-8" />
            </head>
            <body>
              <p>Не удалось создать ссылку для подписки. Попробуйте позже.</p>
            </body>
          </html>
        )
      }
    } else {
      Debug.info(ctx, `[public-link] Используется существующий инвайт-линк: ${inviteLink}`)
    }

    // Генерируем фингерпринт для дедупликации
    const fingerprintHash = generateFingerprint(req, trimmedId)
    Debug.info(ctx, `[public-link] Сгенерирован fingerprint: ${fingerprintHash}`)

    // Сохраняем LinkClick с query-параметрами (только если нет дубликата)
    const clickedAt = new Date()
    const queryParamsJson = JSON.stringify(queryParams)

    // Проверяем дубликат за последние 5 секунд
    const fiveSecondsAgo = new Date(clickedAt.getTime() - 5000)
    const existingClicks = await LinkClicks.findAll(ctx, {
      where: {
        linkId: trimmedId,
        fingerprint: fingerprintHash,
        clickedAt: { $gte: fiveSecondsAgo }
      },
      limit: 1
    })

    const isDuplicate = existingClicks.length > 0

    if (isDuplicate) {
      Debug.info(
        ctx,
        `[public-link] Дубликат перехода обнаружен, fingerprint=${fingerprintHash}, не создаём новую запись`
      )
    } else {
      Debug.info(
        ctx,
        `[public-link] Начало сохранения LinkClick: linkId=${trimmedId}, inviteLink=${inviteLink}, clickedAt=${clickedAt.toISOString()}, queryParams=${queryParamsJson}, fingerprint=${fingerprintHash}`
      )

      try {
        const linkClick = await LinkClicks.create(ctx, {
          linkId: trimmedId,
          queryParams: queryParamsJson,
          inviteLink: inviteLink!,
          clickedAt: clickedAt,
          fingerprint: fingerprintHash,
          status: 'active'
        })

        Debug.info(
          ctx,
          `[public-link] ✅ LinkClick успешно создан: linkClickId=${linkClick.id}, linkId=${linkClick.linkId}, inviteLink=${linkClick.inviteLink}, clickedAt=${linkClick.clickedAt?.toISOString() || 'N/A'}, fingerprint=${linkClick.fingerprint}`
        )
      } catch (clickError: any) {
        // Логируем ошибку, но не прерываем процесс - редирект всё равно должен произойти
        Debug.error(
          ctx,
          `[public-link] ❌ Ошибка создания LinkClick: ${clickError.message}`,
          'E_CREATE_LINK_CLICK'
        )
        Debug.error(
          ctx,
          `[public-link] Stack trace создания LinkClick: ${clickError.stack || 'N/A'}`
        )
        Debug.error(
          ctx,
          `[public-link] Данные, которые пытались сохранить: linkId=${trimmedId}, inviteLink=${inviteLink}, queryParams=${queryParamsJson}, fingerprint=${fingerprintHash}`
        )
      }
    }

    // Выполняем редирект на инвайт-линк
    Debug.info(ctx, `[public-link] ===== УСПЕШНОЕ ЗАВЕРШЕНИЕ ОБРАБОТКИ =====`)
    Debug.info(ctx, `[public-link] Редирект на инвайт-линк: ${inviteLink}`)
    Debug.info(
      ctx,
      `[public-link] Итоговые данные: linkId=${trimmedId}, channelId=${channel.chatId}, botId=${bot.id}, inviteLink=${inviteLink}`
    )

    return ctx.resp.redirect(inviteLink!)
  } catch (error: any) {
    Debug.error(ctx, `[public-link] ===== КРИТИЧЕСКАЯ ОШИБКА ПРИ ОБРАБОТКЕ =====`, 'E_PUBLIC_LINK')
    Debug.error(ctx, `[public-link] Ошибка: ${error.message}`, 'E_PUBLIC_LINK')
    Debug.error(ctx, `[public-link] Stack trace: ${error.stack || 'N/A'}`)
    Debug.error(ctx, `[public-link] URL запроса: ${req.url || 'N/A'}`)
    Debug.error(ctx, `[public-link] Параметры пути: ${JSON.stringify(req.params || {})}`)
    Debug.error(ctx, `[public-link] Query параметры: ${JSON.stringify(req.query || {})}`)

    return (
      <html>
        <head>
          <title>Ошибка</title>
          <meta charset="UTF-8" />
        </head>
        <body>
          <p>Произошла ошибка при обработке ссылки. Попробуйте позже.</p>
        </body>
      </html>
    )
  }
})
