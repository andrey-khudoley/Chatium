import { requireAccountRole } from '@app/auth'
import { s } from '@app/schema'
import { reporterApp } from '../shared/error-handler-middleware'
import { ScenarioEventType } from '../shared/enum'
import ScenarioEvents from '../tables/scenario_events.table'
import Autowebinars from '../tables/autowebinars.table'
import EpisodeForms from '../tables/episode_forms.table'
import { startCompletion, CompletionCompletedBody, CompletionFailedBody } from '@start/sdk'
import { pushToCustomJobQueueMulti, scheduleNextCustomJobQueueRunAfter } from '@app/jobs'
import { scenarioImportWorker, ScenarioImportTask } from './scenario-import-worker'
import { parseVTT } from '../shared/vtt-parser'
import {
  buildOnlineContext,
  extractScenarioFromAssistantContent,
  formatOffsetForTranscript,
  getFakeOnlinePoints,
  updateScenarioGenerationState
} from './scenario-helper'

// @shared-route
export const apiScenarioEventsListRoute = reporterApp.get('/list', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const autowebinarId = req.query.autowebinarId as string
  if (!autowebinarId) throw new Error('autowebinarId обязателен')

  const where: any = { autowebinar: autowebinarId }
  const eventType = req.query.eventType as string | undefined
  const filterTab = req.query.filterTab as string | undefined

  if (eventType) {
    where.eventType = eventType
  } else if (filterTab === 'forms') {
    where.eventType = [ScenarioEventType.ShowForm, ScenarioEventType.HideForm]
  } else if (filterTab === 'system') {
    where.eventType = [
      ScenarioEventType.WaitingRoomStart,
      ScenarioEventType.StreamStart,
      ScenarioEventType.Finish
    ]
  }

  const page = parseInt(req.query.page as string) || 1
  const limit = 1000
  const offset = (page - 1) * limit

  const totalCount = await ScenarioEvents.countBy(ctx, where)

  const events = await ScenarioEvents.findAll(ctx, {
    where,
    order: [{ offsetSeconds: 'asc' }, { sortOrder: 'asc' }],
    limit,
    offset
  })

  return {
    events,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit)
  }
})

// Оптимизированная загрузка для карты сценария (только нужные поля)
// @shared-route
export const apiScenarioTimelineDataRoute = reporterApp.get('/timeline-data', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const autowebinarId = req.query.autowebinarId as string
  if (!autowebinarId) throw new Error('autowebinarId обязателен')

  const where: any = { autowebinar: autowebinarId }

  // Считаем общее количество
  const totalCount = await ScenarioEvents.countBy(ctx, where)

  // Загружаем минимальный набор полей порциями по 1000
  const allEvents: Array<{
    id: string
    offsetSeconds: number
    eventType: string
    formTitle?: string
    chatAuthor?: string
    chatText?: string
  }> = []

  const limit = 1000
  let offset = 0

  while (offset < totalCount) {
    const batch = await ScenarioEvents.findAll(ctx, {
      where,
      order: [{ offsetSeconds: 'asc' }],
      limit,
      offset
    })

    // Минимизируем данные для карты
    const minimalBatch = batch.map((evt) => ({
      id: evt.id,
      offsetSeconds: evt.offsetSeconds,
      eventType: evt.eventType,
      // Данные для тултипов
      formTitle: evt.formSnapshot?.title,
      chatAuthor: evt.chatMessage?.authorName,
      chatText: evt.chatMessage?.text?.substring(0, 50)
    }))

    allEvents.push(...minimalBatch)
    offset += limit
  }

  return { events: allEvents, totalCount }
})

