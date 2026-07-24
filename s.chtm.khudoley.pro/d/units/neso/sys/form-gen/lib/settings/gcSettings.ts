import { FormGenSettings } from '../../tables/settings.table'
import { GC_SETTINGS_KEYS } from '../../config/constants'

export type GcSettings = {
  schoolUrl: string
  schoolKey: string
  developerKey: string
}

/**
 * Хост школы GC без протокола и конечных слешей — для сборки
 * `https://${host}/pl/api${path}` (legacyGcImportClient.ts). Принимает как полный
 * URL (`https://school.getcourse.ru/`), так и голый хост.
 */
function normalizeSchoolHost(rawUrl: string): string {
  return rawUrl
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
}

/**
 * Настройки GC волны 1 (§3.2 спеки) — 3 записи key-value. Отсутствующие ключи
 * (ещё не сохранённая настройка) → пустая строка, а не исключение — вызывающая
 * сторона (submit.ts) сама решает, что делать с пустыми значениями (SETTINGS_MISSING).
 */
export async function getGcSettings(ctx: RichUgcCtx): Promise<GcSettings> {
  const [schoolUrlRow, schoolKeyRow, developerKeyRow] = await Promise.all([
    FormGenSettings.findOneBy(ctx, { key: GC_SETTINGS_KEYS.schoolUrl }),
    FormGenSettings.findOneBy(ctx, { key: GC_SETTINGS_KEYS.schoolKey }),
    FormGenSettings.findOneBy(ctx, { key: GC_SETTINGS_KEYS.developerKey })
  ])

  return {
    schoolUrl: typeof schoolUrlRow?.value === 'string' ? schoolUrlRow.value : '',
    schoolKey: typeof schoolKeyRow?.value === 'string' ? schoolKeyRow.value : '',
    developerKey: typeof developerKeyRow?.value === 'string' ? developerKeyRow.value : ''
  }
}

/**
 * Сохранение настроек GC (админка, §5.3). developerKey — только сохраняется:
 * волна 1 GC-клиент прототипа (lib/gc/*) ходит по schoolUrl+schoolKey (Legacy-импорт),
 * developerKey кодом не читается — задел на REST API v2 / гейтвей волны 2.
 */
export async function saveGcSettings(
  ctx: RichUgcCtx,
  values: { schoolUrl: string; schoolKey: string; developerKey: string }
): Promise<void> {
  await Promise.all([
    FormGenSettings.createOrUpdateBy(ctx, 'key', {
      key: GC_SETTINGS_KEYS.schoolUrl,
      value: values.schoolUrl
    }),
    FormGenSettings.createOrUpdateBy(ctx, 'key', {
      key: GC_SETTINGS_KEYS.schoolKey,
      value: values.schoolKey
    }),
    FormGenSettings.createOrUpdateBy(ctx, 'key', {
      key: GC_SETTINGS_KEYS.developerKey,
      value: values.developerKey
    })
  ])
}

export { normalizeSchoolHost }
