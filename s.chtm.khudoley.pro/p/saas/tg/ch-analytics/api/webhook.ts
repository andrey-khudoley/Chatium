// @shared-route

import { requireRealUser } from '@app/auth'
import { BotTokens } from '../tables/bot-tokens.table'
import { TelegramWebhooks } from '../tables/webhooks.table'
import { TelegramChats } from '../tables/chats.table'
import { Projects } from '../tables/projects.table'
import { LinkClicks } from '../tables/link-clicks.table'
import { TrackingLinks } from '../tables/tracking-links.table'
import { JoinEvents } from '../tables/join-events.table'
import { Debug } from '../shared/debug'
import {
  findTrackingLinkByInviteLink,
  attributeJoinDeterministic
} from '../lib/deterministic-attribution'
import { applyDebugLevel } from '../lib/logging'
import { sendDataToSocket } from '@app/socket'
import { request } from '@app/request'
import { extractChatFromUpdate, extractBotStatusFromUpdate } from '../lib/extract-chat'
import { runWithExclusiveLock } from '@app/sync'
import { userIdsMatch } from '../shared/user-utils'

/**
 * POST /api/webhook/:id
 * Обработка входящих вебхуков от Telegram для конкретного бота
 */
// ВАЖНО: Этот endpoint НЕ требует авторизации, так как Telegram отправляет запросы напрямую
export const apiWebhookRoute = app.post('/:id', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/webhook')

    Debug.info(ctx, `[api/webhook] ========== НАЧАЛО ОБРАБОТКИ ВЕБХУКА ==========`)
    Debug.info(ctx, `[api/webhook] Метод запроса: ${req.method}`)
    Debug.info(ctx, `[api/webhook] URL запроса: ${req.url}`)
    Debug.info(ctx, `[api/webhook] IP адрес: ${req.ip || 'N/A'}`)
    Debug.info(ctx, `[api/webhook] User-Agent: ${req.headers?.['user-agent'] || 'N/A'}`)
    Debug.info(ctx, `[api/webhook] Content-Type: ${req.headers?.['content-type'] || 'N/A'}`)
    Debug.info(
      ctx,
      `[api/webhook] Headers (первые 500 символов): ${JSON.stringify(req.headers || {}).substring(0, 500)}`
    )

    const botId = req.params.id
    Debug.info(ctx, `[api/webhook] ID бота из параметров URL: ${botId}`)

    const webhookData = req.body
    Debug.info(ctx, `[api/webhook] Тип body: ${typeof webhookData}`)
    Debug.info(
      ctx,
      `[api/webhook] Body пустой: ${!webhookData || Object.keys(webhookData).length === 0}`
    )

    // Логируем сырые данные вебхука
    if (webhookData) {
      Debug.info(
        ctx,
        `[api/webhook] Данные вебхука для бота ${botId}: ${JSON.stringify(webhookData)}`
      )
    } else {
      Debug.warn(ctx, `[api/webhook] ВЕБХУК ПУСТОЙ! Body отсутствует или пустой`)
    }

    // Находим бота по ID из URL параметра
    // Это гарантирует, что мы знаем, какому боту принадлежит вебхук
    Debug.info(ctx, `[api/webhook] Поиск бота в БД по ID: ${botId}`)
    const bot = await BotTokens.findById(ctx, botId)

    if (!bot) {
      Debug.warn(ctx, `[api/webhook] Бот с ID ${botId} не найден в БД`)
      Debug.warn(ctx, `[api/webhook] Возвращаем 200 OK, чтобы Telegram не повторял запрос`)
      // Все равно возвращаем 200 OK, чтобы Telegram не повторял запрос
      return {
        ok: true
      }
    }

    Debug.info(
      ctx,
      `[api/webhook] Бот найден: id=${bot.id}, projectId=${bot.projectId}, botName=${bot.botName || 'null'}, botUsername=${bot.botUsername || 'null'}`
    )

    // ВАЖНО: Проверяем, что у бота есть проект (projectId)
    // Без projectId мы не можем определить, кому отправлять вебхук
    if (!bot.projectId) {
      Debug.warn(ctx, `[api/webhook] У бота ${botId} нет projectId, вебхук не отправлен`)
      // Все равно возвращаем 200 OK, чтобы Telegram не повторял запрос
      return {
        ok: true
      }
    }

    // Получаем проект для определения участников
    const project = await Projects.findById(ctx, bot.projectId)

    if (!project) {
      Debug.warn(ctx, `[api/webhook] Проект с ID ${bot.projectId} не найден, вебхук не отправлен`)
      // Все равно возвращаем 200 OK, чтобы Telegram не повторял запрос
      return {
        ok: true
      }
    }

    // Извлекаем update_id из вебхука для логирования
    // update_id присутствует в большинстве вебхуков от Telegram, но не во всех
    const updateId =
      typeof (webhookData as any)?.update_id === 'number'
        ? (webhookData as any).update_id
        : undefined

    // Сохраняем вебхук в таблицу для логирования
    try {
      Debug.info(ctx, `[api/webhook] Начало сохранения вебхука в таблицу TelegramWebhooks`)

      const webhookRecord = {
        botId: bot.id,
        projectId: bot.projectId,
        rawData: webhookData,
        receivedAt: new Date()
      } as any

      // Добавляем updateId только если он присутствует
      if (updateId !== undefined) {
        webhookRecord.updateId = updateId
        Debug.info(ctx, `[api/webhook] updateId найден: ${updateId}`)
      } else {
        Debug.info(ctx, `[api/webhook] updateId отсутствует в вебхуке`)
      }

      Debug.info(
        ctx,
        `[api/webhook] Данные для сохранения: botId=${webhookRecord.botId}, projectId=${webhookRecord.projectId}, receivedAt=${webhookRecord.receivedAt.toISOString()}`
      )

      const savedWebhook = await TelegramWebhooks.create(ctx, webhookRecord)
      Debug.info(
        ctx,
        `[api/webhook] Вебхук успешно сохранен в таблицу: id=${savedWebhook.id}, botId=${botId}, updateId=${updateId !== undefined ? updateId : 'N/A'}`
      )
    } catch (saveError: any) {
      // Логируем ошибку, но не прерываем обработку вебхука
      Debug.error(
        ctx,
        `[api/webhook] Ошибка сохранения вебхука в таблицу: ${saveError.message}`,
        'E_WEBHOOK_SAVE'
      )
      Debug.error(ctx, `[api/webhook] Stack trace сохранения: ${saveError.stack || 'N/A'}`)
    }

    // Сохраняем информацию о чате, если она присутствует в вебхуке
    try {
      Debug.info(ctx, `[api/webhook] Попытка извлечения информации о чате из вебхука`)
      const chatInfo = extractChatFromUpdate(webhookData)

      if (chatInfo && chatInfo.id !== undefined && chatInfo.id !== null) {
        const chatIdString = String(chatInfo.id)

        // Извлекаем статус бота из вебхука
        let botStatus = extractBotStatusFromUpdate(webhookData)

        // ИСПРАВЛЕНИЕ Bug 1: Проверяем, было ли поле username явно передано в исходном вебхуке
        // Это необходимо для консистентности с другими полями (chatType, chatTitle), которые используют fallback
        // Для channel_post вебхуков объект chat должен содержать полную информацию, но на всякий случай проверяем
        const chatPaths = [
          (webhookData as any)?.channel_post?.chat,
          (webhookData as any)?.message?.chat,
          (webhookData as any)?.edited_message?.chat,
          (webhookData as any)?.edited_channel_post?.chat,
          (webhookData as any)?.callback_query?.message?.chat,
          (webhookData as any)?.my_chat_member?.chat,
          (webhookData as any)?.chat_member?.chat
        ]

        // Ищем исходный chat объект, из которого была извлечена информация
        const sourceChat = chatPaths.find(
          (chat) =>
            chat && chat.id !== undefined && chat.id !== null && String(chat.id) === chatIdString
        )

        // Проверяем, было ли поле username явно передано в исходном вебхуке
        // Важно: используем 'in' operator для проверки наличия поля, а не только значения
        // Это позволяет различать отсутствие поля (undefined) от явного null или пустой строки
        const usernameExplicitlyProvided =
          sourceChat !== null && sourceChat !== undefined && 'username' in sourceChat
        const chatUsername =
          usernameExplicitlyProvided && sourceChat ? sourceChat.username || null : undefined

        Debug.info(
          ctx,
          `[api/webhook] Чат найден в вебхуке: chatId=${chatIdString}, type=${chatInfo.type || 'N/A'}, title=${chatInfo.title || 'N/A'}, username=${chatInfo.username !== undefined ? chatInfo.username || 'пустая строка' : 'отсутствует'}, usernameExplicitlyProvided=${usernameExplicitlyProvided}, botStatus=${botStatus || 'N/A'}`
        )

        const now = new Date()

        // Используем эксклюзивную блокировку для атомарной операции
        // ИСПРАВЛЕНИЕ Bug 1: Ключ блокировки должен быть только по chatId, чтобы сериализовать обновления legacy-записей без projectId
        // Это предотвращает race condition, когда два проекта одновременно пытаются обновить одну и ту же legacy-запись
        const lockKey = `telegram-chat-${chatIdString}`

        await runWithExclusiveLock(ctx, lockKey, {}, async () => {
          // ВСЕ операции с БД должны быть ВНУТРИ блокировки
          // ИСПРАВЛЕНИЕ Bug 1: Функция-хелпер для получения chatUsername с fallback
          // Используется для консистентности с другими полями (chatType, chatTitle)
          const getChatUsernameWithFallback = (
            existingValue: string | null | undefined
          ): string | null => {
            return chatUsername !== undefined ? chatUsername : existingValue || null
          }

          // ИСПРАВЛЕНИЕ Bug 1: Сначала ищем чат по составному ключу (chatId + projectId)
          // Это гарантирует, что мы найдём именно запись для текущего проекта
          const existingChatForProject = await TelegramChats.findOneBy(ctx, {
            chatId: chatIdString,
            projectId: bot.projectId
          })

          if (existingChatForProject) {
            // Чат уже существует для этого проекта - обновляем
            // ИСПРАВЛЕНИЕ Bug 1: Используем ту же логику fallback для chatUsername, что и для других полей
            // Обновляем chatUsername только если поле было явно передано в вебхуке
            // Это предотвращает потерю данных, если вебхук содержит неполную информацию
            const updatedChatUsername =
              chatUsername !== undefined
                ? chatUsername
                : existingChatForProject.chatUsername || null

            Debug.info(
              ctx,
              `[api/webhook] Чат ${chatIdString} уже существует для проекта ${bot.projectId}, обновляем lastSeenAt и другую информацию, chatUsername: ${existingChatForProject.chatUsername || 'null'} -> ${updatedChatUsername || 'null'} (usernameExplicitlyProvided=${usernameExplicitlyProvided})`
            )
            await TelegramChats.update(ctx, {
              id: existingChatForProject.id,
              botId: bot.id,
              projectId: bot.projectId, // Явно указываем projectId для консистентности данных
              chatType: chatInfo.type || existingChatForProject.chatType || null,
              chatTitle: chatInfo.title || existingChatForProject.chatTitle || null,
              chatUsername: updatedChatUsername, // Используем fallback на существующее значение, если поле не было явно передано
              firstSeenAt: existingChatForProject.firstSeenAt, // Сохраняем оригинальное время первого появления
              lastSeenAt: now, // Обновляем время последнего появления
              botStatus: botStatus || existingChatForProject.botStatus || null // Обновляем статус, если он есть в вебхуке
            })
            Debug.info(
              ctx,
              `[api/webhook] Чат ${chatIdString} успешно обновлен для проекта ${bot.projectId}`
            )
          } else {
            // Чат не найден для текущего проекта
            // ИСПРАВЛЕНИЕ Bug 1: Ищем legacy-записи без projectId для миграции
            // Примечание: После изменения схемы с userId на projectId, старые записи могут иметь projectId = null/undefined
            // Проверка !chat.projectId корректно идентифицирует такие записи, так как Heap возвращает null/undefined для отсутствующих полей
            // Блокировка по chatId гарантирует, что только один проект может мигрировать legacy-запись одновременно
            const allChatsWithId = await TelegramChats.findAll(ctx, {
              where: {
                chatId: chatIdString
              },
              limit: 1000 // Разумный limit для предотвращения пропуска legacy-записей
            })
            // ИСПРАВЛЕНИЕ Bug 1: Ищем записи без projectId (legacy-записи, созданные до изменения схемы)
            // Проверка !chat.projectId работает для null, undefined, пустых строк и false
            // ИСПРАВЛЕНИЕ Bug 1: Упрощено условие - убрана избыточная проверка .trim() === '', так как пустые строки уже обрабатываются !chat.projectId
            const legacyChat = allChatsWithId.find((chat) => !chat.projectId) || null

            if (legacyChat) {
              // ИСПРАВЛЕНИЕ Bug 1: Используем атомарную проверку и обновление для миграции legacy-записи
              // Блокировка по chatId гарантирует, что только один проект может мигрировать legacy-запись одновременно
              // Но для полной атомарности проверяем актуальное состояние записи перед обновлением
              Debug.info(
                ctx,
                `[api/webhook] Найдена старая запись чата ${chatIdString} без projectId, проверяем актуальное состояние перед миграцией`
              )

              // ИСПРАВЛЕНИЕ Bug 1: Получаем актуальное состояние записи внутри блокировки
              // Это предотвращает race condition, когда другой проект уже мигрировал запись между findAll и update
              const currentLegacyChat = await TelegramChats.findById(ctx, legacyChat.id)

              if (currentLegacyChat && !currentLegacyChat.projectId) {
                // Запись всё ещё без projectId - безопасно обновляем её
                // ИСПРАВЛЕНИЕ Bug 1: Используем fallback для chatUsername
                const updatedChatUsernameForLegacy = getChatUsernameWithFallback(
                  currentLegacyChat.chatUsername
                )
                Debug.info(
                  ctx,
                  `[api/webhook] Legacy-запись ${legacyChat.id} всё ещё без projectId, атомарно обновляем с projectId=${bot.projectId}, chatUsername: ${currentLegacyChat.chatUsername || 'null'} -> ${updatedChatUsernameForLegacy || 'null'} (usernameExplicitlyProvided=${usernameExplicitlyProvided})`
                )
                await TelegramChats.update(ctx, {
                  id: currentLegacyChat.id,
                  botId: bot.id,
                  projectId: bot.projectId, // Добавляем projectId к старой записи
                  chatType: chatInfo.type || currentLegacyChat.chatType || null,
                  chatTitle: chatInfo.title || currentLegacyChat.chatTitle || null,
                  chatUsername: updatedChatUsernameForLegacy, // Используем fallback на существующее значение, если поле не было явно передано
                  firstSeenAt: currentLegacyChat.firstSeenAt, // Сохраняем оригинальное время первого появления
                  lastSeenAt: now, // Обновляем время последнего появления
                  botStatus: botStatus || currentLegacyChat.botStatus || null // Обновляем статус, если он есть в вебхуке
                })
                Debug.info(
                  ctx,
                  `[api/webhook] Legacy-запись чата ${chatIdString} успешно мигрирована с projectId=${bot.projectId}`
                )
              } else {
                // Legacy-запись уже была мигрирована другим проектом
                // ИСПРАВЛЕНИЕ Bug 2: Проверяем, существует ли уже запись для текущего проекта перед созданием новой
                const existingChatForCurrentProject = await TelegramChats.findOneBy(ctx, {
                  chatId: chatIdString,
                  projectId: bot.projectId
                })

                if (existingChatForCurrentProject) {
                  // Запись для текущего проекта уже существует - обновляем её
                  // ИСПРАВЛЕНИЕ Bug 1: Используем fallback для chatUsername
                  const updatedChatUsernameForExisting = getChatUsernameWithFallback(
                    existingChatForCurrentProject.chatUsername
                  )
                  Debug.info(
                    ctx,
                    `[api/webhook] Запись чата ${chatIdString} уже существует для проекта ${bot.projectId}, обновляем, chatUsername: ${existingChatForCurrentProject.chatUsername || 'null'} -> ${updatedChatUsernameForExisting || 'null'} (usernameExplicitlyProvided=${usernameExplicitlyProvided})`
                  )
                  await TelegramChats.update(ctx, {
                    id: existingChatForCurrentProject.id,
                    botId: bot.id,
                    projectId: bot.projectId,
                    chatType: chatInfo.type || existingChatForCurrentProject.chatType || null,
                    chatTitle: chatInfo.title || existingChatForCurrentProject.chatTitle || null,
                    chatUsername: updatedChatUsernameForExisting, // Используем fallback на существующее значение, если поле не было явно передано
                    firstSeenAt: existingChatForCurrentProject.firstSeenAt,
                    lastSeenAt: now,
                    botStatus: botStatus || existingChatForCurrentProject.botStatus || null // Обновляем статус, если он есть в вебхуке
                  })
                  Debug.info(
                    ctx,
                    `[api/webhook] Чат ${chatIdString} успешно обновлен для проекта ${bot.projectId}`
                  )
                } else {
                  // Создаём новую запись для текущего проекта
                  // ИСПРАВЛЕНИЕ Bug 1: Используем chatUsername из вебхука, если оно было явно передано, иначе из legacy-записи
                  const newChatUsername =
                    chatUsername !== undefined
                      ? chatUsername
                      : currentLegacyChat?.chatUsername || legacyChat.chatUsername || null
                  Debug.info(
                    ctx,
                    `[api/webhook] Legacy-запись чата ${chatIdString} уже мигрирована другим проектом (projectId=${currentLegacyChat?.projectId || 'N/A'}), создаём новую запись для проекта ${bot.projectId}, chatUsername=${newChatUsername || 'null'} (usernameExplicitlyProvided=${usernameExplicitlyProvided})`
                  )
                  await TelegramChats.create(ctx, {
                    chatId: chatIdString,
                    botId: bot.id,
                    projectId: bot.projectId,
                    chatType:
                      chatInfo.type || currentLegacyChat?.chatType || legacyChat.chatType || null,
                    chatTitle:
                      chatInfo.title ||
                      currentLegacyChat?.chatTitle ||
                      legacyChat.chatTitle ||
                      null,
                    chatUsername: newChatUsername, // Используем из вебхука, если было явно передано, иначе из legacy-записи
                    firstSeenAt: now, // Каждый проект отслеживает своё собственное время первого обнаружения чата
                    lastSeenAt: now,
                    botStatus: botStatus || null // Сохраняем статус, если он есть в вебхуке
                  })
                  Debug.info(
                    ctx,
                    `[api/webhook] Чат ${chatIdString} успешно создан для проекта ${bot.projectId}`
                  )
                }
              }
            } else {
              // Чат не найден нигде или существует только в другом проекте
              // ИСПРАВЛЕНИЕ Bug 2: Проверяем, существует ли уже запись для текущего проекта перед созданием новой
              const existingChatForCurrentProject = await TelegramChats.findOneBy(ctx, {
                chatId: chatIdString,
                projectId: bot.projectId
              })

              if (existingChatForCurrentProject) {
                // Запись для текущего проекта уже существует - обновляем её
                // ИСПРАВЛЕНИЕ Bug 1: Используем fallback для chatUsername
                const updatedChatUsernameForCurrent = getChatUsernameWithFallback(
                  existingChatForCurrentProject.chatUsername
                )
                Debug.info(
                  ctx,
                  `[api/webhook] Запись чата ${chatIdString} уже существует для проекта ${bot.projectId}, обновляем, chatUsername: ${existingChatForCurrentProject.chatUsername || 'null'} -> ${updatedChatUsernameForCurrent || 'null'} (usernameExplicitlyProvided=${usernameExplicitlyProvided})`
                )
                await TelegramChats.update(ctx, {
                  id: existingChatForCurrentProject.id,
                  botId: bot.id,
                  projectId: bot.projectId,
                  chatType: chatInfo.type || existingChatForCurrentProject.chatType || null,
                  chatTitle: chatInfo.title || existingChatForCurrentProject.chatTitle || null,
                  chatUsername: updatedChatUsernameForCurrent, // Используем fallback на существующее значение, если поле не было явно передано
                  firstSeenAt: existingChatForCurrentProject.firstSeenAt,
                  lastSeenAt: now,
                  botStatus: botStatus || existingChatForCurrentProject.botStatus || null // Обновляем статус, если он есть в вебхуке
                })
                Debug.info(
                  ctx,
                  `[api/webhook] Чат ${chatIdString} успешно обновлен для проекта ${bot.projectId}`
                )
              } else {
                // Создаём новую запись для текущего проекта
                // ИСПРАВЛЕНИЕ Bug 1: Используем chatUsername из вебхука, если оно было явно передано, иначе null
                const newChatUsername = chatUsername !== undefined ? chatUsername : null
                Debug.info(
                  ctx,
                  `[api/webhook] Чат ${chatIdString} новый для проекта ${bot.projectId}, создаём запись, chatUsername=${newChatUsername || 'null'} (usernameExplicitlyProvided=${usernameExplicitlyProvided})`
                )
                await TelegramChats.create(ctx, {
                  chatId: chatIdString,
                  botId: bot.id,
                  projectId: bot.projectId,
                  chatType: chatInfo.type || null,
                  chatTitle: chatInfo.title || null,
                  chatUsername: newChatUsername, // Используем из вебхука, если было явно передано, иначе null
                  firstSeenAt: now, // Каждый проект отслеживает своё собственное время первого обнаружения чата
                  lastSeenAt: now,
                  botStatus: botStatus || null // Сохраняем статус, если он есть в вебхуке
                })
                Debug.info(
                  ctx,
                  `[api/webhook] Чат ${chatIdString} успешно создан для проекта ${bot.projectId}`
                )
              }
            }
          }
        })
      } else {
        Debug.info(ctx, `[api/webhook] Чат не найден в вебхуке (update не содержит chat)`)
      }
    } catch (chatError: any) {
      // Логируем ошибку, но не прерываем обработку вебхука
      Debug.error(ctx, `[api/webhook] Ошибка сохранения чата: ${chatError.message}`, 'E_CHAT_SAVE')
      Debug.error(ctx, `[api/webhook] Stack trace сохранения чата: ${chatError.stack || 'N/A'}`)
    }

    // Обработка my_chat_member и chat_member для обновления статуса бота в канале
    // Это нужно делать отдельно, так как статус может измениться даже если чат не найден в других местах вебхука
    try {
      const myChatMember = (webhookData as any)?.my_chat_member
      const chatMember = (webhookData as any)?.chat_member

      // Проверяем my_chat_member (изменение статуса бота)
      if (myChatMember && myChatMember.new_chat_member && myChatMember.chat) {
        const newStatus = myChatMember.new_chat_member.status
        const chatId = myChatMember.chat.id != null ? String(myChatMember.chat.id) : null

        if (chatId && newStatus) {
          Debug.info(
            ctx,
            `[api/webhook] Обнаружен my_chat_member update, обновляем статус бота: chatId=${chatId}, newStatus=${newStatus}`
          )

          // Ищем канал по chatId и projectId
          const channel = await TelegramChats.findOneBy(ctx, {
            chatId: chatId,
            projectId: bot.projectId
          })

          if (channel) {
            // Обновляем статус только если он изменился
            if (channel.botStatus !== newStatus) {
              Debug.info(
                ctx,
                `[api/webhook] Статус бота изменился: ${channel.botStatus || 'null'} -> ${newStatus}, обновляем в БД`
              )
              await TelegramChats.update(ctx, {
                id: channel.id,
                botStatus: newStatus
              })
            } else {
              Debug.info(
                ctx,
                `[api/webhook] Статус бота не изменился: ${newStatus}, пропускаем обновление`
              )
            }
          } else {
            Debug.warn(
              ctx,
              `[api/webhook] Канал с chatId=${chatId} не найден для проекта ${bot.projectId}, создаём запись для статуса`
            )
            const lockKey = `chat-status-${bot.projectId}-${chatId}`
            await runWithExclusiveLock(ctx, lockKey, {}, async () => {
              const existing = await TelegramChats.findOneBy(ctx, {
                chatId: chatId,
                projectId: bot.projectId
              })
              if (existing) {
                if (existing.botStatus !== newStatus) {
                  await TelegramChats.update(ctx, {
                    id: existing.id,
                    botStatus: newStatus
                  })
                }
                return
              }

              const now = new Date()
              await TelegramChats.create(ctx, {
                chatId: chatId,
                botId: bot.id,
                projectId: bot.projectId,
                chatType: myChatMember.chat?.type || null,
                chatTitle: myChatMember.chat?.title || null,
                chatUsername: myChatMember.chat?.username || null,
                firstSeenAt: now,
                lastSeenAt: now,
                botStatus: newStatus
              })
            })
          }
        }
      }

      // Проверяем chat_member (изменение статуса участника, но может быть и бот)
      if (chatMember && chatMember.new_chat_member && chatMember.chat) {
        const newStatus = chatMember.new_chat_member.status
        const chatId = chatMember.chat.id != null ? String(chatMember.chat.id) : null

        // Проверяем, что это изменение статуса бота (user.id должен совпадать с bot.id из Telegram)
        // Для упрощения обновляем статус, если chatId найден
        if (chatId && newStatus) {
          Debug.info(
            ctx,
            `[api/webhook] Обнаружен chat_member update, проверяем обновление статуса: chatId=${chatId}, newStatus=${newStatus}`
          )

          // Ищем канал по chatId и projectId
          const channel = await TelegramChats.findOneBy(ctx, {
            chatId: chatId,
            projectId: bot.projectId
          })

          if (channel) {
            // Обновляем статус только если он изменился
            if (channel.botStatus !== newStatus) {
              Debug.info(
                ctx,
                `[api/webhook] Статус бота изменился: ${channel.botStatus || 'null'} -> ${newStatus}, обновляем в БД`
              )
              await TelegramChats.update(ctx, {
                id: channel.id,
                botStatus: newStatus
              })
            } else {
              Debug.info(
                ctx,
                `[api/webhook] Статус бота не изменился: ${newStatus}, пропускаем обновление`
              )
            }
          } else {
            Debug.warn(
              ctx,
              `[api/webhook] Канал с chatId=${chatId} не найден для проекта ${bot.projectId}, создаём запись для статуса`
            )
            const lockKey = `chat-status-${bot.projectId}-${chatId}`
            await runWithExclusiveLock(ctx, lockKey, {}, async () => {
              const existing = await TelegramChats.findOneBy(ctx, {
                chatId: chatId,
                projectId: bot.projectId
              })
              if (existing) {
                if (existing.botStatus !== newStatus) {
                  await TelegramChats.update(ctx, {
                    id: existing.id,
                    botStatus: newStatus
                  })
                }
                return
              }

              const now = new Date()
              await TelegramChats.create(ctx, {
                chatId: chatId,
                botId: bot.id,
                projectId: bot.projectId,
                chatType: chatMember.chat?.type || null,
                chatTitle: chatMember.chat?.title || null,
                chatUsername: chatMember.chat?.username || null,
                firstSeenAt: now,
                lastSeenAt: now,
                botStatus: newStatus
              })
            })
          }
        }
      }
    } catch (statusError: any) {
      // Логируем ошибку, но не прерываем обработку вебхука
      Debug.error(
        ctx,
        `[api/webhook] Ошибка обновления статуса бота: ${statusError.message}`,
        'E_BOT_STATUS_UPDATE'
      )
      Debug.error(
        ctx,
        `[api/webhook] Stack trace обновления статуса: ${statusError.stack || 'N/A'}`
      )
    }

    // Обработка chat_member updates для атрибуции подписок
    // Реализует два способа атрибуции согласно плану:
    // - Способ 1 (детерминированный): Для закрытых каналов (без chat.username) - атрибуция по точному совпадению invite_link
    // - Способ 2 (вероятностный): Для открытых каналов (с chat.username) - батч-матчинг с венгерским алгоритмом
    try {
      const chatMember = (webhookData as any)?.chat_member

      if (chatMember && chatMember.new_chat_member) {
        const newStatus = chatMember.new_chat_member.status
        Debug.info(ctx, `[api/webhook] Обнаружен chat_member update, новый статус: ${newStatus}`)
        Debug.info(ctx, `[api/webhook] Полный объект chat_member: ${JSON.stringify(chatMember)}`)

        // Обрабатываем только подписки (status: 'member')
        if (newStatus === 'member') {
          // Извлекаем данные о подписчике
          const from = chatMember.from
          const subscriberTgId = from?.id != null ? String(from.id) : null
          const subscriberFirstName = from?.first_name || ''
          const subscriberLastName = from?.last_name || ''
          const subscriberName =
            [subscriberFirstName, subscriberLastName].filter(Boolean).join(' ') || null

          // Время подписки - используем date из вебхука или текущее время
          const joinedAt = chatMember.date
            ? new Date(chatMember.date * 1000) // Telegram date в секундах
            : new Date()

          Debug.info(
            ctx,
            `[api/webhook] Данные подписчика: subscriberTgId=${subscriberTgId}, subscriberName=${subscriberName}, joinedAt=${joinedAt.toISOString()}`
          )

          // Извлекаем информацию о чате для определения типа канала
          const chatInfo = chatMember.chat || extractChatFromUpdate(webhookData)
          const chatId = chatInfo?.id != null ? String(chatInfo.id) : null
          const chatUsername = chatInfo?.username || null

          // Определяем тип канала: закрытый (без username) или открытый (с username)
          // Это определяет способ атрибуции согласно плану
          const isClosedChannel =
            !chatUsername || (typeof chatUsername === 'string' && chatUsername.trim() === '')
          Debug.info(
            ctx,
            `[api/webhook] Тип канала: ${isClosedChannel ? 'закрытый (без username)' : 'открытый (с username)'}, chatId=${chatId}, chatUsername=${chatUsername || 'N/A'}`
          )

          // Извлекаем invite_link.invite_link из webhook (согласно плану)
          // Telegram может передавать invite_link как строку или как объект с полем invite_link
          let inviteLink: string | null = null
          const inviteLinkData = chatMember.invite_link

          Debug.info(ctx, `[api/webhook] invite_link данные: ${JSON.stringify(inviteLinkData)}`)

          if (typeof inviteLinkData === 'string') {
            inviteLink = inviteLinkData
            Debug.info(ctx, `[api/webhook] invite_link найден как строка: ${inviteLink}`)
          } else if (
            inviteLinkData &&
            typeof inviteLinkData === 'object' &&
            inviteLinkData.invite_link
          ) {
            // План: "Извлечь invite_link.invite_link из webhook"
            inviteLink = inviteLinkData.invite_link
            Debug.info(
              ctx,
              `[api/webhook] invite_link найден в объекте (invite_link.invite_link): ${inviteLink}`
            )
          } else {
            Debug.info(ctx, `[api/webhook] invite_link не найден в chat_member update`)
          }

          // Генерируем уникальный joinId из update_id или создаём новый
          // Используем 'unknown' вместо null для консистентности с userId в JoinEvent
          // Добавляем случайный компонент для гарантии уникальности даже при одновременных событиях
          const userIdForJoinId = subscriberTgId || 'unknown'
          const updateId = (webhookData as any)?.update_id
          const randomSuffix = Math.random().toString(36).substring(2, 9) // 7 случайных символов
          const timestamp = Date.now()
          const joinId =
            updateId != null
              ? `join_${updateId}_${userIdForJoinId}_${timestamp}_${randomSuffix}`
              : `join_${userIdForJoinId}_${timestamp}_${randomSuffix}`

          if (isClosedChannel) {
            // СПОСОБ 1: Детерминированная атрибуция для закрытых каналов
            Debug.info(ctx, `[api/webhook] Обработка закрытого канала: детерминированная атрибуция`)

            if (inviteLink && typeof inviteLink === 'string') {
              // Ищем TrackingLink по совпадению начала invite_link
              const attributionResult = await findTrackingLinkByInviteLink(
                ctx,
                bot.projectId,
                inviteLink
              )

              if (attributionResult && attributionResult.trackingLink) {
                Debug.info(
                  ctx,
                  `[api/webhook] ✅ TrackingLink найден для детерминированной атрибуции: trackingLinkId=${attributionResult.trackingLink.id}`
                )

                // Создаём JoinEvent со статусом 'pending' - статус и поля атрибуции будут обновлены
                // только после успешного завершения attributeJoinDeterministic
                // НЕ устанавливаем attributedToTrackingLinkId и attributedToLinkClickId здесь,
                // чтобы избежать семантически неверных данных при неудачной атрибуции
                const joinEvent = await JoinEvents.create(ctx, {
                  joinId,
                  chatId: chatId || 'unknown',
                  botId: bot.id,
                  projectId: bot.projectId,
                  userId: subscriberTgId || 'unknown',
                  userName: subscriberName || 'Unknown',
                  joinedAt,
                  inviteLink,
                  attributionMethod: 'deterministic',
                  status: 'pending' // Будет обновлён на 'attributed' после успешной атрибуции
                  // attributedToTrackingLinkId и attributedToLinkClickId будут установлены в attributeJoinDeterministic
                })

                Debug.info(
                  ctx,
                  `[api/webhook] ✅ JoinEvent создан со статусом 'pending': joinEventId=${joinEvent.id}, будет обновлён после атрибуции`
                )

                // Выполняем детерминированную атрибуцию (обновляет JoinEvent и LinkClick)
                // Если вызов упадёт с ошибкой, JoinEvent останется со статусом 'pending'
                try {
                  await attributeJoinDeterministic(
                    ctx,
                    joinEvent,
                    attributionResult.trackingLink,
                    attributionResult.linkClick || null
                  )
                  Debug.info(
                    ctx,
                    `[api/webhook] ✅ Детерминированная атрибуция выполнена: joinEventId=${joinEvent.id}, linkClickId=${attributionResult.linkClick?.id || 'null'}`
                  )
                } catch (attributionError: any) {
                  Debug.error(
                    ctx,
                    `[api/webhook] ❌ Ошибка при выполнении детерминированной атрибуции: ${attributionError.message}`,
                    'E_DETERMINISTIC_ATTRIBUTION'
                  )
                  Debug.error(ctx, `[api/webhook] Stack trace: ${attributionError.stack || 'N/A'}`)
                  // JoinEvent остаётся со статусом 'pending', что правильно - атрибуция не завершена
                }
              } else {
                Debug.warn(
                  ctx,
                  `[api/webhook] ❌ TrackingLink не найден для inviteLink: ${inviteLink.substring(0, Math.min(50, inviteLink.length))}...`
                )
                // Создаём JoinEvent со статусом 'pending' для возможной последующей атрибуции
                const joinEvent = await JoinEvents.create(ctx, {
                  joinId,
                  chatId: chatId || 'unknown',
                  botId: bot.id,
                  projectId: bot.projectId,
                  userId: subscriberTgId || 'unknown',
                  userName: subscriberName || 'Unknown',
                  joinedAt,
                  inviteLink,
                  attributionMethod: 'unknown',
                  status: 'pending'
                })
                Debug.info(
                  ctx,
                  `[api/webhook] ℹ️ JoinEvent создан со статусом 'pending': joinEventId=${joinEvent.id} (TrackingLink не найден)`
                )
              }
            } else {
              Debug.warn(
                ctx,
                `[api/webhook] ⚠️ inviteLink отсутствует для закрытого канала, создаём JoinEvent со статусом 'pending'`
              )
              // Создаём JoinEvent со статусом 'pending'
              const joinEvent = await JoinEvents.create(ctx, {
                joinId,
                chatId: chatId || 'unknown',
                botId: bot.id,
                projectId: bot.projectId,
                userId: subscriberTgId || 'unknown',
                userName: subscriberName || 'Unknown',
                joinedAt,
                inviteLink: null,
                attributionMethod: 'unknown',
                status: 'pending'
              })
              Debug.info(
                ctx,
                `[api/webhook] ℹ️ JoinEvent создан со статусом 'pending': joinEventId=${joinEvent.id} (inviteLink отсутствует)`
              )
            }
          } else {
            // СПОСОБ 2: Вероятностная атрибуция для открытых каналов (батч-матчинг)
            Debug.info(
              ctx,
              `[api/webhook] Обработка открытого канала: создание JoinEvent со статусом 'pending' для батч-матчинга`
            )

            // Создаём JoinEvent со статусом 'pending'
            // Атрибуция будет выполнена периодическим job'ом через батч-матчинг
            const joinEvent = await JoinEvents.create(ctx, {
              joinId,
              chatId: chatId || 'unknown',
              botId: bot.id,
              projectId: bot.projectId,
              userId: subscriberTgId || 'unknown',
              userName: subscriberName || 'Unknown',
              joinedAt,
              inviteLink: inviteLink || null, // Может отсутствовать или быть частичным
              attributionMethod: 'probabilistic',
              status: 'pending'
            })

            Debug.info(
              ctx,
              `[api/webhook] ✅ JoinEvent создан для батч-матчинга: joinEventId=${joinEvent.id}, status=${joinEvent.status}, attributionMethod=${joinEvent.attributionMethod}`
            )
          }
        } else {
          Debug.info(
            ctx,
            `[api/webhook] chat_member update с статусом ${newStatus}, пропускаем (обрабатываем только 'member')`
          )
        }
      }
    } catch (joinEventError: any) {
      // Логируем ошибку, но не прерываем обработку вебхука
      Debug.error(
        ctx,
        `[api/webhook] Ошибка обработки chat_member для JoinEvent: ${joinEventError.message}`,
        'E_JOIN_EVENT_CREATE'
      )
      Debug.error(
        ctx,
        `[api/webhook] Stack trace обработки JoinEvent: ${joinEventError.stack || 'N/A'}`
      )
    }

    // БЕЗОПАСНОСТЬ: Отправляем вебхук всем участникам проекта
    // Используем уникальный socketId на основе userId каждого участника
    // Это гарантирует, что вебхук попадет всем участникам проекта
    try {
      const members = project.members || []
      if (!Array.isArray(members) || members.length === 0) {
        Debug.warn(
          ctx,
          `[api/webhook] В проекте ${bot.projectId} нет участников, вебхук не отправлен`
        )
      } else {
        Debug.info(
          ctx,
          `[api/webhook] Подготовка отправки вебхука через WebSocket всем участникам проекта (${members.length} участников)`
        )

        const socketData = {
          type: 'webhook',
          data: {
            timestamp: Date.now(),
            botId: bot.id,
            botName: bot.botName,
            botUsername: bot.botUsername,
            raw: webhookData
          }
        }

        // Отправляем вебхук каждому участнику проекта
        let skippedMembers = 0 // Участники, пропущенные из-за невалидных данных (валидация)
        let successfulSends = 0 // Успешно отправленные вебхуки
        let failedSends = 0 // Ошибки при отправке (после валидации)

        for (const member of members) {
          // ИСПРАВЛЕНИЕ Bug 3: Проверяем тип перед вызовом .trim() для предотвращения TypeError
          // Сначала проверяем, что member существует и userId является строкой
          if (!member || typeof member.userId !== 'string') {
            skippedMembers++
            Debug.warn(
              ctx,
              `[api/webhook] Участник проекта не имеет валидного userId (тип: ${typeof member?.userId}), пропускаем отправку вебхука. member=${JSON.stringify(member)}`
            )
            continue
          }

          // Затем проверяем, что userId не пустой после trim
          const trimmedUserId = member.userId.trim()
          if (!trimmedUserId) {
            skippedMembers++
            Debug.warn(
              ctx,
              `[api/webhook] Участник проекта имеет пустой userId, пропускаем отправку вебхука. member=${JSON.stringify(member)}`
            )
            continue
          }

          try {
            // ИСПРАВЛЕНИЕ Bug 1: Используем обрезанный userId для формирования socketId
            // Это гарантирует, что socket ID не содержит пробелов и соответствует ожидаемому формату
            const socketId = `webhooks-${trimmedUserId}`
            Debug.info(
              ctx,
              `[api/webhook] Вызов sendDataToSocket с socketId=${socketId} для участника userId=${trimmedUserId}`
            )
            await sendDataToSocket(ctx, socketId, socketData)
            successfulSends++
            Debug.info(
              ctx,
              `[api/webhook] Вебхук успешно отправлен участнику ${trimmedUserId} для бота ${botId}`
            )
          } catch (memberError: any) {
            failedSends++
            Debug.warn(
              ctx,
              `[api/webhook] Ошибка отправки вебхука участнику ${trimmedUserId}: ${memberError.message}`
            )
            // Продолжаем отправку остальным участникам даже если один не получил
          }
        }

        // ИСПРАВЛЕНИЕ Bug 2 и Bug 3: Уведомляем оператора о результатах отправки
        // ИСПРАВЛЕНИЕ Bug 2: Отслеживаем успешные отправки отдельно от пропущенных при валидации
        if (skippedMembers > 0 || failedSends > 0) {
          Debug.warn(
            ctx,
            `[api/webhook] Статистика отправки вебхуков: всего участников=${members.length}, пропущено при валидации=${skippedMembers}, успешно отправлено=${successfulSends}, ошибок при отправке=${failedSends}`
          )
        } else if (successfulSends > 0) {
          Debug.info(
            ctx,
            `[api/webhook] Вебхуки успешно отправлены всем ${successfulSends} участникам проекта`
          )
        }
      }
    } catch (socketError: any) {
      Debug.error(
        ctx,
        `[api/webhook] Ошибка отправки через WebSocket участникам проекта ${bot.projectId}: ${socketError.message}`,
        'E_WEBHOOK_SOCKET'
      )
      Debug.error(ctx, `[api/webhook] Stack trace WebSocket: ${socketError.stack || 'N/A'}`)
      // Не пробрасываем ошибку дальше, чтобы Telegram получил 200 OK
    }

    Debug.info(ctx, `[api/webhook] ========== КОНЕЦ ОБРАБОТКИ ВЕБХУКА ==========`)

    // Telegram требует ответ 200 OK
    return {
      ok: true
    }
  } catch (error: any) {
    Debug.error(ctx, `[api/webhook] ========== КРИТИЧЕСКАЯ ОШИБКА ОБРАБОТКИ ВЕБХУКА ==========`)
    Debug.error(
      ctx,
      `[api/webhook] Ошибка обработки вебхука: ${error.message}`,
      'E_WEBHOOK_PROCESS'
    )
    Debug.error(ctx, `[api/webhook] Тип ошибки: ${error.constructor?.name || 'Unknown'}`)
    Debug.error(ctx, `[api/webhook] Stack trace: ${error.stack || 'N/A'}`)
    Debug.error(ctx, `[api/webhook] URL запроса: ${req.url || 'N/A'}`)
    Debug.error(ctx, `[api/webhook] Метод запроса: ${req.method || 'N/A'}`)
    Debug.error(ctx, `[api/webhook] ========================================================`)

    // Все равно возвращаем 200 OK, чтобы Telegram не повторял запрос
    return {
      ok: true
    }
  }
})

