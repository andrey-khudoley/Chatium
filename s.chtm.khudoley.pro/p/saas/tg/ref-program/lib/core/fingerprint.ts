/**
 * Генерация fingerprint для дедупликации визитов (по плану 9.1).
 * Улучшения: валидация IP, fallback на соединение, Client Hints, нормализация.
 */

/** Данные для fingerprint. visitorId — при передаче контекста (.run / cookie ref_visitor) для надёжной дедупликации. */
export interface FingerprintData {
  ip: string
  userAgent: string
  acceptLanguage: string
  platform?: string
  timezone?: string
  browser?: string
  isMobile?: boolean
  /** Идентификатор посетителя (ctx.user.id или cookie ref_visitor); при наличии приоритетен для дедупликации. */
  visitorId?: string
}

/** Результат вычисления fingerprint */
export interface FingerprintResult {
  hash: string
  parts: FingerprintData
}

/** Запрос с заголовками и опциональным сокетом (расширение app.Req) */
interface ReqWithHeaders extends app.Req {
  headers?: Record<string, string>
  socket?: { remoteAddress?: string }
  connection?: { remoteAddress?: string }
}

const MAX_FORWARDED_LENGTH = 1000
const USER_AGENT_MAX_LENGTH = 255
const ACCEPT_LANGUAGE_MAX_LENGTH = 50

/** Проверка формата IPv4 (xxx.xxx.xxx.xxx, каждое 0–255) */
function isValidIpv4(ip: string): boolean {
  return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
    ip
  )
}

/** Упрощённая проверка IPv6 */
function isValidIpv6(ip: string): boolean {
  return (
    /^(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}$/.test(ip) ||
    /^::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/.test(ip)
  )
}

function isValidIp(ip: string): boolean {
  if (!ip || ip.length > 45) return false
  return isValidIpv4(ip) || isValidIpv6(ip)
}

/** Приватные и локальные диапазоны (подделка в X-Forwarded-For) */
function isPrivateIp(ip: string): boolean {
  return (
    /^10\./.test(ip) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^127\./.test(ip) ||
    /^169\.254\./.test(ip) ||
    /^::1$/.test(ip) ||
    /^fc00:/i.test(ip) ||
    /^fe80:/i.test(ip)
  )
}

/**
 * Получение IP клиента: X-Forwarded-For (первый валидный, при наличии — первый не приватный),
 * fallback X-Real-Ip, затем remoteAddress соединения.
 */
function getClientIp(req: ReqWithHeaders): string {
  const headers = req.headers ?? {}
  const forwarded = headers['x-forwarded-for']
  if (forwarded) {
    const raw =
      typeof forwarded === 'string'
        ? forwarded.slice(0, MAX_FORWARDED_LENGTH)
        : String(forwarded).slice(0, MAX_FORWARDED_LENGTH)
    const ips = raw.split(',').map((s) => s.trim())
    let firstValid: string | null = null
    let firstNonPrivate: string | null = null
    for (const ip of ips) {
      if (!isValidIp(ip)) continue
      if (firstValid === null) firstValid = ip
      if (!isPrivateIp(ip)) {
        firstNonPrivate = ip
        break
      }
    }
    if (firstNonPrivate) return firstNonPrivate
    if (firstValid) return firstValid
  }

  const realIp = headers['x-real-ip']
  if (realIp && typeof realIp === 'string' && isValidIp(realIp.trim())) {
    return realIp.trim()
  }

  const remoteAddr =
    req.socket?.remoteAddress ?? (req as ReqWithHeaders).connection?.remoteAddress ?? ''
  if (remoteAddr && typeof remoteAddr === 'string') {
    const ip = remoteAddr.replace(/^::ffff:/, '').trim()
    if (isValidIp(ip)) return ip
  }

  return 'unknown'
}

/**
 * Парсинг Sec-CH-UA: "Google Chrome";v="120", "Chromium";v="120" → "Google Chrome 120"
 */
function parseBrowserFromCH(chUa: string | undefined): string | undefined {
  if (!chUa || typeof chUa !== 'string') return undefined
  const match = chUa.match(/"([^"]+)";v="(\d+)"/)
  return match ? `${match[1]} ${match[2]}`.toLowerCase() : undefined
}

/**
 * Простая детерминированная хеш-функция (замена crypto в среде Chatium).
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

/**
 * Вычисление хеша из частей fingerprint (для дедупликации в visitRepo).
 */
export function hashFingerprintParts(parts: FingerprintData): string {
  return simpleHash(JSON.stringify(parts))
}

/**
 * Вычисление fingerprint из данных запроса.
 * Нормализация (toLowerCase, ограничение длины) для стабильного хеша.
 */
export function computeFingerprint(req: app.Req): FingerprintResult {
  const r = req as ReqWithHeaders
  const headers = r.headers ?? {}
  const uaRaw = headers['user-agent'] ?? ''
  const langRaw = headers['accept-language'] ?? ''
  const platformRaw = headers['sec-ch-ua-platform']
  const parts: FingerprintData = {
    ip: getClientIp(r),
    userAgent: uaRaw.slice(0, USER_AGENT_MAX_LENGTH).toLowerCase(),
    acceptLanguage: langRaw.slice(0, ACCEPT_LANGUAGE_MAX_LENGTH).toLowerCase(),
    platform:
      platformRaw != null && platformRaw !== ''
        ? String(platformRaw).slice(0, 64).toLowerCase()
        : undefined,
    timezone: headers['sec-ch-timezone'] ?? undefined,
    browser: parseBrowserFromCH(headers['sec-ch-ua']),
    isMobile: headers['sec-ch-ua-mobile'] === '?1'
  }
  const hash = hashFingerprintParts(parts)
  return { hash, parts }
}
