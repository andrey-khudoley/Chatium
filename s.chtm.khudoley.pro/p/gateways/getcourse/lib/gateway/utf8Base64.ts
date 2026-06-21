/**
 * UTF-8 → Base64 (алфавит A–Za–z0–9+/) без глобалов платформы.
 * Логика кодирования совпадает с `toBase64` в `deprecated/goncharov/lp/liveahalf/api/register.ts`
 * (выведено в архив; GetCourse Legacy `params`).
 */

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** Строка UTF-8 (в т.ч. кириллица) → стандартный Base64. */
export function utf8StringToBase64(str: string): string {
  const utf8Bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    let char = str.charCodeAt(i)
    if (char < 0x80) {
      utf8Bytes.push(char)
    } else if (char < 0x800) {
      utf8Bytes.push(0xc0 | (char >> 6))
      utf8Bytes.push(0x80 | (char & 0x3f))
    } else if (char < 0xd800 || char >= 0xe000) {
      utf8Bytes.push(0xe0 | (char >> 12))
      utf8Bytes.push(0x80 | ((char >> 6) & 0x3f))
      utf8Bytes.push(0x80 | (char & 0x3f))
    } else {
      i++
      char = 0x10000 + (((char & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff))
      utf8Bytes.push(0xf0 | (char >> 18))
      utf8Bytes.push(0x80 | ((char >> 12) & 0x3f))
      utf8Bytes.push(0x80 | ((char >> 6) & 0x3f))
      utf8Bytes.push(0x80 | (char & 0x3f))
    }
  }
  let result = ''
  let j = 0
  while (j < utf8Bytes.length) {
    const b1 = utf8Bytes[j++] ?? 0
    const b2 = j < utf8Bytes.length ? utf8Bytes[j++] : undefined
    const b3 = j < utf8Bytes.length ? utf8Bytes[j++] : undefined
    const bitmap = (b1 << 16) | ((b2 ?? 0) << 8) | (b3 ?? 0)
    result += B64_ALPHABET.charAt((bitmap >> 18) & 63)
    result += B64_ALPHABET.charAt((bitmap >> 12) & 63)
    result += b2 !== undefined ? B64_ALPHABET.charAt((bitmap >> 6) & 63) : '='
    result += b3 !== undefined ? B64_ALPHABET.charAt(bitmap & 63) : '='
  }
  return result
}

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

/** Стандартный Base64 → строка UTF-8 (обратимо к `utf8StringToBase64`). */
export function base64ToUtf8String(b64: string): string {
  const clean = b64.replace(/\s+/g, '')
  if (clean.length % 4 !== 0) {
    throw new Error('Invalid base64 length')
  }
  return utf8BytesToString(decodeBase64ToBytes(clean))
}
