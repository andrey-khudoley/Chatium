/**
 * Сборка полей form-urlencoded для Legacy POST импорта GetCourse (manual §4.5, inner/docs/047-base64.md).
 */

import { utf8StringToBase64 } from './utf8Base64'

export type LegacyImportFormFields = {
  key: string
  action: string
  params: string
}

/**
 * @param schoolApiKey — значение заголовка X-Gc-School-Api-Key (на проводе в поле key).
 * @param legacyAction — значение action (например add для /users).
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
