// @shared
/**
 * Типы и константы виджетной конфигурации. Делятся между сервером (геттер
 * `getWidgetSettings`, API-эндпоинты), клиентом (Admin-компоненты в Vue) и
 * сериализуются в публичный ответ `POST /api/widgets/config` для userscripts.
 *
 * Не содержит логики обращения к Heap — только pure-данные и парсеры.
 */

/** Идентификатор виджет-метода в конфигурации и аудит-логах. */
export type WidgetMethod = 'lifepay' | 'lavatop'

/**
 * Тип списка офферов на стороне виджета.
 * - `off` — фильтр офферов не применяется; виджет и платёж доступны для любых
 *   позиций (в т.ч. пустых) и любого списка офферов; это дефолт несохранённого
 *   значения.
 * - `whitelist` — показываем виджет только для офферов из `offers`.
 * - `blacklist` — показываем для всех офферов, кроме перечисленных.
 */
export type WidgetOfferListType = 'off' | 'whitelist' | 'blacklist'

/** Запись разрешённого/запрещённого оффера: id (ключ сравнения) и title (только подпись для админки). */
export type AllowedOffer = { id: string; title: string }

/**
 * Серверный объект настроек виджета — что админ задал в веб-панели.
 * Соответствует ключам в `SETTING_KEYS` (`widget_*`). Поля уже преобразованы
 * из строкового хранения Heap в типизированные значения.
 */
export type WidgetSettingsData = {
  lifepayEnabled: boolean
  lifepayMin: number
  lifepayMax: number
  /** Per-method фильтр офферов LifePay (источник — GC через `getOffers`). */
  lifepayOfferListType: WidgetOfferListType
  /** Уже распарсенный массив офферов (id + title). */
  lifepayOffers: AllowedOffer[]
  lavatopEnabled: boolean
  lavatopMin: number
  lavatopMax: number
  /** Per-method фильтр офферов Lava.Top (источник — Lava.Top `listProducts`). */
  lavatopOfferListType: WidgetOfferListType
  /** Уже распарсенный массив офферов (id + title). */
  lavatopOffers: AllowedOffer[]
}

/** Конфигурация одного метода в публичном ответе `/api/widgets/config`. */
export type WidgetMethodPublicConfig = {
  enabled: boolean
  /** `0` означает «без ограничений снизу». */
  minAmount: number
  /** `0` означает «без ограничений сверху». */
  maxAmount: number
  /** Тип фильтра офферов конкретного метода. */
  offerListType: WidgetOfferListType
  /** Список офферов ({id, title}) для фильтрации показа на клиенте. */
  offers: AllowedOffer[]
}

/**
 * Публичный конфиг виджета, который возвращает `/api/widgets/config`.
 * Userscript использует поля для клиентской
 * фильтрации (по сумме и офферу) и решает, рендерить ли кликабельный блок.
 *
 * Поля `offerListType`/`offerIds` теперь живут внутри `lifepay`/`lavatop`:
 * списки офферов для LifePay (GC-офферы) и Lava.Top (Lava.Top-офферы) —
 * это разные сущности из разных источников.
 */
export type WidgetPublicConfig = {
  lifepay: WidgetMethodPublicConfig
  lavatop: WidgetMethodPublicConfig
}

/**
 * Жёсткий серверный потолок суммы для intent-эндпоинтов. Не зависит от
 * пользовательских настроек `widget_*_max` — служит защитой от злоупотреблений:
 * создать платёжный intent на любую сумму нельзя даже из публичного endpoint.
 *
 * 500 000 ₽ — компромисс: покрывает типичные сценарии магазина, ограничивает
 * blast radius до уровня одного крупного заказа.
 */
export const WIDGET_INTENT_HARD_LIMIT_RUB = 500_000

/**
 * Имена виджет-ключей в Heap-таблице `settings`. Дублируют значения из
 * `SETTING_KEYS` (`lib/settings.lib.ts`), но экспортируются из `shared/`,
 * чтобы Vue-компоненты могли использовать их без импорта из `lib/` (запрещено
 * правилом Vue/SSR). При переименовании ключа поправить ОБА места — это
 * сознательный компромисс ради изолированности слоёв.
 */
export const WIDGET_SETTING_KEYS = {
  LIFEPAY_ENABLED: 'widget_lifepay_enabled',
  LIFEPAY_MIN: 'widget_lifepay_min',
  LIFEPAY_MAX: 'widget_lifepay_max',
  LIFEPAY_OFFER_LIST_TYPE: 'widget_lifepay_offer_list_type',
  /** @deprecated legacy-ключ (string[]); чтение для fallback. Запись — через LIFEPAY_OFFERS. */
  LIFEPAY_OFFER_IDS: 'widget_lifepay_offer_ids',
  /** Новый ключ (AllowedOffer[] JSON). */
  LIFEPAY_OFFERS: 'widget_lifepay_offers',
  LAVATOP_ENABLED: 'widget_lavatop_enabled',
  LAVATOP_MIN: 'widget_lavatop_min',
  LAVATOP_MAX: 'widget_lavatop_max',
  LAVATOP_OFFER_LIST_TYPE: 'widget_lavatop_offer_list_type',
  /** @deprecated legacy-ключ (string[]); чтение для fallback. Запись — через LAVATOP_OFFERS. */
  LAVATOP_OFFER_IDS: 'widget_lavatop_offer_ids',
  /** Новый ключ (AllowedOffer[] JSON). */
  LAVATOP_OFFERS: 'widget_lavatop_offers'
} as const

