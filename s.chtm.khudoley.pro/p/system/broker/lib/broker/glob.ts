// Сегмент — литерал ([A-Za-z0-9_-]+) либо '*' целиком (§3.1/§5.2 шаг 3, посегментная грамматика).
const SEGMENT_RE = /^[A-Za-z0-9_-]+$/

/**
 * Валидация набора glob-паттернов (allowedPublishTypes/allowedSubscribeTypes).
 * Каждый dot-сегмент — литерал или '*' целиком; частично-сегментные паттерны
 * ('tasks.cr*'), '**' и пустые паттерны отвергаются. Возвращает текст ошибки
 * либо null, если всё валидно.
 */
export function validatePatterns(patterns: string[]): string | null {
  for (const pattern of patterns) {
    if (typeof pattern !== 'string' || pattern.length === 0) {
      return `Пустой или некорректный паттерн: "${pattern}"`
    }
    if (pattern.includes('**')) {
      return `Паттерн "${pattern}" содержит '**' — не поддерживается`
    }
    const segments = pattern.split('.')
    for (const segment of segments) {
      if (segment === '*') continue
      if (!SEGMENT_RE.test(segment)) {
        return `Паттерн "${pattern}" содержит недопустимый сегмент "${segment}" (частично-сегментные паттерны запрещены)`
      }
    }
  }
  return null
}

/** Тип события (не паттерн, публикуемый факт) — без '*', сегменты только литералы. */
export function isValidEventType(type: string): boolean {
  if (typeof type !== 'string' || type.length === 0) return false
  if (type.includes('*')) return false
  const segments = type.split('.')
  return segments.every((s) => SEGMENT_RE.test(s))
}

/**
 * Развёртка предков-глобов конкретного типа события (§3.1): 'a.b.c' →
 * ['*', 'a.*', 'a.b.*', 'a.b.c']. Ровно на этом наборе строится и резолв
 * подписчиков на fan-out ($includes/$any), и проверка права публикации —
 * matchesGlob ниже определена через тот же набор, поэтому оба места
 * гарантированно согласованы.
 */
export function expandAncestors(eventType: string): string[] {
  const segments = eventType.split('.')
  const ancestors: string[] = ['*']
  for (let i = 1; i < segments.length; i++) {
    ancestors.push(`${segments.slice(0, i).join('.')}.*`)
  }
  ancestors.push(eventType)
  return ancestors
}

/**
 * Матч конкретного типа события против одного glob-паттерна whitelist'а.
 * Определён через expandAncestors — намеренно, чтобы публикационная проверка
 * (moduleCanPublish) и резолв подписчиков на fan-out судили об одном и том же
 * наборе паттернов одинаково (никогда не разойдутся).
 */
export function matchesGlob(type: string, pattern: string): boolean {
  return expandAncestors(type).includes(pattern)
}

/** Проверка права публикации: хотя бы один паттерн whitelist'а матчит тип события. */
export function moduleCanPublish(allowed: string[], type: string): boolean {
  return Array.isArray(allowed) && allowed.some((p) => matchesGlob(type, p))
}
