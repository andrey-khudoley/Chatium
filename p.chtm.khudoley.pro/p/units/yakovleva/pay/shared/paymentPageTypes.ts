// @shared
/**
 * Типы, константы и парсеры для конфигурации страницы оплаты (payment-page).
 * Разделяются между сервером (геттеры, API), клиентом (Vue-компонент) и
 * сериализуются в публичный ответ `POST /api/payment-page/config`.
 *
 * Не содержит логики обращения к Heap — только pure-данные и парсеры.
 */

import {
  parseAllowedOffers,
  parseOfferListType,
  type WidgetOfferListType,
  type AllowedOffer
} from './widgetSettingsTypes'

export { parseAllowedOffers, parseOfferListType }
export type { WidgetOfferListType, AllowedOffer }

/** Пункт меню кастомного метода оплаты (radio-список). */
export type PaymentPageMenuItem = { label: string; value: string }

/**
 * Режим взаимодействия кастомного метода оплаты:
 *   standard — покупатель выделяет метод рамкой и платит штатной кнопкой «Оплатить заказ» справа.
 *   widget   — у метода своё меню (radio) и своя кнопка; карточка не подсвечивается рамкой.
 */
export type PaymentPageInteractionMode = 'standard' | 'widget'

/** Секция метода оплаты на странице (группировка методов). */
export type PaymentPageSection =
  | 'recommended'
  | 'pay'
  | 'cards_rf'
  | 'cards_world'
  | 'installments'
  | 'payparts'
  | 'noncash'

/** Резолвер DOM-элемента метода: по id или по CSS-классу. */
export type PaymentPageResolver = { type: 'id' | 'class'; value: string }

/**
 * Запись метода оплаты (серверная, полная — с resolver, isSystem, offers).
 * Источник данных — таблица PaymentPageMethods (Heap).
 */
export type PaymentPageMethodRecord = {
  methodKey: string
  name: string
  resolver: PaymentPageResolver
  enabled: boolean
  /** Скрывать метод, когда страница открыта для частичной оплаты (?paymentValue=...). */
  hideOnPartialPayment: boolean
  /** Скрывать метод, когда GC-заказ уже частично оплачен ранее и открыта доплата. */
  hideOnTopUpPayment: boolean
  minAmount: number
  maxAmount: number
  imageUrl: string
  section: PaymentPageSection
  order: number
  offerListType: WidgetOfferListType
  offers: AllowedOffer[]
  /** Текст кнопки метода: подменяет надпись на кнопке/value в DOM. */
  label: string
  /**
   * Подпись метода: описательная строка под методом на странице оплаты.
   * Отдельна от label — задаётся вместо скрытых системных текстов GetCourse.
   * Пустая строка — подпись не отображается.
   */
  caption: string
  isSystem: boolean
  /** JS-код обработчика кастомного метода. Выполняется через new Function при нажатии кнопки. */
  customScript: string
  /** Пункты radio-меню кастомного метода. Значение выбранного пункта передаётся в customScript. */
  menuItems: PaymentPageMenuItem[]
  /**
   * Режим взаимодействия кастомного метода.
   * standard — выбор методом + штатная кнопка GC справа (без меню, без своей кнопки).
   * widget   — меню (radio) + своя кнопка внутри метода; карточка не выделяется рамкой.
   */
  interactionMode: PaymentPageInteractionMode
}

/**
 * Публичный вариант метода: offers → offerIds (только id, без title).
 * Включает resolver, isSystem, methodKey.
 */
export type PaymentPageMethodPublic = Omit<PaymentPageMethodRecord, 'offers'> & {
  offerIds: string[]
}

/** Общие настройки страницы оплаты. */
export type PaymentPageGeneralConfig = {
  enabled: boolean
  accentColor: string
  calloutHtml: string
  /** URL логотипа, который показывается над заголовком заказа. */
  logoUrl: string
  /** Ширина логотипа в px. */
  logoWidth: number
  /**
   * methodKey метода, выделенного по умолчанию при загрузке страницы оплаты.
   * Пустая строка — ни один метод не выделен по умолчанию (кнопка оплаты заблокирована
   * до явного выбора). Применяется клиентским скриптом pp-script-05.js.
   */
  defaultMethod: string
}

/** Публичный вариант общих настроек: добавляются URL статических ресурсов. */
export type PaymentPageGeneralPublic = PaymentPageGeneralConfig & {
  loaderUrl: string
  stylesUrl: string
  scriptUrls: string[]
}

