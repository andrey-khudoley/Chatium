import { accountNanoid } from '@app/nanoid'
import * as loggerLib from './logger.lib'
import * as settingsLib from './settings.lib'

const LOG_MODULE = 'lib/webhookSecret.lib'

/** Имя ключа Heap-настройки, в котором хранится текущий webhook-токен (ADR-0004 «токен в URL»). */
export const WEBHOOK_TOKEN_KEY = 'webhook_token'

/**
 * Получить текущий webhook-токен; если его нет — сгенерировать новый.
 * Не возвращает токен в логи (только длину/наличие).
 */
export async function ensureWebhookToken(ctx: app.Ctx): Promise<string> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] ensureWebhookToken entry`,
    payload: {}
  })
  const existing = await settingsLib.getSettingString(ctx, WEBHOOK_TOKEN_KEY)
  if (existing && existing.length >= 16) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] ensureWebhookToken existing`,
      payload: { length: existing.length }
    })
    return existing
  }
  const created = await rotateWebhookToken(ctx)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] ensureWebhookToken generated new`,
    payload: { length: created.length }
  })
  return created
}

/**
 * Принудительно сгенерировать новый webhook-токен и сохранить в Heap.
 * Возвращает новый токен — вызывающая сторона несёт ответственность за то,
 * чтобы значение не попало в логи и тела API-ответов наружу за пределы Admin.
 */
export async function rotateWebhookToken(ctx: app.Ctx): Promise<string> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] rotateWebhookToken entry`,
    payload: {}
  })
  const part1 = accountNanoid(ctx)
  const part2 = accountNanoid(ctx)
  const token = `${part1}${part2}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
  await settingsLib.setSetting(ctx, WEBHOOK_TOKEN_KEY, token)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] rotateWebhookToken exit`,
    payload: { length: token.length }
  })
  return token
}

/**
 * Безопасное (по времени, символьное) сравнение токенов.
 * Не возвращает раннее, не зависит от длины — снижает риск тайминговых атак.
 */
export function safeEqualToken(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length === 0 || b.length === 0) return false
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
