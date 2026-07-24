/**
 * ВОЛНА 1 — временный дубль обвязки Legacy-импорта GetCourse (§5.2, §0.1
 * спеки form-gen). Удаляется в MVP при переходе на getcourse-гейтвей.
 *
 * Сборка полей form-urlencoded для Legacy POST импорта GetCourse (manual §4.5,
 * inner/docs/047-base64.md). Копия `p/gateways/getcourse/lib/gateway/legacyGcFormBody.ts`.
 */

import { utf8StringToBase64 } from './utf8Base64'

export type LegacyImportFormFields = {
  key: string
  action: string
  params: string
}

/**
 * @param schoolApiKey — ключ школы (§3.2, поле key на проводе).
 * @param legacyAction — значение action (для form-gen — всегда 'add', GC_LEGACY_ACTION).
 * @param paramsObject — объект, который уйдёт внутрь Base64(JSON.stringify(…)) в поле params.
 */
export function buildLegacyImportFormBody(
  schoolApiKey: string,
  legacyAction: string,
  paramsObject: Record<string, unknown>
): LegacyImportFormFields {
  return {
    key: schoolApiKey,
    action: legacyAction,
    params: utf8StringToBase64(JSON.stringify(paramsObject))
  }
}