/** Публичный контекст GC-заказа для страницы оплаты. */
export type PaymentPageDealContext = {
  /** true, если getDealFields показал уже внесённую оплату по заказу. */
  hasTopUpPayment: boolean
}

/** Публичный ответ `POST /api/payment-page/config`. */
export type PaymentPagePublicResponse =
  | {
      success: true
      general: PaymentPageGeneralPublic
      methods: Record<string, PaymentPageMethodPublic>
      deal: PaymentPageDealContext
    }
  | { success: false; error: string }

/** Все допустимые секции методов оплаты. */
export const PAYMENT_PAGE_SECTIONS: readonly PaymentPageSection[] = [
  'recommended',
  'pay',
  'cards_rf',
  'cards_world',
  'installments',
  'payparts',
  'noncash'
]

/** Список всех поддерживаемых id методов оплаты. */
export const PAYMENT_PAGE_METHOD_IDS = [
  'fresh-credit',
  'tinkoffcredit',
  'tinkoffcredit-2',
  'vsegdada',
  'poscredit',
  'resource-razvitie',
  'sber-pokupay',
  'yandex-split-improved',
  'yandex-split',
  'alpha-bank-podeli',
  'tinkoff-dolyame',
  'yandex-pay',
  'sber-pay',
  'alpha-pay',
  'sber-sbp',
  'wb-pay',
  'tinkoff-pay',
  // Карточные методы GC (gc-payment-method-card): эквайринг РФ (made-RF) и зарубежные (made-world).
  // Раньше распределялись только CSS-классами made-RF/made-world (order -7/-5) и были не управляемы
  // из админки — попадали выше «Рекомендуемых» без метки «Оплата картами из РФ». Теперь конфиг-driven.
  // У 'sberbank-auto-acquiring-block' нет id — резолвится по одноимённому классу (см. pp-script-11.js).
  'vtb-payment-form',
  'tinkoff',
  'alpha-bank-payment-form',
  'sberbank-auto-acquiring-block',
  'stripe_card_gc',
  'payAnyWay',
  'jetpay',
  'stripe_card',
  'PAYPAL',
  'sbp-pay',
  'invoice',
  'kvit'
] as const

/** Секции методов по умолчанию. */
export const PAYMENT_PAGE_DEFAULT_SECTIONS: Record<string, PaymentPageSection> = {
  'fresh-credit': 'installments',
  tinkoffcredit: 'installments',
  'tinkoffcredit-2': 'installments',
  vsegdada: 'installments',
  poscredit: 'installments',
  'resource-razvitie': 'installments',
  'sber-pokupay': 'installments',
  'yandex-split-improved': 'payparts',
  'yandex-split': 'payparts',
  'alpha-bank-podeli': 'payparts',
  'tinkoff-dolyame': 'payparts',
  'yandex-pay': 'pay',
  'sber-pay': 'pay',
  'alpha-pay': 'pay',
  'sber-sbp': 'pay',
  'wb-pay': 'pay',
  'tinkoff-pay': 'pay',
  'vtb-payment-form': 'cards_rf',
  tinkoff: 'cards_rf',
  'alpha-bank-payment-form': 'cards_rf',
  'sberbank-auto-acquiring-block': 'cards_rf',
  stripe_card_gc: 'cards_world',
  payAnyWay: 'cards_world',
  jetpay: 'cards_world',
  stripe_card: 'cards_world',
  PAYPAL: 'pay',
  'sbp-pay': 'recommended',
  invoice: 'noncash',
  kvit: 'noncash'
}

/** Методы, которые до появления настройки скрывались hardcoded-скриптом на частичной оплате. */
export const PAYMENT_PAGE_HIDE_ON_PARTIAL_DEFAULT_IDS = [
  'vsegdada',
  'alpha-bank-podeli',
  'tinkoff-dolyame',
  'yandex-split',
  'yandex-split-improved'
] as const

export function getDefaultHideOnPartialPayment(methodKey: string): boolean {
  return (PAYMENT_PAGE_HIDE_ON_PARTIAL_DEFAULT_IDS as readonly string[]).includes(methodKey)
}

/** Акцентный цвет по умолчанию. */
export const PAYMENT_PAGE_DEFAULT_ACCENT = '#f85c50'
export const PAYMENT_PAGE_DEFAULT_LOGO_WIDTH = 50
export const PAYMENT_PAGE_MIN_LOGO_WIDTH = 24
export const PAYMENT_PAGE_MAX_LOGO_WIDTH = 320