/**
 * Безопасный парсер списка офферов из Heap. Поддерживает два формата:
 * - legacy: JSON-массив строк (`string[]`) → [{id:s, title:''}]
 * - новый: JSON-массив объектов `{id,title}` → нормализует и дедуплицирует по id.
 * При любой ошибке или не-массиве возвращает пустой массив.
 */
export function parseAllowedOffers(raw: unknown): AllowedOffer[] {
  if (typeof raw !== 'string' || raw.trim().length === 0) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const seen = new Set<string>()
  const result: AllowedOffer[] = []
  for (const item of parsed) {
    if (typeof item === 'string') {
      // legacy: строка → id=trim, title=''
      const id = item.trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      result.push({ id, title: '' })
    } else if (typeof item === 'object' && item !== null) {
      const o = item as Record<string, unknown>
      const id = String(o.id ?? '').trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      const title = typeof o.title === 'string' ? o.title.trim() : ''
      result.push({ id, title })
    }
    // иначе пропускаем
  }
  return result
}

/**
 * Безопасный парсер `widget_offer_list_type`.
 * - `'whitelist'` → `'whitelist'`
 * - `'blacklist'` → `'blacklist'`
 * - любое другое (в т.ч. несохранённое/null/undefined) → `'off'`
 *
 * Дефолт `'off'` означает «фильтр выключен → показывать всем». Прочие защиты
 * (enabled, лимиты, hard-limit) от значения этого поля не зависят.
 */
export function parseOfferListType(raw: unknown): WidgetOfferListType {
  if (raw === 'whitelist') return 'whitelist'
  if (raw === 'blacklist') return 'blacklist'
  return 'off'
}

/**
 * СИНХРОНИЗИРОВАНО с userscripts/common.js → areAllPositionsAllowed.
 * При изменении правил allow править ОБА места.
 *
 * Проверяет, разрешён ли один оффер по white/blacklist — ТОЛЬКО по id.
 * - `off`: фильтр не применяется → всегда `true`.
 * - `whitelist`: offer.id точно совпадает с одним из allowed[].id.
 * - `blacklist`: offer.id не совпадает ни с одним из allowed[].id.
 *
 * Сверка по title намеренно убрана: offer_id присутствует и в позициях заказа
 * (GC offer_id / DOM data-offer-id), и в настройках админки (источник — GC
 * getOffers), поэтому id однозначен и достаточен. Нечёткое сравнение title было
 * ненадёжным из-за различий в пробелах/кодировке/символах и риска ложного
 * совпадения; title в настройках остаётся лишь подписью для админки.
 *
 * Используется на сервере в intent-обработчиках для проверки позиций заказа.
 * Userscript имеет собственную копию в common.js.
 */
export function isOfferAllowed(
  offer: { id: string },
  allowed: AllowedOffer[],
  listType: WidgetOfferListType
): boolean {
  if (listType === 'off') return true
  const inList = offer.id !== '' && allowed.some((a) => a.id === offer.id)
  return listType === 'blacklist' ? !inList : inList
}

/**
 * Проверяет, разрешены ли ВСЕ позиции заказа.
 * - `off`: фильтр не применяется → true независимо от positions и allowed
 *   (фильтр выключен — пустой positions это ожидаемо допускает).
 * - Пустой массив positions при whitelist/blacklist → false (нет позиций — не допускаем).
 * - Иначе — positions.every(isOfferAllowed).
 */
export function areAllOffersAllowed(
  offers: { id: string }[],
  allowed: AllowedOffer[],
  listType: WidgetOfferListType
): boolean {
  if (listType === 'off') return true
  if (!Array.isArray(offers) || offers.length === 0) return false
  return offers.every((o) => isOfferAllowed(o, allowed, listType))
}

/** Доступность одного метода оплаты (результат серверного расчёта в /api/widgets/config). */
export type WidgetMethodAvailability = { enabled: boolean }

/**
 * Ответ `/api/widgets/config` (POST): доступность каждого метода оплаты
 * с учётом офферов, диапазона суммы и флага enabled из настроек.
 */
export type WidgetAvailabilityConfig = {
  lifepay: WidgetMethodAvailability
  lavatop: WidgetMethodAvailability
}