// @shared-route
export const apiScenarioEventCreateRoute = reporterApp
  .body((s) => ({
    autowebinarId: s.string(),
    offsetSeconds: s.number(),
    eventType: s.enum(ScenarioEventType),
    formId: s.string().optional(),
    formSnapshot: s.any().optional(),
    chatMessage: s.any().optional(),
    bannerData: s.any().optional(),
    reactionData: s.any().optional(),
    sortOrder: s.number().optional()
  }))
  .post('/create', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const evt = await ScenarioEvents.create(ctx, {
      autowebinar: req.body.autowebinarId,
      offsetSeconds: req.body.offsetSeconds,
      eventType: req.body.eventType,
      formId: req.body.formId,
      formSnapshot: req.body.formSnapshot,
      chatMessage: req.body.chatMessage,
      bannerData: req.body.bannerData,
      reactionData: req.body.reactionData,
      sortOrder: req.body.sortOrder || 0
    })

    return evt
  })

// @shared-route
export const apiScenarioEventUpdateRoute = reporterApp
  .body((s) => ({
    offsetSeconds: s.number().optional(),
    eventType: s.enum(ScenarioEventType).optional(),
    formId: s.string().optional(),
    formSnapshot: s.any().optional(),
    chatMessage: s.any().optional(),
    bannerData: s.any().optional(),
    reactionData: s.any().optional(),
    sortOrder: s.number().optional()
  }))
  .post('/update/:id', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const evt = await ScenarioEvents.update(ctx, {
      id: req.params.id as string,
      ...req.body
    })

    return evt
  })

// @shared-route
export const apiScenarioEventDeleteRoute = reporterApp.post('/delete/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await ScenarioEvents.delete(ctx, req.params.id as string)
  return { success: true }
})

// Экспорт сценария в JSON
// @shared-route
export const apiScenarioExportRoute = reporterApp.get('/export', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const autowebinarId = req.query.autowebinarId as string
  if (!autowebinarId) throw new Error('autowebinarId обязателен')

  const aw = await Autowebinars.findById(ctx, autowebinarId)
  if (!aw) throw new Error('Автовебинар не найден')

  const events = await ScenarioEvents.findAll(ctx, {
    where: { autowebinar: autowebinarId },
    order: [{ offsetSeconds: 'asc' }, { sortOrder: 'asc' }],
    limit: 1000
  })

  // Загружаем формы для snapshot
  const formIds = [...new Set(events.filter((e) => e.formId?.id).map((e) => e.formId?.id))]
  const forms =
    formIds.length > 0
      ? await EpisodeForms.findAll(ctx, {
          where: { id: formIds },
          limit: 200
        })
      : []
  const formsMap = new Map(forms.map((f) => [f.id, f]))

  const exportData = {
    version: 1,
    title: aw.title,
    duration: aw.duration,
    waitingRoomDuration: aw.waitingRoomDuration,
    events: events.map((evt) => {
      const data: any = {}

      if (evt.chatMessage) data.chatMessage = evt.chatMessage
      if (evt.bannerData) data.bannerData = evt.bannerData
      if (evt.reactionData) data.reactionData = evt.reactionData

      if (evt.formId?.id) {
        data.formId = evt.formId.id
        data.formSnapshot = evt.formSnapshot || formsMap.get(evt.formId.id) || null
      }

      return {
        offsetSeconds: evt.offsetSeconds,
        eventType: evt.eventType,
        sortOrder: evt.sortOrder,
        data
      }
    })
  }

  return exportData
})

