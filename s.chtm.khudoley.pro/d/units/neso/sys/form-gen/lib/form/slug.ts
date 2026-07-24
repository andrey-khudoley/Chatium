import { nanoid } from '@app/nanoid'
import { SLUG_PREFIX } from '../../config/constants'

const REPLACEMENT_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

/**
 * @app/nanoid не поддерживает кастомный алфавит (045-nanoid.md) — дефолтный
 * алфавит содержит `_`/`-`, невалидные в CSS id-селекторе (`#fg_1-2` — ломает
 * querySelectorAll в renderWidgetJs). Заменяем каждый не-[A-Za-z0-9] символ
 * случайной буквой/цифрой — не криптографически стойко, но formID не секрет.
 */
function sanitizeToAlphanumeric(raw: string): string {
  let out = ''
  for (const ch of raw) {
    if (/[A-Za-z0-9]/.test(ch)) {
      out += ch
    } else {
      out += REPLACEMENT_CHARS[Math.floor(Math.random() * REPLACEMENT_CHARS.length)]
    }
  }
  return out
}

/**
 * formID (§5.1 п.3 спеки) — короткий случайный слаг с префиксом: валиден как
 * DOM-id и CSS-селектор (первый символ — буква благодаря SLUG_PREFIX),
 * внутренних идентификаторов не раскрывает.
 */
export function generateFormSlug(): string {
  const raw = nanoid(12)
  return `${SLUG_PREFIX}${sanitizeToAlphanumeric(raw)}`
}