/**
 * Зеркало SETTING_KEYS для Vue-компонентов (Vue не может импортировать из lib/).
 * Значения должны совпадать с SETTING_KEYS в lib/settings.lib.ts.
 */
export const PAYMENT_PAGE_SETTING_KEYS = {
  GENERAL: 'payment_page_general',
  /**
   * Ключ-дискриминатор операции bulk-update методов. Данные методов хранятся в таблице
   * PaymentPageMethods (Heap), НЕ в settings: settings-save при этом ключе делает
   * bulk-update строк таблицы, а не запись в settings-хранилище.
   */
  METHODS: 'payment_page_methods'
} as const

/** Имя файла-лоадера (userscripts/, без подкаталога). */
export const PAYMENT_PAGE_LOADER_FILE = 'pp-loader.js'

/** Имя CSS-файла стилей (userscripts/). */
export const PAYMENT_PAGE_STYLE_FILE = 'pp-style.css'

/** Имена JS-скриптов страницы оплаты (userscripts/). */
export const PAYMENT_PAGE_SCRIPT_FILES = [
  'pp-script-01.js',
  'pp-script-02.js',
  'pp-script-03.js',
  'pp-script-04.js',
  'pp-script-05.js',
  'pp-script-06.js',
  'pp-script-07.js',
  'pp-script-08.js',
  'pp-script-09.js',
  'pp-script-10.js',
  'pp-script-11.js',
  'pp-script-12.js',
  'pp-script-13.js'
] as const

/**
 * Нормализует режим взаимодействия кастомного метода.
 * Обратная совместимость: строки без поля → выводим из наличия menuItems
 * (с меню → widget, без меню → standard).
 */
export function parseInteractionMode(
  raw: unknown,
  menuItems: PaymentPageMenuItem[]
): PaymentPageInteractionMode {
  if (raw === 'widget' || raw === 'standard') return raw
  // Старые строки без поля: режим выводится из наличия меню
  return menuItems.length > 0 ? 'widget' : 'standard'
}

/**
 * Нормализует массив пунктов меню кастомного метода.
 * Не массив → []; отфильтровываем пустые пункты (оба поля пусты после trim).
 * Ограничение: максимум 20 пунктов.
 */
export function parseMenuItems(raw: unknown): PaymentPageMenuItem[] {
  if (!Array.isArray(raw)) return []
  const result: PaymentPageMenuItem[] = []
  for (const item of raw) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) continue
    const o = item as Record<string, unknown>
    const label = typeof o.label === 'string' ? o.label : ''
    const value = typeof o.value === 'string' ? o.value : ''
    // Пропускаем пункты, где оба поля пустые после trim
    if (!label.trim() && !value.trim()) continue
    result.push({ label, value })
    if (result.length >= 20) break
  }
  return result
}

/**
 * Проверяет, является ли значение допустимым id кастомного метода.
 * Regex: начинается с буквы (ведущая цифра/дефис недопустимы — id используется
 * как getElementById и в CSS-селекторе), затем буквы/цифры/дефис/подчёркивание, до 64 символов.
 */
export function isValidMethodId(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(v)
}

/** Валидирует hex-цвет (#rrggbb). */
export function isValidHexColor(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v)
}

/**
 * Проверяет, является ли значение допустимой секцией.
 */
export function isPaymentPageSection(v: unknown): v is PaymentPageSection {
  return typeof v === 'string' && (PAYMENT_PAGE_SECTIONS as readonly string[]).includes(v)
}

/**
 * Нормализует резолвер из произвольного значения.
 * type ∈ {id, class} иначе 'id'; value — строка-CSS-токен иначе ''.
 */
export function parseResolver(raw: unknown): PaymentPageResolver {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { type: 'id', value: '' }
  }
  const o = raw as Record<string, unknown>
  const type: 'id' | 'class' =
    o.type === 'id' || o.type === 'class' ? (o.type as 'id' | 'class') : 'id'
  const value = typeof o.value === 'string' ? o.value : ''
  return { type, value }
}

/**
 * Нормализует одну запись метода оплаты.
 * Принимает произвольное значение, возвращает PaymentPageMethodRecord с дефолтами.
 */
