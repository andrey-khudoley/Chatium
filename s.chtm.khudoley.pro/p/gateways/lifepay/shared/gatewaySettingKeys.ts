// @shared
/**
 * Имена ключей Heap-настроек payments-gateway, используемые формами в админке и общими
 * валидаторами. SSOT — operation-manual §5.5 (тестовая пара ключей LifePay).
 *
 * Здесь только строки имён ключей в Heap, никаких значений секретов.
 */

export const LP_TEST_APIKEY = 'lp_test_apikey' as const
export const LP_TEST_LOGIN = 'lp_test_login' as const

/**
 * Тестовые значения для формы «Создать запрос» (вкладка панели). Читаются из Heap на SSR
 * (`index.tsx`) и передаются в компонент через пропсы, чтобы кнопки «Подставить» работали
 * без клиентского fetch к Admin-only роуту `getSettingRoute`. Пустая строка = настройка не задана.
 */
export type LpTestValues = {
  testApiKey: string
  testLogin: string
}

/**
 * Валидация значения `X-Lp-Login` (operation-manual §2.5):
 * после trim — ровно 11 ASCII-цифр, первая `7`.
 */
export function isValidLpLogin(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length !== 11) return false
  if (!/^[0-9]{11}$/.test(trimmed)) return false
  return trimmed.charAt(0) === '7'
}
