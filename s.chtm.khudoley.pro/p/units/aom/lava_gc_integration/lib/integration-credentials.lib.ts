/**
 * Живые проверки учётных данных по значениям из Heap
 * (те же вызовы, что и в `api/settings/save` при сохранении ключей, без слияния с телом POST).
 */
import * as gcApi from './getcourse-api.client'
import * as lavaApi from './lava-api.client'
import * as settingsLib from './settings.lib'

export type GcCredentialCheckFromSettings =
  | { kind: 'skipped'; detail: string }
  | { kind: 'ran'; ok: boolean; message: string }

export type LavaCredentialCheckFromSettings =
  | { kind: 'skipped'; detail: string }
  | { kind: 'ran'; ok: boolean; message: string; httpStatus?: number }

export async function runGcCredentialCheckFromSettings(
  ctx: app.Ctx
): Promise<GcCredentialCheckFromSettings> {
  const gcKey = (await settingsLib.getGcApiKey(ctx)).trim()
  const gcDomain = (await settingsLib.getGcAccountDomain(ctx)).trim()

  if (!gcKey || !gcDomain) {
    return {
      kind: 'skipped',
      detail:
        'Пропуск: задайте в настройках gc_api_key и gc_account_domain (как в админке — по отдельности).'
    }
  }
  const v = await gcApi.verifyGcPlApiAccess(ctx, { apiKey: gcKey, domain: gcDomain })
  return { kind: 'ran', ok: v.ok, message: v.message }
}

export async function runLavaCredentialCheckFromSettings(
  ctx: app.Ctx
): Promise<LavaCredentialCheckFromSettings> {
  const lavaKey = (await settingsLib.getLavaApiKey(ctx)).trim()
  const lavaBase = (await settingsLib.getLavaBaseUrl(ctx)).trim()

  if (!lavaKey || !lavaBase) {
    return {
      kind: 'skipped',
      detail:
        'Пропуск: задайте в настройках lava_api_key и lava_base_url (как в админке — по отдельности).'
    }
  }
  const v = await lavaApi.verifyLavaCredentials(ctx, { apiKey: lavaKey, baseUrl: lavaBase })
  if (v.ok) {
    return { kind: 'ran', ok: true, message: v.message, httpStatus: v.httpStatus }
  }
  return { kind: 'ran', ok: false, message: v.message, httpStatus: v.httpStatus }
}

/** Обе проверки подряд (например, для сценариев без раздельных HTTP-роутов). */
export async function runIntegrationCredentialChecksFromSettings(ctx: app.Ctx): Promise<{
  gc: GcCredentialCheckFromSettings
  lava: LavaCredentialCheckFromSettings
}> {
  const gc = await runGcCredentialCheckFromSettings(ctx)
  const lava = await runLavaCredentialCheckFromSettings(ctx)
  return { gc, lava }
}
