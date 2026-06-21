// @shared

import { formStorage } from '@app/form-storage'
import { tryRunWithExclusiveLock } from '@app/sync'

// Константы ограничений
export const LIMITS = {
  CHAT_MESSAGE_MAX_LENGTH: 500,
  CHAT_MESSAGES_PER_MINUTE: 10,
  APPLICATIONS_PER_HOUR: 3,
  NAME_MAX_LENGTH: 100,
  ACTIVITY_MAX_LENGTH: 500
}

/**
 * Проверяет rate limit для действия
 * @param ctx - контекст запроса
 * @param key - уникальный ключ (userId + action)
 * @param maxAttempts - максимальное количество попыток
 * @param windowMs - окно времени в миллисекундах
 */
export async function checkRateLimit(
  ctx: any,
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<boolean> {
  const lockResult = await tryRunWithExclusiveLock(ctx, `ratelimit:${key}`, 5000, async () => {
    const now = Date.now()
    const userAttempts = (await formStorage.getItem(key, [] as any)) as unknown as number[]

    // Удаляем старые попытки
    const recentAttempts = userAttempts.filter((timestamp) => now - timestamp < windowMs)

    if (recentAttempts.length >= maxAttempts) {
      return false // Превышен лимит
    }

    recentAttempts.push(now)
    await formStorage.setItem(key, recentAttempts as any)

    return true
  })

  return lockResult.success ? lockResult.result : false
}

/**
 * Возвращает сколько осталось времени до следующей попытки
 */
export async function getTimeUntilNextAttempt(
  ctx: any,
  key: string,
  windowMs: number
): Promise<number> {
  const now = Date.now()
  const userAttempts = await (formStorage.getItem(key, [] as any) as unknown as number[]) // Получаем попытки из formStorage, если их там нет, используем пустой массив

  if (userAttempts.length === 0) return 0

  const oldestAttempt = userAttempts[0]
  const timeLeft = windowMs - (now - (oldestAttempt || 0))

  return Math.max(0, Math.ceil(timeLeft / 1000)) // в секундах
}

/**
 * Проверяет текущий статус rate-limit
 */
export async function getRateLimitStatus(
  ctx: any,
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<{ limited: boolean; blockedUntil?: number; secondsLeft?: number }> {
  const now = Date.now()
  const userAttempts = (await formStorage.getItem(key, [] as any)) as unknown as number[]
  const recentAttempts = userAttempts.filter((timestamp) => now - timestamp < windowMs)

  if (recentAttempts.length >= maxAttempts) {
    const oldestAttempt = recentAttempts[0]
    const timeLeft = windowMs - (now - (oldestAttempt || 0))
    const secondsLeft = Math.max(0, Math.ceil(timeLeft / 1000))
    return {
      limited: true,
      blockedUntil: now + secondsLeft * 1000,
      secondsLeft
    }
  }

  return { limited: false }
}

/**
 * Валидация текстового поля
 */
export function validateText(
  text: string,
  fieldName: string,
  maxLength: number,
  required: boolean = true
): void {
  if (required && !text?.trim()) {
    throw new Error(`Поле "${fieldName}" обязательно для заполнения`)
  }

  if (text && text.length > maxLength) {
    throw new Error(`Поле "${fieldName}" не может быть длиннее ${maxLength} символов`)
  }
}
