/**
 * Чистая логика слияния полей интеграции при POST /api/settings/save
 * (два поля вводятся по отдельности; перед verify подставляется второе из Heap).
 */
import { normalizeLavaBaseUrlInput } from '../shared/lavaBaseUrl'
import { GC_SETTING_KEYS } from '../shared/gcSettingKeys'
import { LAVA_SETTING_KEYS } from '../shared/lavaSettingKeys'

export type GcCredentialsResolved = { nextApiKey: string; nextDomain: string }

export type LavaCredentialsResolved = { nextApiKey: string; nextBaseNormalized: string }

/** Нужно ли вызывать verifyGcPlApiAccess / verifyLavaCredentials (оба поля пары непустые). */
export function shouldVerifyCredentialPair(a: string, b: string): boolean {
  return !!a.trim() && !!b.trim()
}

/**
 * Как в `api/settings/save`: при сохранении gc_api_key или gc_account_domain подставляется второе значение из Heap.
 */
export function resolveGcCredentialsForSave(
  key: string,
  value: unknown,
  heapGcApiKey: string,
  heapGcAccountDomain: string
): GcCredentialsResolved | null {
  if (key !== GC_SETTING_KEYS.GC_API_KEY && key !== GC_SETTING_KEYS.GC_ACCOUNT_DOMAIN) {
    return null
  }
  const nextApiKey =
    key === GC_SETTING_KEYS.GC_API_KEY ? String(value ?? '').trim() : heapGcApiKey.trim()
  const nextDomain =
    key === GC_SETTING_KEYS.GC_ACCOUNT_DOMAIN
      ? String(value ?? '').trim()
      : heapGcAccountDomain.trim()
  return { nextApiKey, nextDomain }
}

/**
 * Как в `api/settings/save` для Lava: нормализация base URL через shared/lavaBaseUrl.
 */
export function resolveLavaCredentialsForSave(
  key: string,
  value: unknown,
  heapLavaApiKey: string,
  heapLavaBaseUrlRaw: string
): LavaCredentialsResolved | null {
  if (key !== LAVA_SETTING_KEYS.LAVA_API_KEY && key !== LAVA_SETTING_KEYS.LAVA_BASE_URL) {
    return null
  }
  const nextApiKey =
    key === LAVA_SETTING_KEYS.LAVA_API_KEY ? String(value ?? '').trim() : heapLavaApiKey.trim()
  const nextBaseRaw =
    key === LAVA_SETTING_KEYS.LAVA_BASE_URL ? String(value ?? '') : heapLavaBaseUrlRaw
  const nextBaseNormalized = normalizeLavaBaseUrlInput(
    typeof nextBaseRaw === 'string' ? nextBaseRaw : String(nextBaseRaw ?? '')
  )
  return { nextApiKey, nextBaseNormalized }
}
