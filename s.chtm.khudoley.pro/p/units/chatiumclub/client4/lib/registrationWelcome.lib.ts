import * as loggerLib from './logger.lib'
import * as webhookRepo from '../repos/webhookLog.repo'
import { invoke } from './gateway/gatewayClient'
import * as settingsLib from './settings.lib'

const LOG_MODULE = 'lib/registrationWelcome.lib'

/** Имя ключа Heap для шаблона текста приветствия. */
export const WELCOME_TEMPLATE_KEY = 'welcome_message_template'

/** Шаблон по умолчанию (демо). Подстановки: {{name}}, {{activityName}}, {{activityDate}}. */
export const DEFAULT_WELCOME_TEMPLATE =
  'Привет, {{name}}! Вы зарегистрированы на «{{activityName}}»{{activityDate}}. Скоро пришлю материалы для подготовки. — Леночка'

/** Имя ключа Heap, в котором настроен идентификатор диалога Леночки в школе по умолчанию. */
export const WELCOME_DEFAULT_DIALOG_KEY = 'lenochka_default_dialog_id'

/** Имя ключа Heap, в котором настроен идентификатор пользователя Леночки. */
export const WELCOME_DEFAULT_USER_KEY = 'lenochka_default_user_id'

/** Транспорт для `addCommentToDialog` по умолчанию. */
export const WELCOME_DEFAULT_TRANSPORT = 'system'

/**
 * Нормализованное событие GC «регистрация на активность», извлечённое из произвольного payload.
 * Поля могут быть пустыми — gateway не нормализует тело webhook'а.
 */
export type NormalizedRegistrationEvent = {
  /** Уникальный ID события в GC; пустая строка — если не нашли. */
  gcEventId: string
  email: string
  name: string
  activityId: string
  activityName: string
  activityDate: string
  /** Опциональный идентификатор диалога, если GC прислал. */
  dialogId: string
  /** Опциональный идентификатор пользователя GC, который видит сообщение. */
  userId: string
}

function pickString(o: unknown, ...keys: string[]): string {
  if (!o || typeof o !== 'object') return ''
  const obj = o as Record<string, unknown>
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim().length > 0) return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return ''
}

/**
 * Нормализация произвольного тела webhook'а GC о регистрации в `NormalizedRegistrationEvent`.
 * Учитывает разные форматы (Legacy/new, разные поля) — поэтому смотрит на синонимы.
 */
export function normalizeRegistrationEvent(raw: unknown): NormalizedRegistrationEvent {
  const root = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const user =
    root.user && typeof root.user === 'object' ? (root.user as Record<string, unknown>) : {}
  const training =
    root.training && typeof root.training === 'object'
      ? (root.training as Record<string, unknown>)
      : {}
  const webinar =
    root.webinar && typeof root.webinar === 'object'
      ? (root.webinar as Record<string, unknown>)
      : {}

  const email = pickString(user, 'email', 'Email') || pickString(root, 'email', 'user_email')
  const name =
    pickString(user, 'name', 'first_name', 'fullName') || pickString(root, 'name', 'user_name')
  const activityId =
    pickString(training, 'id') ||
    pickString(webinar, 'id') ||
    pickString(root, 'training_id', 'webinar_id', 'activity_id')
  const activityName =
    pickString(training, 'name', 'title') ||
    pickString(webinar, 'name', 'title') ||
    pickString(root, 'training_name', 'webinar_name', 'activity_name')
  const activityDate =
    pickString(training, 'start_date', 'startDate') ||
    pickString(webinar, 'start_date', 'startDate') ||
    pickString(root, 'start_date', 'startDate')
  const dialogId =
    pickString(root, 'dialog_id', 'dialogId') || pickString(user, 'dialog_id', 'dialogId')
  const userId =
    pickString(user, 'id', 'user_id', 'userId') || pickString(root, 'user_id', 'userId')
  const gcEventId =
    pickString(root, 'event_id', 'eventId', 'id') ||
    (email && activityId ? `reg_${email}_${activityId}` : '')

  return { gcEventId, email, name, activityId, activityName, activityDate, dialogId, userId }
}

/** Подставить значения в шаблон приветствия. */
export function renderWelcomeMessage(template: string, event: NormalizedRegistrationEvent): string {
  const safeName = event.name ? event.name : 'участник'
  const safeActivityName = event.activityName ? event.activityName : 'мероприятие в GetCourse'
  const safeActivityDate = event.activityDate ? ` (${event.activityDate})` : ''
  return template
    .replaceAll('{{name}}', safeName)
    .replaceAll('{{activityName}}', safeActivityName)
    .replaceAll('{{activityDate}}', safeActivityDate)
}

export type WelcomeResult = {
  status: webhookRepo.WebhookStatus
  reactionOk: boolean
  reactionErrorCode?: string
  requestId?: string | null
  logId: string
}

