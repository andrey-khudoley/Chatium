import { request } from '@app/request'
import { GW_OUTBOUND_TIMEOUT_MS } from './constants'

export type NewGcApiResult = {
  gcStatus: number
  gcContentType: string
  gcBodyText: string
}

/** Строковые query-параметры для GET (плоский набор из args gateway). */
function argsToSearchParams(args: Record<string, unknown>): Record<string, string> {
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
 * Исходящий запрос к Tech API GetCourse (контур new), manual §4.5, §5.2, §8.1.
 * Один входящий запрос gateway → один исходящий HTTP без ретраев.
 */
export async function invokeNewGcApi(input: {
  schoolHostTrimmed: string
  /** Путь под `/pl/api/v1` с подставленными `{pathParam}` (ведущий `/`). */
  resolvedPath: string
  httpMethod: 'GET' | 'POST'
  developerKey: string
  schoolApiKey: string
  /** Для POST — тело JSON (объект args без path params). Для GET — query из args. */
  args: Record<string, unknown>
}): Promise<NewGcApiResult> {
  const gcRelPath = input.resolvedPath.startsWith('/')
    ? input.resolvedPath
    : `/${input.resolvedPath}`
  const url = `https://${input.schoolHostTrimmed}/pl/api/v1${gcRelPath}`
  const bearer = `${input.developerKey}_${input.schoolApiKey}`

  try {
    const baseOpts = {
      url,
      method: input.httpMethod.toLowerCase() as 'get' | 'post',
      headers: {
        Authorization: `Bearer ${bearer}`
      },
      responseType: 'text' as const,
      throwHttpErrors: false,
      timeout: GW_OUTBOUND_TIMEOUT_MS
    }

    const sp = argsToSearchParams(input.args)
    const res = await request(
      input.httpMethod === 'GET'
        ? Object.keys(sp).length > 0
          ? { ...baseOpts, searchParams: sp }
          : baseOpts
        : {
            ...baseOpts,
            headers: {
              ...baseOpts.headers,
              'Content-Type': 'application/json; charset=utf-8'
            },
            json: input.args
          }
    )
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
