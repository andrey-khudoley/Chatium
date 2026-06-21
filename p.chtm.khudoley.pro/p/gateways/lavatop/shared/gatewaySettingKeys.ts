// @shared
/**
 * Имена ключей Heap-настроек Lava.Top-gateway, используемые формами в админке/панели и общими
 * хелперами. Здесь только строки имён ключей в Heap и нормализация base URL — никаких значений
 * секретов.
 */

/** API-ключ Lava.Top для тестовой формы «Создать запрос» (вкладка панели). */
export const LAVA_TEST_APIKEY = 'lava_test_apikey' as const
/** Базовый URL API Lava.Top (по умолчанию https://gate.lava.top). */
export const LAVA_BASE_URL_KEY = 'lava_base_url' as const
/** Секрет приёма входящих вебхуков Lava.Top (Basic/X-Api-Key). */
export const LAVA_WEBHOOK_SECRET_KEY = 'lava_webhook_secret' as const
/** Фильтр по дате панели оператора (Unix ms). */
export const PANEL_DATE_FILTER_KEY = 'panel_date_filter' as const

/** Базовый URL Lava.Top по умолчанию. */
export const LAVA_DEFAULT_BASE_URL = 'https://gate.lava.top'

/**
 * Тестовое значение для формы «Создать запрос» (вкладка панели). Читается из Heap на SSR
 * (`index.tsx`) и передаётся в компонент через пропсы, чтобы кнопка «Подставить» работала
 * без клиентского fetch к Admin-only роуту настроек. Пустая строка = настройка не задана.
 *
 * В отличие от LifePay, у Lava.Top нет логина — только API-ключ.
 */
export type LavaTestValues = {
  testApiKey: string
}

/**
 * Нормализация ввода базового URL Lava.Top для форм и запросов.
 * Пустое значение → https://gate.lava.top; «gate.lava.top» → https://gate.lava.top;
 * хвостовые слэши срезаются.
 */
export function normalizeLavaBaseUrlInput(raw: string): string {
  const t = raw.trim()
  if (!t) return LAVA_DEFAULT_BASE_URL
  if (/^https?:\/\//i.test(t)) return t.replace(/\/+$/, '')
  return `https://${t.replace(/^\/+/, '')}`.replace(/\/+$/, '')
}
