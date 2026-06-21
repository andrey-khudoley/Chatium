// JWT генератор для Firebase Cloud Messaging API v1 (server-only)
import { request } from '@app/request'

// Глобальный mock для navigator (jsrsasign требует его)
if (typeof globalThis.navigator === 'undefined') {
  // @ts-ignore
  globalThis.navigator = {
    userAgent: 'Chatium-Node',
    platform: 'Chatium-Server'
  } as any
}

let KJUR: any = null

async function loadJsrsasign() {
  if (KJUR) return KJUR
  
  // Загружаем библиотеку для создания JWT с RS256
  const response = await request({
    method: 'get',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/jsrsasign/10.5.25/jsrsasign-all-min.js',
    responseType: 'text',
  })
  
  const code = String(response.body)
  
  // Выполняем в изолированном контексте
  const func = new Function(code + '; return KJUR;')
  KJUR = func()
  
  return KJUR
}

/**
 * Генерирует JWT токен для Google OAuth2
 */
export async function generateJWT(clientEmail: string, privateKey: string): Promise<string> {
  const KJUR = await loadJsrsasign()
  
  const now = Math.floor(Date.now() / 1000)
  
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }
  
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, // 1 час
    iat: now
  }
  
  const sHeader = JSON.stringify(header)
  const sPayload = JSON.stringify(payload)
  
  return KJUR.jws.JWS.sign('RS256', sHeader, sPayload, privateKey)
}

/**
 * Обменивает JWT на access token через Google OAuth2
 */
export async function getAccessToken(jwt: string): Promise<string> {
  const response = await request({
    method: 'post',
    url: 'https://oauth2.googleapis.com/token',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    }).toString()
  })
  
  if (response.statusCode !== 200) {
    const error = String(response.body)
    throw new Error(`Failed to get access token: ${error}`)
  }
  
  const data = response.body as any
  return data.access_token
}
