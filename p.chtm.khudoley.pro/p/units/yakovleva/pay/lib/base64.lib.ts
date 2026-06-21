/**
 * Самописное Base64-декодирование UTF-8 — без глобалов платформы.
 *
 * В Chatium UGC-рантайме `Buffer` / `atob` не гарантированы (см. `inner/docs/047-base64.md`).
 * Объявление `Buffer` в `jsx.d.ts` лишь заглушает TypeScript, в рантайме всё равно
 * `ReferenceError`. Поэтому декодирование делаем здесь, на чистом JS.
 *
 * Используется в `webhooks/lavatop` для разбора `Authorization: Basic <base64>`
 * (фоллбэк, когда секрет прилетает не через `X-Api-Key`, а через Basic-заголовок).
 *
 * Алгоритм идентичен gateway-эталону `lib/gateway/utf8Base64.ts`. Сюда вынесена
 * только функция декодирования — кодирование в этом проекте не требуется.
 */

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function decodeBase64ToBytes(clean: string): number[] {
  const inv = new Map<string, number>()
  for (let i = 0; i < B64_ALPHABET.length; i++) {
    inv.set(B64_ALPHABET.charAt(i), i)
  }
  const bytes: number[] = []
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = clean[i]
    const c1 = clean[i + 1]
    const c2 = clean[i + 2]
    const c3 = clean[i + 3]
    if (c0 === undefined || c1 === undefined || c2 === undefined || c3 === undefined) {
      throw new Error('Invalid base64 length')
    }
    const n0 = inv.get(c0)
    const n1 = inv.get(c1)
    if (n0 === undefined || n1 === undefined) {
      throw new Error('Invalid base64 character')
    }
    const n2 = c2 === '=' ? 0 : inv.get(c2)
    const n3 = c3 === '=' ? 0 : inv.get(c3)
    if (c2 !== '=' && n2 === undefined) {
      throw new Error('Invalid base64 character')
    }
    if (c3 !== '=' && n3 === undefined) {
      throw new Error('Invalid base64 character')
    }
    const bitmap = (n0 << 18) | (n1 << 12) | ((n2 ?? 0) << 6) | (n3 ?? 0)
    bytes.push((bitmap >> 16) & 0xff)
    if (c2 !== '=') {
      bytes.push((bitmap >> 8) & 0xff)
    }
    if (c3 !== '=') {
      bytes.push(bitmap & 0xff)
    }
  }
  return bytes
}

function utf8BytesToString(bytes: number[]): string {
  let i = 0
  let out = ''
  while (i < bytes.length) {
    const b0 = bytes[i++]
    if (b0 === undefined) {
      break
    }
    if (b0 < 0x80) {
      out += String.fromCharCode(b0)
    } else if ((b0 & 0xe0) === 0xc0) {
      const b1 = bytes[i++]
      out += String.fromCharCode(((b0 & 0x1f) << 6) | (b1! & 0x3f))
    } else if ((b0 & 0xf0) === 0xe0) {
      const b1 = bytes[i++]
      const b2 = bytes[i++]
      out += String.fromCharCode(((b0 & 0x0f) << 12) | ((b1! & 0x3f) << 6) | (b2! & 0x3f))
    } else if ((b0 & 0xf8) === 0xf0) {
      const b1 = bytes[i++]
      const b2 = bytes[i++]
      const b3 = bytes[i++]
      let cp = ((b0 & 0x07) << 18) | ((b1! & 0x3f) << 12) | ((b2! & 0x3f) << 6) | (b3! & 0x3f)
      if (cp > 0xffff) {
        cp -= 0x10000
        out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff))
      } else {
        out += String.fromCharCode(cp)
      }
    } else {
      throw new Error('Invalid UTF-8 sequence')
    }
  }
  return out
}

/** Стандартный Base64 (`A–Za–z0–9+/` с `=`) → строка UTF-8. */
export function base64ToUtf8String(b64: string): string {
  const clean = b64.replace(/\s+/g, '')
  if (clean.length % 4 !== 0) {
    throw new Error('Invalid base64 length')
  }
  return utf8BytesToString(decodeBase64ToBytes(clean))
}
