import { request } from '@app/request'
import * as settingsLib from '../settings.lib'

const MAX_API_BASE = 'https://botapi.max.ru'
type MaxJsonBody = Record<string, unknown> | unknown[]

async function getBotToken(ctx: app.Ctx): Promise<string> {
  const token = await settingsLib.getRawSecretSettingString(
    ctx,
    settingsLib.SETTING_KEYS.MAX_BOT_ACCESS_TOKEN
  )
  if (!token) throw new Error('MAX bot token is not configured')
  return token
}

export async function maxApiRequest<T>(
  ctx: app.Ctx,
  method: 'get' | 'post' | 'delete',
  path: string,
  data?: { query?: Record<string, unknown>; json?: unknown; timeoutMs?: number }
): Promise<T> {
  const token = await getBotToken(ctx)
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(data?.query ?? {})) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  }
  const url = `${MAX_API_BASE}${path}${query.toString() ? `?${query.toString()}` : ''}`
  const options = {
    url,
    method,
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'json' as const,
    throwHttpErrors: false,
    timeout: data?.timeoutMs ?? 10000
  }
  const response =
    data?.json === undefined
      ? await request(options)
      : await request({ ...options, json: data.json as MaxJsonBody })
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`MAX API ${method.toUpperCase()} ${path} failed: HTTP ${response.statusCode}`)
  }
  return response.body as T
}

export async function getMaxUpdates(
  ctx: app.Ctx,
  query: { limit: number; timeout: number; marker?: number | null; types?: string[] }
) {
  return maxApiRequest<{ updates?: unknown[]; marker?: number }>(ctx, 'get', '/updates', {
    timeoutMs: (query.timeout + 5) * 1000,
    query: {
      limit: query.limit,
      timeout: query.timeout,
      marker: query.marker ?? undefined,
      types: query.types?.join(',')
    }
  })
}

export async function getMaxMessages(ctx: app.Ctx, chatId: string, count: number, from?: number) {
  return maxApiRequest<{ messages?: unknown[] }>(ctx, 'get', '/messages', {
    query: { chat_id: chatId, count, from }
  })
}

export async function applyMaxSubscription(
  ctx: app.Ctx,
  url: string,
  secret: string,
  updateTypes: string[]
) {
  return maxApiRequest(ctx, 'post', '/subscriptions', {
    json: { url, secret, update_types: updateTypes }
  })
}

export async function deleteMaxSubscription(ctx: app.Ctx, url: string) {
  return maxApiRequest(ctx, 'delete', '/subscriptions', { query: { url } })
}