// Импорт сценария из JSON
// @shared-route
export const apiScenarioImportRoute = reporterApp
  .body((s) => ({
    autowebinarId: s.string(),
    scenario: s.any(),
    clearExisting: s.boolean().optional()
  }))
  .post('/import', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const aw = await Autowebinars.findById(ctx, req.body.autowebinarId)
    if (!aw) throw new Error('Автовебинар не найден')

    const scenario = req.body.scenario
    if (!scenario || !scenario.events) throw new Error('Невалидный формат сценария')

    // Очищаем существующие события если нужно
    if (req.body.clearExisting) {
      const existing = await ScenarioEvents.findAll(ctx, {
        where: { autowebinar: aw.id },
        limit: 1000
      })
      for (const evt of existing) {
        await ScenarioEvents.delete(ctx, evt.id)
      }
    }

    // Маппинг формId → новый formId
    const formIdMap = new Map<string, string>()
    const awDuration = typeof aw.duration === 'number' ? aw.duration : Number.MAX_SAFE_INTEGER

    let created = 0
    for (const evt of scenario.events) {
      // Обрезаем события за пределами duration
      if (evt.offsetSeconds > awDuration) continue

      const eventData: any = {
        autowebinar: aw.id,
        offsetSeconds: evt.offsetSeconds,
        eventType: evt.eventType,
        sortOrder: evt.sortOrder || 0
      }

      if (evt.data?.chatMessage) eventData.chatMessage = evt.data.chatMessage
      if (evt.data?.bannerData) eventData.bannerData = evt.data.bannerData
      if (evt.data?.reactionData) eventData.reactionData = evt.data.reactionData

      // Обработка формы
      if (
        evt.data?.formSnapshot &&
        (evt.eventType === ScenarioEventType.ShowForm ||
          evt.eventType === ScenarioEventType.HideForm)
      ) {
        const snapshot = evt.data.formSnapshot
        const oldFormId = evt.data.formId

        let newFormId = oldFormId ? formIdMap.get(oldFormId) : undefined

        if (!newFormId && snapshot) {
          // Ищем форму по title
          const existingForm = await EpisodeForms.findOneBy(ctx, {
            title: snapshot.title
          })
          if (existingForm) {
            newFormId = existingForm.id
          } else {
            // Создаём из snapshot
            const newForm = await EpisodeForms.create(ctx, {
              title: snapshot.title,
              buttonText: snapshot.buttonText || 'Отправить',
              buttonColor: snapshot.buttonColor,
              fields: snapshot.fields,
              submitAction: snapshot.submitAction || 'thank_you',
              thankYouTitle: snapshot.thankYouTitle,
              thankYouText: snapshot.thankYouText,
              redirectUrl: snapshot.redirectUrl,
              paymentAmount: snapshot.paymentAmount,
              paymentCurrency: snapshot.paymentCurrency,
              paymentDescription: snapshot.paymentDescription
            })
            newFormId = newForm.id
          }

          if (oldFormId) formIdMap.set(oldFormId, newFormId)
        }

        eventData.formId = newFormId
        eventData.formSnapshot = snapshot
      }

      await ScenarioEvents.create(ctx, eventData)
      created++
    }

    return { success: true, created }
  })