/**
 * GET /api/webhook/list
 * Получение последних вебхуков текущего пользователя
 */
export const apiGetWebhooksListRoute = app.get('/list', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/webhook/list')
    Debug.info(ctx, '[api/webhook/list] ========== НАЧАЛО ЗАПРОСА СПИСКА ВЕБХУКОВ ==========')
    Debug.info(ctx, `[api/webhook/list] URL запроса: ${req.url}`)
    Debug.info(ctx, `[api/webhook/list] Query параметры: ${JSON.stringify(req.query || {})}`)

    // Проверка авторизации
    Debug.info(ctx, `[api/webhook/list] Проверка авторизации пользователя`)
    requireRealUser(ctx)
    Debug.info(ctx, `[api/webhook/list] Пользователь авторизован: userId=${ctx.user.id}`)

    // Получаем параметр limit из query (по умолчанию 30)
    const limitParam = req.query.limit as string | undefined
    let limit = limitParam ? parseInt(limitParam, 10) : 30

    if (isNaN(limit) || limit < 1 || limit > 100) {
      Debug.warn(
        ctx,
        `[api/webhook/list] Некорректный параметр limit: ${limitParam}, используем значение по умолчанию 30`
      )
      limit = 30
    }

    // Получаем параметр botId из query (опционально, для фильтрации по конкретному боту)
    const botIdParam = req.query.botId as string | undefined
    Debug.info(
      ctx,
      `[api/webhook/list] Параметр botId: ${botIdParam || 'не указан (показываем все вебхуки)'}`
    )

    // Получаем параметр chatId из query (опционально, для фильтрации по конкретному каналу)
    const chatIdParam = req.query.chatId as string | undefined
    Debug.info(
      ctx,
      `[api/webhook/list] Параметр chatId: ${chatIdParam || 'не указан (показываем все каналы)'}`
    )

    // Получаем список проектов пользователя для фильтрации вебхуков
    // ИСПРАВЛЕНИЕ Bug 3: Для не-админов применяем фильтрацию на уровне БД, а не в памяти
    const PROJECT_LIMIT = 1000
    const isAdmin = ctx.user.is('Admin')
    const userProjectIds = new Set<string>()

    let allProjects: any[]
    let projectsTruncated = false

    if (isAdmin) {
      // Админы видят вебхуки всех проектов
      allProjects = await Projects.findAll(ctx, {
        order: { createdAt: 'desc' },
        limit: PROJECT_LIMIT
      })
      projectsTruncated = allProjects.length >= PROJECT_LIMIT
      if (projectsTruncated) {
        Debug.warn(
          ctx,
          `[api/webhook/list] Достигнут лимит в ${PROJECT_LIMIT} проектов для админа, некоторые проекты могут быть не учтены`
        )
      }
      allProjects.forEach((project) => userProjectIds.add(project.id))
    } else {
      // ИСПРАВЛЕНИЕ Bug 3: Для обычных пользователей фильтруем проекты в памяти, так как Heap не поддерживает фильтрацию по вложенным массивам
      // Примечание: Это ограничение Heap API - нет способа фильтровать по полям внутри массива members
      // Загружаем все проекты и фильтруем в памяти, но отслеживаем лимит
      allProjects = await Projects.findAll(ctx, {
        order: { createdAt: 'desc' },
        limit: PROJECT_LIMIT
      })
      projectsTruncated = allProjects.length >= PROJECT_LIMIT
      if (projectsTruncated) {
        Debug.warn(
          ctx,
          `[api/webhook/list] Достигнут лимит в ${PROJECT_LIMIT} проектов, некоторые проекты могут быть не учтены для не-админа`
        )
      }

      // Фильтруем проекты, где пользователь является участником
      allProjects.forEach((project) => {
        if (project.members && Array.isArray(project.members)) {
          const isMember = project.members.some(
            (member: any) =>
              member &&
              userIdsMatch(member.userId, ctx.user?.id) &&
              (member.role === 'owner' || member.role === 'member')
          )
          if (isMember) {
            userProjectIds.add(project.id)
          }
        }
      })
    }

    // ИСПРАВЛЕНИЕ Bug 4: Не возвращаемся раньше времени при projectsTruncated
    // Вместо этого продолжаем обработку с доступными проектами и добавляем предупреждение
    // Это позволяет пользователям с большим количеством проектов получить хотя бы частичные данные
    if (projectsTruncated) {
      Debug.warn(
        ctx,
        `[api/webhook/list] Список проектов неполный из-за лимита ${PROJECT_LIMIT}, продолжаем с доступными проектами`
      )
    }

    // Если у пользователя нет проектов, возвращаем пустой список
    if (userProjectIds.size === 0) {
      Debug.info(
        ctx,
        `[api/webhook/list] У пользователя userId=${ctx.user.id} нет проектов, возвращаем пустой список`
      )
      // ИСПРАВЛЕНИЕ Bug 1: truncated должен отражать, была ли обрезана исходная выборка данных,
      // независимо от того, есть ли у пользователя доступ к проектам
      // Если projectsTruncated = true, это означает, что результаты могут быть неполными
      const truncated = projectsTruncated
      const warning = projectsTruncated
        ? `Результаты могут быть неполными: достигнут лимит в ${PROJECT_LIMIT} проектов. Некоторые проекты не были учтены при фильтрации вебхуков.`
        : undefined
      return {
        success: true,
        webhooks: [],
        truncated: truncated,
        warning: warning
      }
    }

    // Получаем боты из проектов пользователя
    const userProjectIdsArray = Array.from(userProjectIds)
    // ИСПРАВЛЕНИЕ Bug 1: Используем $or для надежного IN-запроса вместо массива значений
    // Хотя документация Heap показывает поддержку массива значений, используем $or для гарантированной совместимости
    // Примечание: используем максимальный лимит для findAll (1000), в реальных системах может потребоваться пагинация
    const BOTS_LIMIT = 1000

    // Если только один проект, используем простое условие
    let userBots
    if (userProjectIdsArray.length === 1) {
      userBots = await BotTokens.findAll(ctx, {
        where: {
          projectId: userProjectIdsArray[0]
        },
        limit: BOTS_LIMIT
      })
    } else if (userProjectIdsArray.length > 1) {
      // Для нескольких проектов используем $or
      userBots = await BotTokens.findAll(ctx, {
        where: {
          $or: userProjectIdsArray.map((projectId) => ({ projectId }))
        },
        limit: BOTS_LIMIT
      })
    } else {
      userBots = []
    }

    const botsTruncated = userBots.length >= BOTS_LIMIT
    if (botsTruncated) {
      Debug.warn(
        ctx,
        `[api/webhook/list] Достигнут лимит в ${BOTS_LIMIT} ботов, некоторые боты могут быть не учтены`
      )
    }

    const userBotIds = new Set<string>()
    userBots.forEach((bot) => userBotIds.add(bot.id))

    // Если указан botId, проверяем, что бот принадлежит пользователю
    if (botIdParam && botIdParam.trim()) {
      const trimmedBotId = botIdParam.trim()
      if (!userBotIds.has(trimmedBotId)) {
        Debug.warn(ctx, `[api/webhook/list] Бот ${botIdParam} не принадлежит проектам пользователя`)
        return {
          success: true,
          webhooks: [],
          truncated: projectsTruncated || botsTruncated,
          warning: undefined // ИСПРАВЛЕНИЕ Bug 3: Консистентная структура ответа
        }
      }
    }

    // Если у пользователя нет ботов, возвращаем пустой список
    if (userBotIds.size === 0) {
      Debug.info(
        ctx,
        `[api/webhook/list] У пользователя userId=${ctx.user.id} нет ботов в проектах, возвращаем пустой список`
      )
      return {
        success: true,
        webhooks: [],
        truncated: projectsTruncated || botsTruncated,
        warning: undefined // ИСПРАВЛЕНИЕ Bug 3: Консистентная структура ответа
      }
    }

    // Получаем последние вебхуки для ботов пользователя
    const botIdsArray = Array.from(userBotIds)
    const targetBotIds =
      botIdParam && botIdParam.trim() && userBotIds.has(botIdParam.trim())
        ? [botIdParam.trim()]
        : botIdsArray

    Debug.info(
      ctx,
      `[api/webhook/list] Запрос последних ${limit} вебхуков для ${targetBotIds.length} ботов проекта пользователя userId=${ctx.user.id}`
    )

    // ИСПРАВЛЕНИЕ Bug 1: Используем $or для надежного IN-запроса вместо массива значений
    // Хотя документация Heap показывает поддержку массива значений, используем $or для гарантированной совместимости
    let webhooks
    if (targetBotIds.length === 1) {
      webhooks = await TelegramWebhooks.findAll(ctx, {
        where: {
          botId: targetBotIds[0]
        },
        order: { receivedAt: 'desc' },
        limit: limit
      })
    } else if (targetBotIds.length > 1) {
      // Для нескольких ботов используем $or
      webhooks = await TelegramWebhooks.findAll(ctx, {
        where: {
          $or: targetBotIds.map((botId) => ({ botId }))
        },
        order: { receivedAt: 'desc' },
        limit: limit
      })
    } else {
      webhooks = []
    }

    const webhooksCount = webhooks?.length || 0
    Debug.info(ctx, `[api/webhook/list] Найдено вебхуков: ${webhooksCount}`)

    // ИСПРАВЛЕНИЕ Bug 2: Определяем, были ли данные обрезаны
    const truncated = projectsTruncated || botsTruncated

    // Получаем информацию о ботах для обогащения данных вебхуков
    const botIds = new Set<string>()
    if (webhooks && webhooks.length > 0) {
      for (const webhook of webhooks) {
        if (webhook.botId) {
          botIds.add(webhook.botId)
        }
      }
    }

    const botsMap = new Map<string, { botName: string | null; botUsername: string | null }>()
    if (botIds.size > 0) {
      for (const botId of botIds) {
        try {
          const bot = await BotTokens.findById(ctx, botId)
          if (bot) {
            botsMap.set(botId, {
              botName: bot.botName,
              botUsername: bot.botUsername
            })
          }
        } catch (botError: any) {
          Debug.warn(
            ctx,
            `[api/webhook/list] Ошибка получения информации о боте ${botId}: ${botError.message}`
          )
        }
      }
    }

    // Обогащаем вебхуки информацией о ботах
    Debug.info(ctx, `[api/webhook/list] Обогащение вебхуков информацией о ботах`)
    let enrichedWebhooks = (webhooks || []).map((webhook) => ({
      id: webhook.id,
      botId: webhook.botId,
      botName: botsMap.get(webhook.botId)?.botName || null,
      botUsername: botsMap.get(webhook.botId)?.botUsername || null,
      updateId: webhook.updateId || null,
      raw: webhook.rawData,
      receivedAt: webhook.receivedAt?.getTime() || Date.now()
    }))

    // Фильтруем по chatId, если указан
    if (chatIdParam && chatIdParam.trim()) {
      const targetChatId = chatIdParam.trim()
      Debug.info(ctx, `[api/webhook/list] Фильтрация вебхуков по chatId: ${targetChatId}`)

      enrichedWebhooks = enrichedWebhooks.filter((webhook) => {
        try {
          const chatInfo = extractChatFromUpdate(webhook.raw)
          if (chatInfo && chatInfo.id !== undefined && chatInfo.id !== null) {
            const webhookChatId = String(chatInfo.id)
            return webhookChatId === targetChatId
          }
          return false
        } catch (error: any) {
          Debug.warn(
            ctx,
            `[api/webhook/list] Ошибка извлечения chatId из вебхука ${webhook.id}: ${error.message}`
          )
          return false
        }
      })

      Debug.info(
        ctx,
        `[api/webhook/list] После фильтрации по chatId осталось вебхуков: ${enrichedWebhooks.length}`
      )
    }

    Debug.info(
      ctx,
      `[api/webhook/list] Возвращаем ${enrichedWebhooks.length} вебхуков пользователю ${ctx.user.id}`
    )
    Debug.info(ctx, '[api/webhook/list] ========== КОНЕЦ ЗАПРОСА СПИСКА ВЕБХУКОВ ==========')

    // ИСПРАВЛЕНИЕ Bug 3 и Bug 4: Консистентная структура ответа - всегда включаем warning (undefined если нет предупреждения)
    // ИСПРАВЛЕНИЕ Bug 4: Формируем предупреждение на основе того, что было обрезано
    let warningMessage: string | undefined = undefined
    if (projectsTruncated && botsTruncated) {
      warningMessage = `Результаты могут быть неполными: достигнут лимит в ${PROJECT_LIMIT} проектов и лимит на количество ботов. Некоторые проекты и боты не были учтены.`
    } else if (projectsTruncated) {
      warningMessage = `Результаты могут быть неполными: достигнут лимит в ${PROJECT_LIMIT} проектов. Некоторые проекты не были учтены при фильтрации вебхуков.`
    } else if (botsTruncated) {
      warningMessage =
        'Результаты могут быть неполными из-за лимита на количество ботов. Некоторые боты не были учтены.'
    }

    return {
      success: true,
      webhooks: enrichedWebhooks,
      truncated: truncated,
      warning: warningMessage
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/webhook/list] Ошибка при получении списка вебхуков: ${error.message}`,
      'E_GET_WEBHOOKS_LIST'
    )
    Debug.error(ctx, `[api/webhook/list] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при получении списка вебхуков'
    }
  }
})

