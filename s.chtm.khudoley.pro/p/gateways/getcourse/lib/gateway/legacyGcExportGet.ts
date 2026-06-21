import { request } from '@app/request'
import { GW_OUTBOUND_TIMEOUT_MS } from './constants'

export type LegacyGcHttpResult = {
  gcStatus: number
  gcContentType: string
  gcBodyText: string
}

function argsToQueryParams(args: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(args)) {
    if (v === undefined || v === null) continue
    if (typeof v === 'object' && !Array.isArray(v)) {
      out[k] = JSON.stringify(v)
    } else if (Array.isArray(v)) {
      out[k] = JSON.stringify(v)
    } else if (typeof v === 'boolean' || typeof v === 'number') {
      out[k] = String(v)
    } else {
      out[k] = String(v)
    }
  }
  return out
}

/**
 * Исходящий GET к Legacy GetCourse: `key` в query, путь под `/pl/api` (manual §4.5, help API).
 * Без ретраев; тот же таймаут, что и для POST import.
 */
export async function invokeLegacyGcExportGet(input: {
  schoolHostTrimmed: string
  /** Путь с ведущим слэшем, например `/account/users` (после подстановки path params). */
  resolvedPath: string
  schoolApiKey: string
  /** Параметры query кроме `key` (key подставляется из schoolApiKey). */
  queryArgs: Record<string, unknown>
}): Promise<LegacyGcHttpResult> {
  const path = input.resolvedPath.startsWith('/') ? input.resolvedPath : `/${input.resolvedPath}`
  const url = `https://${input.schoolHostTrimmed}/pl/api${path}`
  const sp: Record<string, string> = {
    key: input.schoolApiKey,
    ...argsToQueryParams(input.queryArgs)
  }
  try {
    const res = await request({
      url,
      method: 'get',
      searchParams: sp,
      responseType: 'text',
      throwHttpErrors: false,
      timeout: GW_OUTBOUND_TIMEOUT_MS
    })
    const statusCode =
      typeof res.statusCode === 'number' && Number.isFinite(res.statusCode) ? res.statusCode : 0
    const headers = (res.headers ?? {}) as Record<string, string | string[] | undefined>
    const rawCt = headers['content-type'] ?? headers['Content-Type']
    const gcContentType = Array.isArray(rawCt) ? (rawCt[0] ?? '') : (rawCt ?? '')
    const body = typeof res.body === 'string' ? res.body : String(res.body ?? '')
    return {
      gcStatus: statusCode,
      gcContentType,
      gcBodyText: body
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/timeout|ETIMEDOUT|timed out/i.test(msg)) {
      throw new Error('INVOKE_GC_TIMEOUT')
    }
    throw new Error('INVOKE_GC_NETWORK_ERROR')
  }
}
