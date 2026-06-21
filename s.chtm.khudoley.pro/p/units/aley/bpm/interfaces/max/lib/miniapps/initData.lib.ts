import * as settingsLib from '../settings.lib'

export type MiniappLaunchContext = {
  maxUser: { id: string; username?: string; firstName?: string } | null
  chat: { id: string; type?: string; title?: string } | null
  startParam: string
  authDate: number
  hash: string
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function hmacSha256Hex(key: string | ArrayBuffer, data: string): Promise<string> {
  const cryptoApi = globalThis.crypto?.subtle
  if (!cryptoApi) throw new Error('crypto.subtle is required for MAX initData HMAC validation')
  const rawKey = typeof key === 'string' ? new TextEncoder().encode(key) : key
  const cryptoKey = await cryptoApi.importKey(
    'raw',
    rawKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return toHex(await cryptoApi.sign('HMAC', cryptoKey, new TextEncoder().encode(data)))
}

async function verifyHash(botToken: string, params: URLSearchParams): Promise<boolean> {
  const receivedHash = params.get('hash') ?? ''
  const pairs: string[] = []
  params.forEach((value, key) => {
    if (key !== 'hash') pairs.push(`${key}=${value}`)
  })
  const dataCheckString = pairs.sort().join('\n')
  const cryptoApi = globalThis.crypto?.subtle
  if (!cryptoApi) throw new Error('crypto.subtle is required for MAX initData HMAC validation')
  const secretKeyHex = await hmacSha256Hex('WebAppData', botToken)
  const secretKey = new Uint8Array(
    secretKeyHex.match(/.{1,2}/g)?.map((hex) => parseInt(hex, 16)) ?? []
  )
  const expected = await hmacSha256Hex(secretKey.buffer, dataCheckString)
  return expected === receivedHash
}

function parseJsonParam<T>(params: URLSearchParams, key: string): T | null {
  const raw = params.get(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function validateMiniappInitData(
  ctx: app.Ctx,
  initData: string
): Promise<MiniappLaunchContext> {
  if (!initData || typeof initData !== 'string') throw new Error('initData is required')
  const token = await settingsLib.getRawSecretSettingString(
    ctx,
    settingsLib.SETTING_KEYS.MAX_BOT_ACCESS_TOKEN
  )
  if (!token) throw new Error('MAX bot token is not configured')
  const params = new URLSearchParams(initData)
  const hash = params.get('hash') ?? ''
  if (!hash) throw new Error('initData hash is required')
  if (!(await verifyHash(token, params))) throw new Error('Invalid initData hash')
  const ttl = Number(
    await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.MAX_MINIAPP_INIT_DATA_TTL_SEC)
  )
  const authDate = Number(params.get('auth_date') ?? 0)
  if (!Number.isFinite(authDate) || authDate <= 0) throw new Error('auth_date is invalid')
  if (Date.now() / 1000 - authDate > ttl) throw new Error('initData expired')
  const user = parseJsonParam<Record<string, unknown>>(params, 'user')
  const chat = parseJsonParam<Record<string, unknown>>(params, 'chat')
  return {
    maxUser: user
      ? {
          id: String(user.id ?? ''),
          username: typeof user.username === 'string' ? user.username : undefined,
          firstName: typeof user.first_name === 'string' ? user.first_name : undefined
        }
      : null,
    chat: chat
      ? {
          id: String(chat.id ?? ''),
          type: typeof chat.type === 'string' ? chat.type : undefined,
          title: typeof chat.title === 'string' ? chat.title : undefined
        }
      : null,
    startParam: (params.get('start_param') ?? '').slice(0, 512),
    authDate,
    hash
  }
}