/**
 * GET /api/webhook/check/:id
 * Проверка текущего webhook для бота в Telegram
 */
export const apiCheckWebhookRoute = app.get('/check/:id', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/webhook/check')
    Debug.info(ctx, '[api/webhook/check] Начало проверки webhook')

    requireRealUser(ctx)
    const botId = req.params.id
    Debug.info(
      ctx,
      `[api/webhook/check] Проверка webhook для бота ${botId}, пользователь ${ctx.user.id}`
    )

    const bot = await BotTokens.findById(ctx, botId)
    if (!bot) {
      Debug.warn(ctx, `[api/webhook/check] Бот ${botId} не найден`)
      return {
        success: false,
        error: 'Бот не найден'
      }
    }

    // Проверяем права доступа к проекту бота
    const project = await Projects.findById(ctx, bot.projectId)

    if (!project) {
      Debug.warn(ctx, `[api/webhook/check] Проект с ID ${bot.projectId} не найден`)
      return {
        success: false,
        error: 'Проект бота не найден'
      }
    }

    const isAdmin = ctx.user.is('Admin')

    // Проверяем права доступа: только участники или админ могут проверять webhook
    if (!isAdmin) {
      const hasAccess =
        project.members &&
        Array.isArray(project.members) &&
        project.members.some(
          (member: any) =>
            member &&
            userIdsMatch(member.userId, ctx.user?.id) &&
            (member.role === 'owner' || member.role === 'member')
        )

      if (!hasAccess) {
        Debug.warn(
          ctx,
          `[api/webhook/check] Попытка проверки webhook без прав: userId=${ctx.user.id}, projectId=${bot.projectId}`
        )
        return {
          success: false,
          error: 'Нет доступа к этому проекту'
        }
      }
    }

    Debug.info(ctx, `[api/webhook/check] Запрос информации о webhook в Telegram для бота ${botId}`)

    // Обрезаем токен перед использованием для безопасности (на случай пробелов)
    const trimmedToken = bot.token.trim()

    const checkResponse = await request({
      url: `https://api.telegram.org/bot${trimmedToken}/getWebhookInfo`,
      method: 'get',
      responseType: 'json',
      throwHttpErrors: false,
      timeout: 10000
    })

    const checkBody = checkResponse.body as any
    Debug.info(
      ctx,
      `[api/webhook/check] Ответ от Telegram: statusCode=${checkResponse.statusCode}, body=${JSON.stringify(checkBody)}`
    )

    if (checkResponse.statusCode === 200 && checkBody?.ok) {
      const botIdString = String(bot.id)
      // Используем правильный способ генерации URL для роутов с параметрами пути
      const expectedUrl = apiWebhookRoute({ id: botIdString }).url()
      Debug.info(ctx, `[api/webhook/check] Ожидаемый URL: ${expectedUrl}`)
      Debug.info(
        ctx,
        `[api/webhook/check] Текущий URL в Telegram: ${checkBody.result?.url || 'не установлен'}`
      )

      return {
        success: true,
        webhookInfo: checkBody.result,
        expectedUrl: expectedUrl,
        isCorrect: checkBody.result?.url === expectedUrl
      }
    } else {
      Debug.warn(
        ctx,
        `[api/webhook/check] Ошибка получения информации о webhook: ${JSON.stringify(checkBody)}`
      )
      return {
        success: false,
        error: checkBody?.description || 'Ошибка получения информации о webhook'
      }
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/webhook/check] Ошибка проверки webhook: ${error.message}`,
      'E_CHECK_WEBHOOK'
    )
    Debug.error(ctx, `[api/webhook/check] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при проверке webhook'
    }
  }
})

/**
 * GET /api/webhook/test/:id
 * Тестовый endpoint для проверки доступности webhook endpoint
 */
export const apiTestWebhookRoute = app.get('/test/:id', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/webhook/test')
    Debug.info(ctx, '[api/webhook/test] Тестовый запрос для проверки доступности endpoint')

    const botId = req.params.id
    Debug.info(ctx, `[api/webhook/test] Тест для бота ${botId}`)

    const bot = await BotTokens.findById(ctx, botId)
    if (!bot) {
      return {
        success: false,
        error: 'Бот не найден'
      }
    }

    const botIdString = String(bot.id)
    // Используем правильный способ генерации URL для роутов с параметрами пути
    const expectedUrl = apiWebhookRoute({ id: botIdString }).url()
    Debug.info(ctx, `[api/webhook/test] Ожидаемый URL webhook: ${expectedUrl}`)

    return {
      success: true,
      message: 'Endpoint доступен',
      botId: bot.id,
      expectedWebhookUrl: expectedUrl,
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    Debug.error(ctx, `[api/webhook/test] Ошибка: ${error.message}`, 'E_TEST_WEBHOOK')
    return {
      success: false,
      error: error.message || 'Ошибка при тестировании endpoint'
    }
  }
})
