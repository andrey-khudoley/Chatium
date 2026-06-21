import * as loggerLib from './logger.lib'
import * as webhookRepo from '../repos/webhookLog.repo'
import { invoke } from './gateway/gatewayClient'
import * as settingsLib from './settings.lib'

const LOG_MODULE = 'lib/paymentReaction.lib'

/** Имя ключа Heap для шаблона текста сообщения Леночки. */
export const REACTION_TEMPLATE_KEY = 'lenochka_message_template'

/** Шаблон по умолчанию (демо). Подстановки: {{name}}, {{amount}}, {{dealId}}. */
export const DEFAULT_REACTION_TEMPLATE =
  'Привет, {{name}}! Спасибо за оплату заказа №{{dealId}} на сумму {{amount}} ₽. Вы в команде! — Леночка'

/** Имя ключа Heap, в котором настроен идентификатор диалога Леночки в школе по умолчанию. */
export const REACTION_DEFAULT_DIALOG_KEY = 'lenochka_default_dialog_id'

/** Имя ключа Heap, в котором настроен идентификатор пользователя Леночки (от чьего имени отправляется комментарий). */
export const REACTION_DEFAULT_USER_KEY = 'lenochka_default_user_id'

/** Транспорт для `addCommentToDialog` по умолчанию (см. реестр op). */
export const REACTION_DEFAULT_TRANSPORT = 'system'

/**
 * Нормализованное событие GC «оплата прошла», извлечённое из произвольного payload.
 * Поля могут быть пустыми — gateway не нормализует тело webhook'а.
 */
export type NormalizedPaymentEvent = {
  /** Уникальный ID события в GC; пустая строка — если не нашли. */
  gcEventId: string
  email: string
  name: string
  dealId: string
  amount: number
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

function pickNumber(o: unknown, ...keys: string[]): number {
  if (!o || typeof o !== 'object') return 0
  const obj = o as Record<string, unknown>
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string') {
      const n = parseFloat(v)
      if (Number.isFinite(n)) return n
    }
  }
  return 0
}

/**
 * Нормализация произвольного тела webhook'а GC об оплате в `NormalizedPaymentEvent`.
 * Учитывает разные форматы (Legacy/new, разные поля) — поэтому смотрит на синонимы.
 */
export function normalizePaymentEvent(raw: unknown): NormalizedPaymentEvent {
  const root = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const user =
    root.user && typeof root.user === 'object' ? (root.user as Record<string, unknown>) : {}
  const deal =
    root.deal && typeof root.deal === 'object' ? (root.deal as Record<string, unknown>) : {}

  const email =
    pickString(user, 'email', 'Email') ||
    pickString(deal, 'email') ||
    pickString(root, 'email', 'user_email')
  const name =
    pickString(user, 'name', 'first_name', 'fullName') || pickString(root, 'name', 'user_name')
  const dealId =
    pickString(deal, 'id', 'deal_id', 'dealId') ||
    pickString(root, 'deal_id', 'order_id', 'dealId', 'orderId')
  const amount =
    pickNumber(deal, 'price', 'amount', 'total') || pickNumber(root, 'price', 'amount', 'total')
  const dialogId =
    pickString(root, 'dialog_id', 'dialogId') || pickString(user, 'dialog_id', 'dialogId')
  const userId =
    pickString(user, 'id', 'user_id', 'userId') || pickString(root, 'user_id', 'userId')
  const gcEventId =
    pickString(root, 'event_id', 'eventId', 'id') ||
    (dealId && email ? `pay_${dealId}_${email}` : '')

  return { gcEventId, email, name, dealId, amount, dialogId, userId }
}

/** Подставить значения в шаблон сообщения Леночки. */
export function renderReactionMessage(template: string, event: NormalizedPaymentEvent): string {
  const safeName = event.name ? event.name : 'участник'
  const safeDealId = event.dealId ? event.dealId : '—'
  const safeAmount = event.amount ? String(event.amount) : '—'
  return template
    .replaceAll('{{name}}', safeName)
    .replaceAll('{{dealId}}', safeDealId)
    .replaceAll('{{amount}}', safeAmount)
}