export function parsePaymentPageMethodRecord(raw: unknown): PaymentPageMethodRecord {
  const o =
    raw !== null && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}

  const methodKey = typeof o.methodKey === 'string' ? o.methodKey : ''
  const name = typeof o.name === 'string' ? o.name : methodKey

  const resolver = parseResolver(o.resolver)

  const enabled = typeof o.enabled === 'boolean' ? o.enabled : true
  const hideOnPartialPayment =
    typeof o.hideOnPartialPayment === 'boolean'
      ? o.hideOnPartialPayment
      : getDefaultHideOnPartialPayment(methodKey)
  const hideOnTopUpPayment =
    typeof o.hideOnTopUpPayment === 'boolean' ? o.hideOnTopUpPayment : false
  const isSystem = typeof o.isSystem === 'boolean' ? o.isSystem : false

  const minAmount =
    typeof o.minAmount === 'number' && Number.isFinite(o.minAmount) && o.minAmount >= 0
      ? Math.floor(o.minAmount)
      : 0
  const maxAmount =
    typeof o.maxAmount === 'number' && Number.isFinite(o.maxAmount) && o.maxAmount >= 0
      ? Math.floor(o.maxAmount)
      : 0

  const imageUrl = typeof o.imageUrl === 'string' ? o.imageUrl : ''
  const label = typeof o.label === 'string' ? o.label : ''
  const caption = typeof o.caption === 'string' ? o.caption : ''

  const section: PaymentPageSection = isPaymentPageSection(o.section)
    ? (o.section as PaymentPageSection)
    : (PAYMENT_PAGE_DEFAULT_SECTIONS[methodKey] ?? 'pay')

  const order = typeof o.order === 'number' && Number.isFinite(o.order) ? Math.floor(o.order) : 0

  const offerListType = parseOfferListType(o.offerListType)

  let offers: AllowedOffer[] = []
  if (typeof o.offers === 'string') {
    offers = parseAllowedOffers(o.offers)
  } else if (Array.isArray(o.offers)) {
    offers = parseAllowedOffers(JSON.stringify(o.offers))
  }

  // Ограничиваем длину customScript — защита от разрастания Heap-строки и публичного ответа.
  const customScript = typeof o.customScript === 'string' ? o.customScript.slice(0, 20000) : ''
  const menuItems = parseMenuItems(o.menuItems)
  const interactionMode = parseInteractionMode(o.interactionMode, menuItems)

  return {
    methodKey,
    name,
    resolver,
    enabled,
    hideOnPartialPayment,
    hideOnTopUpPayment,
    isSystem,
    minAmount,
    maxAmount,
    imageUrl,
    label,
    caption,
    section,
    order,
    offerListType,
    offers,
    customScript,
    menuItems,
    interactionMode
  }
}

/**
 * Безопасный парсер общих настроек страницы оплаты.
 * При любой ошибке или отсутствующем поле возвращает дефолтное значение.
 */
export function parsePaymentPageGeneral(raw: unknown): PaymentPageGeneralConfig {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      enabled: false,
      accentColor: PAYMENT_PAGE_DEFAULT_ACCENT,
      calloutHtml: '',
      logoUrl: '',
      logoWidth: PAYMENT_PAGE_DEFAULT_LOGO_WIDTH,
      defaultMethod: ''
    }
  }
  const o = raw as Record<string, unknown>

  const enabled = o.enabled === true

  const accentColor =
    typeof o.accentColor === 'string' && isValidHexColor(o.accentColor)
      ? o.accentColor
      : PAYMENT_PAGE_DEFAULT_ACCENT

  const calloutHtml = typeof o.calloutHtml === 'string' ? o.calloutHtml : ''
  const logoUrl = typeof o.logoUrl === 'string' ? o.logoUrl.trim() : ''
  const logoWidthRaw = typeof o.logoWidth === 'number' ? o.logoWidth : Number(o.logoWidth)
  const logoWidth = Number.isFinite(logoWidthRaw)
    ? Math.min(
        PAYMENT_PAGE_MAX_LOGO_WIDTH,
        Math.max(PAYMENT_PAGE_MIN_LOGO_WIDTH, Math.floor(logoWidthRaw))
      )
    : PAYMENT_PAGE_DEFAULT_LOGO_WIDTH

  // methodKey по умолчанию: пустая строка = ни один метод не выделен.
  const defaultMethod = typeof o.defaultMethod === 'string' ? o.defaultMethod.trim() : ''

  return { enabled, accentColor, calloutHtml, logoUrl, logoWidth, defaultMethod }
}
