/**
 * Константы модуля form-gen, волна 1 (прототип). Значения, которые по спеке
 * НЕ являются настройкой (§5.1.1: состав полей посетителя, дефолтный вид) —
 * живут здесь, а не в Heap.
 */

/** Префикс формID (§5.1 п.3) — гарантирует первым символом букву (валидный DOM-id/CSS-селектор). */
export const SLUG_PREFIX = 'fg'

/**
 * Состав полей посетителя — константа модуля (§5.1.1): «пока вызов GC не
 * проверен прототипом, параметризация полей — гадание». Порядок — порядок
 * рендера в форме.
 */
export const VISITOR_FIELDS = ['name', 'email', 'phone'] as const

/** Дефолтный вид формы при пустом/незаполненном appearance (§3.1 — контракт поля открыт до волны 2). */
export const DEFAULT_APPEARANCE = {
  title: 'Оформление заказа',
  submitLabel: 'Оформить заказ',
  note: 'Нажимая кнопку, вы соглашаетесь с условиями оферты'
} as const

/** Ключи key-value таблицы настроек (§3.2) — три поля GC волны 1. */
export const GC_SETTINGS_KEYS = {
  schoolUrl: 'gc_school_url',
  schoolKey: 'gc_school_key',
  developerKey: 'gc_developer_key'
} as const

/** Путь и action GC Legacy-импорта заказов (§5.2, дубль прототипа). */
export const GC_LEGACY_DEALS_PATH = '/deals'
export const GC_LEGACY_ACTION = 'add'

/** Таймаут исходящего запроса к GetCourse (по образцу гейтвея, GW_OUTBOUND_TIMEOUT_MS). */
export const GC_OUTBOUND_TIMEOUT_MS = 10_000