// Генерация сценария через ИИ
// @shared-route
export const apiScenarioGenerateRoute = reporterApp
  .body((s) => ({
    autowebinarId: s.string()
  }))
  .post('/generate', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const aw = await Autowebinars.findById(ctx, req.body.autowebinarId)
    if (!aw) throw new Error('Автовебинар не найден')

    if (!aw.subtitles) {
      throw new Error('У автовебинара нет текста видео. Дождитесь обработки видео в Muuvee.')
    }

    await updateScenarioGenerationState(ctx, aw.id, 'processing')

    await ScenarioEvents.deleteAll(ctx, {
      where: { autowebinar: aw.id },
      limit: null,
      hard: true
    })

    // Парсим VTT в текст с таймкодами для более точных offsetSeconds.
    const cues = parseVTT(aw.subtitles)
    const transcriptText =
      cues.length > 0
        ? cues
            .map(
              (cue) =>
                `[${formatOffsetForTranscript(cue.startTime)} - ${formatOffsetForTranscript(cue.endTime)}] ${cue.text}`
            )
            .join('\n')
        : aw.subtitles

    // Загружаем все формы для контекста
    const allForms = await EpisodeForms.findAll(ctx, { limit: 200 })

    // Схема для responseFormat
    const scenarioSchema = s.object({
      events: s
        .array(
          s.object({
            offsetSeconds: s.number().describe('Смещение от начала видео в секундах'),
            eventType: s.enum(ScenarioEventType).describe('Тип события'),
            sortOrder: s.number().optional().describe('Порядок сортировки (опционально)'),
            formId: s.string().optional().describe('ID формы (для show_form/hide_form)'),
            chatAuthorName: s
              .string()
              .optional()
              .describe('Имя автора сообщения (для chat_message)'),
            chatText: s.string().optional().describe('Текст сообщения (для chat_message)'),
            chatAvatarUrl: s.string().optional().describe('URL аватара автора (для chat_message)'),
            bannerTitle: s.string().optional().describe('Заголовок баннера (для sale_banner)'),
            bannerSubtitle: s
              .string()
              .optional()
              .describe('Подзаголовок баннера (для sale_banner)'),
            bannerButtonText: s
              .string()
              .optional()
              .describe('Текст кнопки баннера (для sale_banner)'),
            bannerFormId: s.string().optional().describe('ID формы баннера (для sale_banner)'),
            reactionEmoji: s
              .string()
              .optional()
              .describe('Эмодзи реакции (❤️, 🔥, 😂) (для reaction)')
          })
        )
        .describe('Массив событий сценария')
    })

    // Формируем контекст форм
    const formsContext = allForms
      .map(
        (f) =>
          `- ID: ${f.id}, Название: "${f.title}", Действие: ${f.submitAction}, Цена: ${f.paymentAmount || 0} ${f.paymentCurrency || ''}`
      )
      .join('\n')

    const onlinePoints = getFakeOnlinePoints(aw)
    const onlineContext = buildOnlineContext(onlinePoints)
    const durationMinutes = Math.max(1, Math.round((aw.duration || 0) / 60))

    // Dynamic targets scale event density for long webinars.
    const chatMin = Math.max(35, Math.round(durationMinutes * 0.7))
    const chatMax = Math.max(chatMin + 20, Math.round(durationMinutes * 1.05))
    const reactionMin = Math.max(12, Math.round(durationMinutes * 0.28))
    const reactionMax = Math.max(reactionMin + 12, Math.round(durationMinutes * 0.5))
    const ctaMin = Math.max(2, Math.round(durationMinutes / 45))
    const ctaMax = Math.max(ctaMin + 2, Math.round(durationMinutes / 25))

    const generationPrompt = `**Информация об автовебинаре:**
- Название: "${aw.title}"
- Общая длительность: ${aw.duration} секунд (${Math.floor(aw.duration / 60)} минут)
- Длительность waiting room: ${aw.waitingRoomDuration} секунд

**Доступные формы для показа:**
${formsContext}

**Онлайн аудитории по таймкодам:**
${onlineContext}

**Доступные типы реакций:**
- ❤️ (сердце)
- 🔥 (огонь)
- 😂 (смех)

**Полный текст видео с таймкодами:**
${transcriptText}

**Твоя задача:**
1. Создай системные события: waiting_room_start (offset 0), stream_start (offset ${aw.waitingRoomDuration}), finish (offset ${aw.duration})
2. Добавь РЕАЛИСТИЧНЫЕ сообщения в чат от разных участников по всему вебинару
  - Сообщения должны быть ЕСТЕСТВЕННЫМИ и соответствовать контексту видео
   - Используй разные имена (Мария, Александр, Елена, Дмитрий, Анна и т.д.)
   - Сообщения должны быть короткими и живыми ("Спасибо за инфо!", "А где можно скачать?", "Отличное объяснение 👍")
  - Плотность сообщений должна зависеть от онлайна по таймкодам: на пиках активности заметно больше, на просадках меньше
  - Добавь ${chatMin}-${chatMax} сообщений на весь вебинар, распределяя их по длительности и активности аудитории
3. Добавь ${ctaMin}-${ctaMax} CTA-событий (показ форм) в КЛЮЧЕВЫЕ моменты вебинара
   - Используй формы из списка выше
   - Для show_form укажи formId
4. Добавь продажные баннеры в стратегических местах
   - Для sale_banner укажи: bannerTitle, bannerSubtitle, bannerButtonText, bannerFormId
5. Добавь ${reactionMin}-${reactionMax} реакций в моменты эмоциональных пиков
   - Для reaction укажи reactionEmoji (❤️, 🔥 или 😂)
6. Учитывай активность аудитории при распределении всех событий:
  - Высокий онлайн: больше chat_message и reaction
  - Средний онлайн: умеренная активность
  - Низкий онлайн: меньше сообщений и реакций, но сохраняй естественность

**Структура события:**
- Для chat_message: укажи chatAuthorName, chatText (опционально chatAvatarUrl)
- Для show_form/hide_form: укажи formId
- Для sale_banner: укажи bannerTitle, bannerSubtitle, bannerButtonText, bannerFormId
- Для reaction: укажи reactionEmoji

**КРИТИЧЕСКИ ВАЖНО:**
- Все offsetSeconds ОБЯЗАТЕЛЬНО должны быть в пределах [0, ${aw.duration}]
- При выборе offsetSeconds ориентируйся на таймкоды в тексте видео
- Равномерно распределяй события по всей длительности
- Распределение событий должно коррелировать с профилем онлайна по таймкодам
- Сообщения должны выглядеть как от реальных людей
- Обязательно придерживайся целевых диапазонов количества сообщений, реакций и CTA
- Создай ЖИВОЙ и ЕСТЕСТВЕННЫЙ сценарий для всего вебинара`

    try {
      await startCompletion(ctx, {
        model: 'openai/gpt-5.4',
        system: `Ты — эксперт по созданию сценариев вебинаров. Анализируй полный текст видео и создавай реалистичный, естественный сценарий с живыми сообщениями от участников на всю длительность вебинара.

Примеры событий:
- Сообщение в чат: { "offsetSeconds": 120, "eventType": "chat_message", "chatAuthorName": "Мария", "chatText": "Спасибо за инфо!" }
- Показ формы: { "offsetSeconds": 600, "eventType": "show_form", "formId": "form123" }
- Баннер: { "offsetSeconds": 900, "eventType": "sale_banner", "bannerTitle": "Спецпредложение", "bannerSubtitle": "Скидка 50%", "bannerButtonText": "Получить", "bannerFormId": "form123" }
- Реакция: { "offsetSeconds": 300, "eventType": "reaction", "reactionEmoji": "❤️" }

Важно: offsetSeconds должны быть строго в диапазоне от 0 до длительности вебинара.`,
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: generationPrompt }]
          }
        ],
        responseFormat: scenarioSchema,
        onCompletionCompleted: scenarioGenerationCompletedCallback,
        onCompletionFailed: scenarioGenerationFailedCallback,
        context: {
          autowebinarId: aw.id,
          generationMode: 'full'
        }
      })
    } catch (e: any) {
      await updateScenarioGenerationState(
        ctx,
        aw.id,
        'failed',
        e?.message || 'Не удалось запустить генерацию'
      )
      throw e
    }

    ctx.account.log('[ScenarioGeneration] Full generation started', {
      level: 'info',
      json: { autowebinarId: aw.id }
    })

    return { success: true, message: 'Генерация полного сценария запущена' }
  })

