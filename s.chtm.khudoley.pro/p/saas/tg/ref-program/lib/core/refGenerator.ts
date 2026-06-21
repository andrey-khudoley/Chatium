/**
 * Генерация уникальных идентификаторов (по плану 9.2).
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Генерация URL-safe идентификатора (base62).
 * @param length Длина идентификатора (по умолчанию 8)
 */
export function generateUrlSafeId(length: number = 8): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * ALPHABET.length)
    result += ALPHABET[randomIndex]
  }
  return result
}

/**
 * Генерация секрета кампании (webhookSecret и т.п.).
 */
export function generateCampaignSecret(): string {
  return generateUrlSafeId(8)
}

/**
 * Генерация publicSlug для партнёрской ссылки (URL вида /r~:slug).
 */
export function generateLinkSlug(): string {
  return generateUrlSafeId(10)
}

/**
 * Генерация токена приглашения в кампанию (уникальный, URL-safe).
 */
export function generateInviteToken(): string {
  return generateUrlSafeId(24)
}
