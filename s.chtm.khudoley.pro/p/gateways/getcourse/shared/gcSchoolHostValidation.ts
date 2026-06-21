// @shared

/**
 * Валидация хоста школы GetCourse для `gc_test_school_host` и заголовка `X-Gc-School-Host` (manual §2.5).
 * После `trim` непустая строка; без `http://`/`https://`; без пробелов и символов `/ \ ? #`;
 * опциональный `:порт` в диапазоне 1–65535; общая длина ≤ 253.
 *
 * В `// @shared` нельзя тянуть `lib/logger.lib` — ошибки для сервера логируются в границе lib (`throwLoggedServerError` + `validateGcSchoolHostTrimmed`).
 */

/** Запрещённые символы в общей строке хоста (включая порт). `:` допускается только как разделитель порта (см. ниже). */
const FORBIDDEN_IN_HOST = /[\s/\\?#]/

/** Именованная ошибка валидации хоста (не `Error` без типа) — для `instanceof` в тестах и при необходимости на сервере. */
export class GcSchoolHostValidationError extends Error {
  override name = 'GcSchoolHostValidationError'
  constructor(message: string) {
    super(message)
  }
}

/**
 * Проверка хоста после `trim`. Возвращает текст ошибки или `null`, если значение допустимо.
 * Параметр может быть с пробелами по краям — внутри выполняется `trim`.
 */
export function validateGcSchoolHostTrimmed(host: string): string | null {
  const h = host.trim()
  if (!h) {
    return 'Хост школы не может быть пустым или из одних пробелов.'
  }
  if (h.length > 253) {
    return 'Хост школы: не более 253 символов.'
  }
  const lower = h.toLowerCase()
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return 'Укажите хост без схемы (без http:// и https://).'
  }
  if (FORBIDDEN_IN_HOST.test(h)) {
    return 'В хосте недопустимы пробелы и символы / \\ ? #.'
  }

  const colonIdx = h.indexOf(':')
  if (colonIdx >= 0) {
    if (h.indexOf(':', colonIdx + 1) !== -1) {
      return 'В хосте допустим только один разделитель ":" перед номером порта.'
    }
    const hostPart = h.slice(0, colonIdx)
    const portPart = h.slice(colonIdx + 1)
    if (!hostPart) {
      return 'Имя хоста перед ":" не может быть пустым.'
    }
    if (!/^\d+$/.test(portPart)) {
      return 'Порт после ":" должен быть числом.'
    }
    const port = Number(portPart)
    if (!(port >= 1 && port <= 65535)) {
      return 'Порт после ":" должен быть в диапазоне 1–65535.'
    }
  }

  return null
}

/**
 * Проверяет уже обрезанную строку хоста. Бросает {@link GcSchoolHostValidationError} с текстом для UI / совместимости.
 * @deprecated Предпочтительно {@link validateGcSchoolHostTrimmed} на сервере + `throwLoggedServerError`.
 */
export function assertValidGcSchoolHostTrimmed(host: string): void {
  const err = validateGcSchoolHostTrimmed(host)
  if (err) {
    throw new GcSchoolHostValidationError(err)
  }
}

/**
 * Нормализует значение из Heap/API: trim и проверки §2.5. Возвращает строку для записи.
 */
export function normalizeGcTestSchoolHost(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim()
  const err = validateGcSchoolHostTrimmed(s)
  if (err) {
    throw new GcSchoolHostValidationError(err)
  }
  return s
}

/** Для формы админки: `null` если значение допустимо, иначе текст ошибки. */
export function getGcSchoolHostFieldError(raw: string): string | null {
  return validateGcSchoolHostTrimmed(raw)
}