export type ReactionResult = {
  status: webhookRepo.WebhookStatus
  reactionOk: boolean
  reactionErrorCode?: string
  requestId?: string | null
  logId: string
}

/**
 * Полный цикл реакции на событие оплаты:
 * 1. Идемпотентность по `gcEventId` (если есть). Дубликат → status: already_processed.
 * 2. Сборка `addCommentToDialog` args (`dialogId`, `userId`, `transport`, `commentText`).
 *    Если в Heap нет дефолтных `dialogId`/`userId` и в событии тоже нет —
 *    пропускаем вызов и логируем status: error с пометкой `missing_dialog_or_user`.
 * 3. invoke('addCommentToDialog') → запись в WebhookLog.
 *
 * Возвращает структурированный результат — без бросания исключений.
 */
export async function processPaymentEvent(
  ctx: app.Ctx,
  event: NormalizedPaymentEvent
): Promise<ReactionResult> {
  const startedAt = Date.now()
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] processPaymentEvent entry`,
    payload: {
      gcEventId: event.gcEventId,
      email: event.email,
      dealId: event.dealId,
      amount: event.amount,
      hasDialogIdInEvent: !!event.dialogId,
      hasUserIdInEvent: !!event.userId
    }
  })

  if (event.gcEventId) {
    const existing = await webhookRepo.findByGcEventId(ctx, event.gcEventId)
    if (existing) {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_MODULE}] processPaymentEvent already processed`,
        payload: { gcEventId: event.gcEventId, existingStatus: existing.status }
      })
      const log = await webhookRepo.create(ctx, {
        gcEventId: event.gcEventId,
        eventType: 'paymentReceived',
        email: event.email,
        dealId: event.dealId,
        amount: event.amount,
        tokenValid: true,
        reactionOk: false,
        status: 'already_processed'
      })
      return { status: 'already_processed', reactionOk: false, logId: String(log.id) }
    }
  }

  const dialogId =
    event.dialogId || (await settingsLib.getSettingString(ctx, REACTION_DEFAULT_DIALOG_KEY)).trim()
  const userId =
    event.userId || (await settingsLib.getSettingString(ctx, REACTION_DEFAULT_USER_KEY)).trim()

  if (!dialogId || !userId) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] processPaymentEvent missing dialog/user — skip invoke`,
      payload: {
        hasDialogId: !!dialogId,
        hasUserId: !!userId,
        gcEventId: event.gcEventId
      }
    })
    const log = await webhookRepo.create(ctx, {
      gcEventId: event.gcEventId,
      eventType: 'paymentReceived',
      email: event.email,
      dealId: event.dealId,
      amount: event.amount,
      tokenValid: true,
      reactionOk: false,
      reactionErrorCode: 'CLIENT3_MISSING_DIALOG_OR_USER',
      status: 'error'
    })
    return {
      status: 'error',
      reactionOk: false,
      reactionErrorCode: 'CLIENT3_MISSING_DIALOG_OR_USER',
      logId: String(log.id)
    }
  }

  const templateRaw = (await settingsLib.getSettingString(ctx, REACTION_TEMPLATE_KEY)).trim()
  const template = templateRaw || DEFAULT_REACTION_TEMPLATE
  const commentText = renderReactionMessage(template, event)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] processPaymentEvent invoke addCommentToDialog`,
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
      transport: REACTION_DEFAULT_TRANSPORT,
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
    eventType: 'paymentReceived',
    email: event.email,
    dealId: event.dealId,
    amount: event.amount,
    tokenValid: true,
    reactionOk,
    reactionErrorCode,
    ...(r.requestId ? { gatewayRequestId: r.requestId } : {}),
    status
  })

  await loggerLib.writeServerLog(ctx, {
    severity: reactionOk ? 6 : 4,
    message: `[${LOG_MODULE}] processPaymentEvent exit`,
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
