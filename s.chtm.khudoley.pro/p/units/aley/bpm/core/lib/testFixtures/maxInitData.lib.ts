import * as settingsLib from '../settings.lib'
import { stableHash } from '../broker/safeJson.lib'

export type MaxInitDataFixtureRequest = {
  userId?: number
  username?: string
  firstName?: string
  chatId?: number
  startParam?: string
  authDate?: number
  valid?: boolean
}

type FixturePair = [string, string]

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function hmacSha256Hex(key: string | ArrayBuffer, data: string): Promise<string> {
  const cryptoApi = globalThis.crypto?.subtle
  if (!cryptoApi) throw new Error('crypto.subtle is required for MAX initData HMAC fixture')
  const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : key
  const cryptoKey = await cryptoApi.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return toHex(await cryptoApi.sign('HMAC', cryptoKey, new TextEncoder().encode(data)))
}

async function maxWebAppHash(botToken: string, pairs: FixturePair[]): Promise<string> {
  const dataCheckString = pairs
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n')
  const cryptoApi = globalThis.crypto?.subtle
  if (!cryptoApi) throw new Error('crypto.subtle is required for MAX initData HMAC fixture')
  const secretKeyHex = await hmacSha256Hex('WebAppData', botToken)
  const secretKey = new Uint8Array(
    secretKeyHex.match(/.{1,2}/g)?.map((hex) => parseInt(hex, 16)) ?? []
  )
  return hmacSha256Hex(secretKey.buffer, dataCheckString)
}

export async function createMaxInitDataFixture(ctx: app.Ctx, request: MaxInitDataFixtureRequest) {
  const botToken = await settingsLib.getRawSecretSettingString(
    ctx,
    settingsLib.SETTING_KEYS.MAX_TEST_BOT_TOKEN
  )
  if (!botToken) throw new Error('max_test_bot_token is not configured')
  const user = {
    id: request.userId ?? 100001,
    username: request.username ?? 'fixture_user',
    first_name: request.firstName ?? 'Fixture'
  }
  const chat = {
    id: request.chatId ?? 200001,
    type: 'private',
    title: 'Fixture chat'
  }
  const pairs: FixturePair[] = [
    ['auth_date', String(request.authDate ?? Math.floor(Date.now() / 1000))],
    ['chat', JSON.stringify(chat)],
    ['query_id', `fixture_${Date.now()}`],
    ['user', JSON.stringify(user)]
  ]
  if (request.startParam) pairs.push(['start_param', request.startParam])
  const hash =
    request.valid === false ? 'invalid_' + stableHash(pairs) : await maxWebAppHash(botToken, pairs)
  const initData = [...pairs, ['hash', hash] as FixturePair]
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
  return {
    initData,
    initDataUnsafe: {
      user,
      chat,
      auth_date: Number(pairs.find(([key]) => key === 'auth_date')?.[1] ?? 0),
      start_param: request.startParam ?? ''
    },
    tokenConfigured: true
  }
}