// Callback успешной генерации сценария
const scenarioGenerationCompletedCallback = app
  .function('/scenario-generation-completed')
  .body(CompletionCompletedBody)
  .handle(async (ctx, body, caller) => {
    // Проверка caller
    if (!(caller.type === 'plugin' && caller.appSlug === 'start')) {
      throw new Error('Invalid caller')
    }

    const { autowebinarId, generationMode } = body.context ?? {}
    if (!autowebinarId) {
      ctx.account.log('[ScenarioGeneration] No autowebinarId in context', {
        level: 'warn'
      })
      return null
    }

    ctx.account.log('[ScenarioGeneration] Generation completed', {
      level: 'info',
      json: {
        autowebinarId,
        generationMode,
        messagesCount: body.messages?.length
      }
    })

    // Получаем последнее сообщение от ИИ с JSON сценария
    const lastMessage = body.messages?.[body.messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'assistant') {
      ctx.account.log('[ScenarioGeneration] No assistant message', {
        level: 'warn'
      })
      await updateScenarioGenerationState(
        ctx,
        autowebinarId,
        'failed',
        'No assistant message in completion result'
      )
      return null
    }

    const scenarioJSON = extractScenarioFromAssistantContent(lastMessage.content)
    if (!scenarioJSON?.events || !Array.isArray(scenarioJSON.events)) {
      ctx.account.log('[ScenarioGeneration] Invalid scenario JSON format', {
        level: 'warn',
        json: { content: lastMessage.content }
      })
      await updateScenarioGenerationState(
        ctx,
        autowebinarId,
        'failed',
        'Invalid scenario JSON format'
      )
      return null
    }

    const existingSystemEvents = await ScenarioEvents.findAll(ctx, {
      where: {
        autowebinar: autowebinarId,
        eventType: [
          ScenarioEventType.WaitingRoomStart,
          ScenarioEventType.StreamStart,
          ScenarioEventType.Finish
        ]
      },
      limit: 10
    })
    const existingSystemTypes = new Set(existingSystemEvents.map((evt) => evt.eventType))

    const events = scenarioJSON.events.filter((event: any) => {
      if (event?.eventType === ScenarioEventType.WaitingRoomStart) {
        return !existingSystemTypes.has(ScenarioEventType.WaitingRoomStart)
      }
      if (event?.eventType === ScenarioEventType.StreamStart) {
        return !existingSystemTypes.has(ScenarioEventType.StreamStart)
      }
      if (event?.eventType === ScenarioEventType.Finish) {
        return !existingSystemTypes.has(ScenarioEventType.Finish)
      }
      return true
    })

    ctx.account.log('[ScenarioGeneration] Preparing to import events', {
      level: 'info',
      json: {
        autowebinarId,
        eventsCount: events.length,
        droppedSystemDuplicates: scenarioJSON.events.length - events.length
      }
    })

    if (events.length === 0) {
      ctx.account.log('[ScenarioGeneration] No events to import after filtering', {
        level: 'info',
        json: { autowebinarId, generationMode }
      })
      await updateScenarioGenerationState(ctx, autowebinarId, 'failed', 'No events generated')
      return null
    }

    // Формируем задачи для очереди
    const tasks: ScenarioImportTask[] = events.map((event: any) => ({
      autowebinarId,
      event: {
        offsetSeconds: event.offsetSeconds,
        eventType: event.eventType,
        formId: event.formId || null,
        formSnapshot: null, // formSnapshot убран из схемы
        chatMessage:
          event.chatAuthorName && event.chatText
            ? {
                authorName: event.chatAuthorName,
                text: event.chatText,
                avatarUrl: event.chatAvatarUrl || undefined
              }
            : null,
        bannerData:
          event.bannerTitle && event.bannerSubtitle
            ? {
                title: event.bannerTitle,
                subtitle: event.bannerSubtitle,
                buttonText: event.bannerButtonText,
                formId: event.bannerFormId
              }
            : null,
        reactionData: event.reactionEmoji ? { emoji: event.reactionEmoji } : null
      }
    }))

    const QUEUE_NAME = `scenario-import-${autowebinarId}`

    // Добавляем все задачи в очередь
    await pushToCustomJobQueueMulti(ctx, QUEUE_NAME, scenarioImportWorker.path(), tasks, {
      priority: 1e3
    })

    ctx.account.log('[ScenarioGeneration] Tasks added to queue', {
      level: 'info',
      json: { autowebinarId, queueName: QUEUE_NAME, tasksCount: tasks.length }
    })

    await updateScenarioGenerationState(ctx, autowebinarId, 'completed')

    return null
  })

// Callback ошибки генерации
const scenarioGenerationFailedCallback = app
  .function('/scenario-generation-failed')
  .body(CompletionFailedBody)
  .handle(async (ctx, body, caller) => {
    if (!(caller.type === 'plugin' && caller.appSlug === 'start')) {
      throw new Error('Invalid caller')
    }

    const { autowebinarId, generationMode } = body.context ?? {}

    ctx.account.log('[ScenarioGeneration] Generation failed', {
      level: 'error',
      json: { autowebinarId, generationMode, error: body.error }
    })

    if (autowebinarId) {
      await updateScenarioGenerationState(
        ctx,
        autowebinarId,
        'failed',
        body.error || 'Generation failed'
      )
    }

    return null
  })