/**
 * Полный цикл реакции на событие регистрации:
 * 1. Идемпотентность по `gcEventId` (если есть). Дубликат → status: already_processed.
 * 2. Сборка `addCommentToDialog` args (`dialogId`, `userId`, `transport`, `commentText`).
 *    Если в Heap нет дефолтных `dialogId`/`userId` и в событии тоже нет —
 *    пропускаем вызов и логируем status: error с пометкой `missing_dialog_or_user`.
 * 3. invoke('addCommentToDialog') → запись в WebhookLog.
 *
 * Возвращает структурированный результат — без бросания исключений.
 */
export async function processRegistrationEvent(
  ctx: app.Ctx,
  event: NormalizedRegistrationEvent
): Promise<WelcomeResult> {
  const startedAt = Date.now()
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] processRegistrationEvent entry`,
    payload: {
      gcEventId: event.gcEventId,
      email: event.email,
      activityId: event.activityId,
      activityName: event.activityName,
      hasDialogIdInEvent: !!event.dialogId,
      hasUserIdInEvent: !!event.userId
    }
  })

  if (event.gcEventId) {
    const existing = await webhookRepo.findByGcEventId(ctx, event.gcEventId)
    if (existing) {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_MODULE}] processRegistrationEvent already processed`,
        payload: { gcEventId: event.gcEventId, existingStatus: existing.status }
      })
      const log = await webhookRepo.create(ctx, {
        gcEventId: event.gcEventId,
        eventType: 'registrationCreated',
        email: event.email,
        activityId: event.activityId,
        activityName: event.activityName,
        tokenValid: true,
        reactionOk: false,
        status: 'already_processed'
      })
      return { status: 'already_processed', reactionOk: false, logId: String(log.id) }
    }
  }

  const dialogId =
    event.dialogId || (await settingsLib.getSettingString(ctx, WELCOME_DEFAULT_DIALOG_KEY)).trim()
  const userId =
    event.userId || (await settingsLib.getSettingString(ctx, WELCOME_DEFAULT_USER_KEY)).trim()

  if (!dialogId || !userId) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] processRegistrationEvent missing dialog/user — skip invoke`,
      payload: {
        hasDialogId: !!dialogId,
        hasUserId: !!userId,
        gcEventId: event.gcEventId
      }
    })
    const log = await webhookRepo.create(ctx, {
      gcEventId: event.gcEventId,
      eventType: 'registrationCreated',
      email: event.email,
      activityId: event.activityId,
      activityName: event.activityName,
      tokenValid: true,
      reactionOk: false,
      reactionErrorCode: 'CLIENT4_MISSING_DIALOG_OR_USER',
      status: 'error'
    })
    return {
      status: 'error',
      reactionOk: false,
      reactionErrorCode: 'CLIENT4_MISSING_DIALOG_OR_USER',
      logId: String(log.id)
    }
  }

  const templateRaw = (await settingsLib.getSettingString(ctx, WELCOME_TEMPLATE_KEY)).trim()
  const template = templateRaw || DEFAULT_WELCOME_TEMPLATE
  const commentText = renderWelcomeMessage(template, event)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] processRegistrationEvent invoke addCommentToDialog`,
    payload: {
      dialogId,
      userId,
      commentLength: commentText.length,
      gcEventId: event.gcEventId
    }
  })

  const r = await invoke(ctx, {
    op: 'addCommentToDialog',
    args: {
      dialogId,
      userId,
      transport: WELCOME_DEFAULT_TRANSPORT,
      commentText
    }
  })

  const reactionOk = r.ok
  let reactionErrorCode = ''
  if ('error' in r && r.error) {
    reactionErrorCode = r.error.code
  }
  const status: webhookRepo.WebhookStatus = reactionOk ? 'delivered' : 'error'
  const log = await webhookRepo.create(ctx, {
    gcEventId: event.gcEventId,
    eventType: 'registrationCreated',
    email: event.email,
    activityId: event.activityId,
    activityName: event.activityName,
    tokenValid: true,
    reactionOk,
    reactionErrorCode,
    ...(r.requestId ? { gatewayRequestId: r.requestId } : {}),
    status
  })

  await loggerLib.writeServerLog(ctx, {
    severity: reactionOk ? 6 : 4,
    message: `[${LOG_MODULE}] processRegistrationEvent exit`,
    payload: {
      reactionOk,
      gatewayHttpStatus: r.gatewayHttpStatus,
      requestId: r.requestId,
      errorCode: reactionErrorCode || null,
      durationMs: Date.now() - startedAt
    }
  })

  return {
    status,
    reactionOk,
    ...(reactionErrorCode ? { reactionErrorCode } : {}),
    requestId: r.requestId,
    logId: String(log.id)
  }
}
