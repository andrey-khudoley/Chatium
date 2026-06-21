// @shared

/**
 * Генерирует серверный фингерпринт клиента для дедупликации кликов
 *
 * Фингерпринт создаётся на основе:
 * - IP адреса клиента (нормализованный, без порта)
 * - User-Agent (браузер и устройство)
 * - Accept-Language (язык браузера)
 * - Link ID (для изоляции по ссылкам)
 *
 * Использует простой алгоритм хеширования (не криптографический, но достаточный для дедупликации),
 * так как модуль crypto недоступен в среде Chatium.
 *
 * @param req - объект HTTP запроса
 * @param linkId - ID ссылки для изоляции фингерпринта по ссылкам
 * @returns хеш фингерпринта (hex строка)
 */
export function generateFingerprint(req: any, linkId: string): string {
  // Нормализуем IP (убираем порт, если есть)
  // Сначала проверяем наличие req.ip, затем нормализуем
  const normalizedIp = (req.ip || 'unknown').split(':').pop() || 'unknown'
  const userAgent = req.headers?.['user-agent'] || 'unknown'
  const acceptLanguage = req.headers?.['accept-language'] || 'unknown'

  // Создаём строку для хеширования
  const fingerprintString = `${linkId}:${normalizedIp}:${userAgent}:${acceptLanguage}`

  // Простой алгоритм хеширования (не криптографический, но достаточный для дедупликации)
  // Используется алгоритм djb2-like (модифицированный)
  let hash = 0
  for (let i = 0; i < fingerprintString.length; i++) {
    const char = fingerprintString.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  // Возвращаем hex представление (абсолютное значение для положительного числа)
  return Math.abs(hash).toString(16)
}

/**
 * Система весов для компонентов фингерпринта
 *
 * Веса отражают важность и стабильность компонентов:
 * - Высокий вес: более стабильный и информативный компонент
 * - Низкий вес: менее стабильный или менее информативный компонент
 */
export interface FingerprintWeights {
  linkId: number // Максимальный вес - изоляция по ссылкам
  ip: number // Очень высокий вес - стабильный и информативный
  userAgent: number // Высокий вес - стабильный, хорошо различает браузеры
  acceptEncoding: number // Высокий вес - стабильный, различает версии браузеров
  acceptLanguage: number // Средний вес - стабильный, но может меняться
  secHeaders: number // Средний вес - хорошо различает, но только для современных браузеров
  accept: number // Средний вес - может различать, но менее стабильный
  dnt: number // Низкий вес - низкая информативность
  referer: number // Очень низкий вес - очень нестабильный
  connection: number // Очень низкий вес - очень нестабильный
}

/**
 * Веса компонентов по умолчанию
 *
 * Эти веса оптимизированы для максимально точного определения пользователей,
 * учитывая стабильность и информативность каждого компонента.
 *
 * Вы можете переопределить отдельные веса через параметр customWeights.
 */
export const DEFAULT_WEIGHTS: FingerprintWeights = {
  linkId: 10, // Максимальный приоритет - изоляция по ссылкам
  ip: 8, // Очень стабильный и информативный
  userAgent: 7, // Стабильный, хорошо различает браузеры
  acceptEncoding: 6, // Стабильный, различает версии браузеров
  acceptLanguage: 5, // Стабильный, но может меняться при смене языка
  secHeaders: 4, // Хорошо различает, но только для современных браузеров
  accept: 3, // Может различать настройки, но менее стабильный
  dnt: 2, // Низкая информативность
  referer: 1, // Очень нестабильный - часто меняется
  connection: 1 // Очень нестабильный - может меняться
}

/**
 * Хеширует строку простым алгоритмом (djb2-like)
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Генератор взвешенного фингерпринта с системой весов
 *
 * Использует систему весов, где более важные и стабильные компоненты
 * имеют больший вес в финальном хеше. Это позволяет более точно
 * идентифицировать пользователей, учитывая важность различных компонентов.
 *
 * Алгоритм:
 * 1. Хеширует каждый компонент отдельно
 * 2. Умножает хеш компонента на его вес
 * 3. Суммирует все взвешенные хеши
 * 4. Возвращает hex представление результата
 *
 * @param req - объект HTTP запроса
 * @param linkId - ID ссылки для изоляции фингерпринта по ссылкам
 * @param options - опции для настройки компонентов и весов
 * @returns хеш фингерпринта (hex строка)
 */
export function generateWeightedFingerprint(
  req: any,
  linkId: string,
  options: {
    includeReferer?: boolean // Включать Referer (может часто меняться, по умолчанию false)
    includeSecHeaders?: boolean // Включать Sec-Fetch-* заголовки (по умолчанию true)
    includeConnection?: boolean // Включать Connection (может быть нестабильным, по умолчанию false)
    customWeights?: Partial<FingerprintWeights> // Кастомные веса (необязательно)
  } = {}
): string {
  const {
    includeReferer = false,
    includeSecHeaders = true,
    includeConnection = false,
    customWeights = {}
  } = options

  // Объединяем веса по умолчанию с кастомными
  const weights: FingerprintWeights = { ...DEFAULT_WEIGHTS, ...customWeights }

  // === ИЗВЛЕЧЕНИЕ КОМПОНЕНТОВ ===

  // IP адрес (нормализованный, без порта)
  const normalizedIp = (req.ip || 'unknown').split(':').pop() || 'unknown'

  // User-Agent (браузер и ОС)
  const userAgent = req.headers?.['user-agent'] || 'unknown'

  // Accept-Language (язык браузера)
  const acceptLanguage = req.headers?.['accept-language'] || 'unknown'

  // Accept-Encoding (алгоритмы сжатия)
  const acceptEncoding = req.headers?.['accept-encoding'] || 'unknown'

  // Accept (предпочитаемые типы контента)
  const accept = req.headers?.['accept'] || 'unknown'

  // DNT (Do Not Track)
  const dnt = req.headers?.['dnt'] || 'unknown'

  // Security заголовки
  let secHeaders = ''
  if (includeSecHeaders) {
    const secFetchSite = req.headers?.['sec-fetch-site'] || ''
    const secFetchMode = req.headers?.['sec-fetch-mode'] || ''
    const secFetchUser = req.headers?.['sec-fetch-user'] || ''
    const secFetchDest = req.headers?.['sec-fetch-dest'] || ''
    secHeaders = `sec:${secFetchSite}:${secFetchMode}:${secFetchUser}:${secFetchDest}`
  }

  // Referer (опционально)
  const referer = includeReferer ? req.headers?.['referer'] || 'none' : 'skipped'

  // Connection (опционально)
  const connection = includeConnection ? req.headers?.['connection'] || 'unknown' : 'skipped'

  // === ВЗВЕШЕННОЕ ХЕШИРОВАНИЕ ===

  // Хешируем каждый компонент и умножаем на его вес
  let weightedHash = 0

  weightedHash += hashString(linkId) * weights.linkId
  weightedHash += hashString(normalizedIp) * weights.ip
  weightedHash += hashString(userAgent) * weights.userAgent
  weightedHash += hashString(acceptLanguage) * weights.acceptLanguage
  weightedHash += hashString(acceptEncoding) * weights.acceptEncoding
  weightedHash += hashString(accept) * weights.accept
  weightedHash += hashString(dnt) * weights.dnt

  if (includeSecHeaders) {
    weightedHash += hashString(secHeaders) * weights.secHeaders
  }

  if (includeReferer) {
    weightedHash += hashString(referer) * weights.referer
  }

  if (includeConnection) {
    weightedHash += hashString(connection) * weights.connection
  }

  // Нормализуем результат (приводим к 32-битному целому)
  weightedHash = weightedHash & 0x7fffffff // Убираем знак, оставляем 31 бит

  // Возвращаем hex представление
  return weightedHash.toString(16)
}

/**
 * Расширенная версия генератора фингерпринта (устаревшая, используйте generateWeightedFingerprint)
 *
 * @deprecated Используйте generateWeightedFingerprint для более точного определения
 */
export function generateEnhancedFingerprint(
  req: any,
  linkId: string,
  options: {
    includeReferer?: boolean
    includeSecHeaders?: boolean
    includeConnection?: boolean
  } = {}
): string {
  // Перенаправляем на взвешенную версию
  return generateWeightedFingerprint(req, linkId, options)
}
