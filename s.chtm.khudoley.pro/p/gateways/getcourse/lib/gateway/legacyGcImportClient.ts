import { request } from '@app/request'
import { GW_OUTBOUND_TIMEOUT_MS } from './constants'
import { buildLegacyImportFormBody } from './legacyGcFormBody'

export type LegacyGcImportResult = {
  gcStatus: number
  gcContentType: string
  gcBodyText: string
}

/**
 * Один исходящий POST на Legacy-импорт GetCourse (manual §4.5, §8.1): form key/action/params, без ретраев.
 */
export async function invokeLegacyGcImportPost(input: {
  schoolHostTrimmed: string
  /** Путь под `/pl/api` с подставленными path params (ведущий `/`). */
  resolvedPath: string
  schoolApiKey: string
  legacyImportAction: string
  /** Объект, сериализуемый в JSON внутри Base64(params). */
  paramsPayload: Record<string, unknown>
}): Promise<LegacyGcImportResult> {
  const path = input.resolvedPath.startsWith('/') ? input.resolvedPath : `/${input.resolvedPath}`
  const url = `https://${input.schoolHostTrimmed}/pl/api${path}`
  const form = buildLegacyImportFormBody(
    input.schoolApiKey,
    input.legacyImportAction,
    input.paramsPayload
  )

  try {
    const res = await request({
      url,
      method: 'post',
      form,
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
