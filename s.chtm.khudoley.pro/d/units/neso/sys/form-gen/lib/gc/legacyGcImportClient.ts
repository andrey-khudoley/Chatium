/**
 * ВОЛНА 1 — временный дубль обвязки Legacy-импорта GetCourse (§5.2, §0.1
 * спеки form-gen). Удаляется в MVP при переходе на getcourse-гейтвей —
 * своего GC-клиента у form-gen после этого не остаётся.
 *
 * По образцу `p/gateways/getcourse/lib/gateway/legacyGcImportClient.ts`, но
 * без обвязки гейтвея (§4.5 manual): один POST на `/pl/api${path}`, без ретраев.
 */

import { request } from '@app/request'
import { GC_OUTBOUND_TIMEOUT_MS } from '../../config/constants'
import type { LegacyImportFormFields } from './legacyGcFormBody'

export type LegacyGcImportResult = {
  gcStatus: number
  gcContentType: string
  gcBodyText: string
}

export async function invokeLegacyGcImportPost(input: {
  /** Хост школы GC без протокола/слешей (lib/settings/gcSettings.ts → normalizeSchoolHost). */
  host: string
  /** Путь под `/pl/api` (ведущий `/`), напр. GC_LEGACY_DEALS_PATH. */
  path: string
  form: LegacyImportFormFields
}): Promise<LegacyGcImportResult> {
  const path = input.path.startsWith('/') ? input.path : `/${input.path}`
  const url = `https://${input.host}/pl/api${path}`

  try {
    const res = await request({
      url,
      method: 'post',
      form: input.form,
      responseType: 'text',
      throwHttpErrors: false,
      timeout: GC_OUTBOUND_TIMEOUT_MS
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
