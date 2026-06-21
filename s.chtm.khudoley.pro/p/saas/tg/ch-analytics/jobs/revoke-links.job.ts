// @shared-route

import { TrackingLinks } from '../tables/tracking-links.table'
import { TelegramChats } from '../tables/chats.table'
import { BotTokens } from '../tables/bot-tokens.table'
import { request } from '@app/request'
import { Debug } from '../shared/debug'
import { applyDebugLevel } from '../lib/logging'

/**
 * Job для автоматического отзыва инвайт-линков через 1 час после создания
 *
 * Логика:
 * 1. Если передан linkId - отзывает конкретную ссылку (если прошло 1 час)
 * 2. Если linkId не передан - находит все TrackingLinks с inviteLinkCreatedAt < 1 час назад и revokedAt = null
 * 3. Для каждой ссылки вызывает revokeChatInviteLink через Telegram Bot API
 * 4. Обновляет TrackingLink: revokedAt = текущее время
 * 5. Планирует следующее выполнение через 1 час (только если linkId не передан)
 */
export const revokeLinksJob = app.job('/revoke-links', async (ctx, params) => {
  const linkId = params?.linkId as string | undefined

  try {
    await applyDebugLevel(ctx, 'jobs/revoke-links')
    Debug.info(ctx, '[revoke-links] Начало выполнения job для отзыва ссылок')

    let linksToRevoke: any[] = []

    if (linkId) {
      // Режим отзыва конкретной ссылки
      Debug.info(ctx, `[revoke-links] Режим отзыва конкретной ссылки: linkId=${linkId}`)

      const link = await TrackingLinks.findById(ctx, linkId)

      if (!link) {
        Debug.warn(ctx, `[revoke-links] Ссылка с ID ${linkId} не найдена`)
        return {
          success: false,
          error: 'Ссылка не найдена'
        }
      }

      // Проверяем, что прошло 1 час с момента создания инвайт-линка
      if (!link.inviteLinkCreatedAt) {
        Debug.warn(ctx, `[revoke-links] У ссылки ${linkId} нет inviteLinkCreatedAt, пропускаем`)
        return {
          success: false,
          error: 'У ссылки нет inviteLinkCreatedAt'
        }
      }

      const inviteLinkCreatedAt =
        typeof link.inviteLinkCreatedAt === 'string'
          ? new Date(link.inviteLinkCreatedAt)
          : link.inviteLinkCreatedAt

      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

      if (inviteLinkCreatedAt >= oneHourAgo) {
        Debug.info(ctx, `[revoke-links] Для ссылки ${linkId} ещё не прошло 1 час, пропускаем`)
        return {
          success: true,
          message: 'Ещё не прошло 1 час с момента создания инвайт-линка'
        }
      }

      // Проверяем, что ссылка ещё не отозвана
      if (link.revokedAt) {
        Debug.info(ctx, `[revoke-links] Ссылка ${linkId} уже отозвана, пропускаем`)
        return {
          success: true,
          message: 'Ссылка уже отозвана'
        }
      }

      // Проверяем, что есть инвайт-линк
      if (!link.inviteLink) {
        Debug.warn(ctx, `[revoke-links] У ссылки ${linkId} нет inviteLink, пропускаем`)
        return {
          success: false,
          error: 'У ссылки нет inviteLink'
        }
      }

      linksToRevoke = [link]
    } else {
      // Режим периодической проверки всех ссылок
      Debug.info(ctx, `[revoke-links] Режим периодической проверки всех ссылок`)

      // Вычисляем дату 1 час назад (1 час * 60 минут * 60 секунд * 1000 миллисекунд)
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

      Debug.info(ctx, `[revoke-links] Поиск ссылок старше 1 часа: ${oneHourAgo.toISOString()}`)

      // Находим все TrackingLinks, которые нужно отозвать:
      // - inviteLinkCreatedAt < 1 час назад
      // - revokedAt = null (ещё не отозваны)
      // - inviteLink не пустой (есть что отзывать)
      linksToRevoke = await TrackingLinks.findAll(ctx, {
        where: {
          inviteLinkCreatedAt: { $lt: oneHourAgo },
          revokedAt: null,
          inviteLink: { $not: null }
        },
        limit: 1000
      })
    }

    const linksCount = linksToRevoke?.length || 0
    Debug.info(ctx, `[revoke-links] Найдено ссылок для отзыва: ${linksCount}`)

    let revokedCount = 0
    let errorCount = 0

    if (linksCount > 0) {
      // Обрабатываем каждую ссылку
      for (const link of linksToRevoke) {
        try {
          Debug.info(
            ctx,
            `[revoke-links] Обработка ссылки: linkId=${link.id}, inviteLink=${link.inviteLink?.substring(0, 30)}...`
          )

          // Получаем информацию о канале
          const channel = await TelegramChats.findById(ctx, link.channelId)

          if (!channel) {
            Debug.warn(
              ctx,
              `[revoke-links] Канал не найден для ссылки ${link.id}: channelId=${link.channelId}`
            )
            // НЕ помечаем как отозванную - инвайт-линк в Telegram не был отозван
            // Позволяем следующему запуску job попробовать снова
            errorCount++
            continue
          }

          // Получаем информацию о боте
          const bot = await BotTokens.findById(ctx, link.botId)

          if (!bot) {
            Debug.warn(
              ctx,
              `[revoke-links] Бот не найден для ссылки ${link.id}: botId=${link.botId}`
            )
            // НЕ помечаем как отозванную - инвайт-линк в Telegram не был отозван
            // Позволяем следующему запуску job попробовать снова
            errorCount++
            continue
          }

          // Отзываем инвайт-линк через Telegram Bot API
          const trimmedToken = bot.token.trim()
          const telegramApiUrl = `https://api.telegram.org/bot${trimmedToken}/revokeChatInviteLink`

          Debug.info(
            ctx,
            `[revoke-links] Отзыв инвайт-линка: chatId=${channel.chatId}, inviteLink=${link.inviteLink?.substring(0, 30)}...`
          )

          const revokeResponse = await request({
            url: telegramApiUrl,
            method: 'post',
            json: {
              chat_id: channel.chatId,
              invite_link: link.inviteLink
            },
            responseType: 'json',
            throwHttpErrors: false,
            timeout: 10000
          })

          const revokeBody = revokeResponse.body as any

          if (revokeResponse.statusCode === 200 && revokeBody?.ok) {
            // Успешно отозвано в Telegram
            Debug.info(ctx, `[revoke-links] Инвайт-линк успешно отозван для ссылки ${link.id}`)

            // Обновляем TrackingLink: помечаем как отозванную
            await TrackingLinks.update(ctx, {
              id: link.id,
              revokedAt: new Date()
            })

            revokedCount++
          } else {
            const errorMessage = revokeBody?.description || ''
            const hasDescription = !!revokeBody?.description

            Debug.error(
              ctx,
              `[revoke-links] Ошибка отзыва инвайт-линка для ссылки ${link.id}: statusCode=${revokeResponse.statusCode}, error=${errorMessage || 'нет описания'}`,
              'E_REVOKE_INVITE_LINK'
            )

            // Если ссылка уже была отозвана в Telegram (ошибка 400)
            // Помечаем как отозванную только при явном упоминании "revoked"
            // "not found" может означать разные проблемы (чат не найден, нет доступа и т.д.)
            // и не должно автоматически помечать ссылку как отозванную
            const isAlreadyRevoked =
              revokeResponse.statusCode === 400 &&
              hasDescription &&
              (errorMessage.toLowerCase().includes('revoked') ||
                errorMessage.toLowerCase().includes('отозван'))

            if (isAlreadyRevoked) {
              Debug.info(
                ctx,
                `[revoke-links] Инвайт-линк уже был отозван в Telegram (statusCode=400, содержит "revoked"), помечаем как отозванный в БД`
              )
              await TrackingLinks.update(ctx, {
                id: link.id,
                revokedAt: new Date()
              })
              revokedCount++
            } else {
              // Другие ошибки (включая "not found") - не помечаем как отозванную,
              // позволяем повторить попытку
              errorCount++
            }
          }
        } catch (linkError: any) {
          Debug.error(
            ctx,
            `[revoke-links] Ошибка при обработке ссылки ${link.id}: ${linkError.message}`,
            'E_REVOKE_LINK_ERROR'
          )
          Debug.error(ctx, `[revoke-links] Stack trace: ${linkError.stack || 'N/A'}`)
          errorCount++
        }
      }

      Debug.info(
        ctx,
        `[revoke-links] Обработка завершена: отозвано=${revokedCount}, ошибок=${errorCount}`
      )
    } else {
      Debug.info(ctx, `[revoke-links] Нет ссылок для отзыва`)
    }

    // Планируем следующее выполнение через 1 час только для периодической проверки (без linkId)
    if (!linkId) {
      const nextRun = new Date()
      nextRun.setHours(nextRun.getHours() + 1)
      await revokeLinksJob.scheduleJobAt(ctx, nextRun, {})
      Debug.info(
        ctx,
        `[revoke-links] Следующее выполнение запланировано на: ${nextRun.toISOString()}`
      )
    } else {
      Debug.info(
        ctx,
        `[revoke-links] Отзыв конкретной ссылки завершён, периодическое планирование не требуется`
      )
    }

    return {
      success: true,
      revokedCount,
      errorCount,
      totalProcessed: linksCount
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[revoke-links] Критическая ошибка выполнения job: ${error.message}`,
      'E_REVOKE_LINKS_JOB_ERROR'
    )
    Debug.error(ctx, `[revoke-links] Stack trace: ${error.stack || 'N/A'}`)

    // Планируем следующее выполнение через 1 час даже при ошибке (только для периодической проверки)
    if (!linkId) {
      try {
        const nextRun = new Date()
        nextRun.setHours(nextRun.getHours() + 1)
        await revokeLinksJob.scheduleJobAt(ctx, nextRun, {})
        Debug.info(
          ctx,
          `[revoke-links] Следующее выполнение запланировано на: ${nextRun.toISOString()}`
        )
      } catch (scheduleError: any) {
        Debug.error(
          ctx,
          `[revoke-links] Ошибка планирования следующего выполнения: ${scheduleError.message}`,
          'E_REVOKE_LINKS_SCHEDULE_ERROR'
        )
      }
    }

    return {
      success: false,
      error: error.message
    }
  }
})
