import { nanoid } from '@app/nanoid'

/** Токен доступа модуля, выдаётся один раз при регистрации (§5.2). */
export function generateAuthToken(): string {
  return `${nanoid()}${nanoid()}`
}

/** Метка текущего захвата доставки — новая на каждый claim, включая перезабор (§3.3). */
export function newClaimToken(): string {
  return nanoid()
}

/**
 * SHA-256(`broker-module-auth:<moduleKey>:<authToken>`) — hex, 64 символа (§5.1).
 * Доменное разделение по moduleKey защищает от переноса хэша между модулями.
 */
export async function hashModuleToken(moduleKey: string, authToken: string): Promise<string> {
  // @ts-ignore — у @npm/node-forge нет .d.ts, без подавления не пройдёт типчек (003-auth.md)
  const mod = await import('@npm/node-forge')
  const forge = mod.default ?? mod
  const md = forge.md.sha256.create()
  md.update(`broker-module-auth:${moduleKey}:${authToken}`)
  return md.digest().toHex()
}
