// @shared

// SMS авторизация
export async function sendSmsCode(phone: string) {
  const normalizedPhone = phone.replace(/[^0-9]/g, '')

  const response = await fetch('/s/auth/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: normalizedPhone })
  })

  return await response.json()
}

export async function confirmSmsCode(phone: string, verificationCode: string) {
  const normalizedPhone = phone.replace(/[^0-9]/g, '')

  const response = await fetch('/s/auth/sms/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: normalizedPhone, verificationCode })
  })

  return await response.json()
}

// Email авторизация
export async function sendEmailCode(email: string) {
  const response = await fetch('/s/auth/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })

  return await response.json()
}

export async function confirmEmailCode(email: string, code: string) {
  const response = await fetch('/s/auth/email/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  })

  return await response.json()
}

// Авторизация по паролю
export async function loginWithPassword(
  type: 'Phone' | 'Email',
  identifier: string,
  checkHashUrl: string,
  password: string
) {
  try {
    // Получение хеша пароля через API
    const response = await fetch(checkHashUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        it: type,
        ik: identifier,
        pwd: password
      })
    })

    if (!response.ok) {
      return { success: false, error: 'Ошибка при получении хеша пароля' }
    }

    const passwordHash = await response.text()

    // Авторизация с хешем пароля
    const authResponse = await fetch('/s/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        it: type,
        ik: identifier,
        s: { hash: passwordHash }
      })
    })

    return await authResponse.json()
  } catch (error) {
    return { success: false, error: 'Произошла ошибка при авторизации' }
  }
}

// Функция для обработки ошибок авторизации
export function handleAuthError(error: any): string {
  if (typeof error === 'string') {
    if (error.includes('Неверный код')) return 'Неверный код подтверждения'
    if (error.includes('Неверный пароль')) return 'Неверный пароль'
    if (error.includes('not found')) return 'Пользователь не найден'
    if (error.includes('blocked')) return 'Аккаунт заблокирован'
    return error
  }

  return 'Произошла ошибка при авторизации'
}

// Нормализация номера телефона для отображения
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.length === 11 && cleaned.startsWith('7')) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`
  }
  return phone
}

// Валидация email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Валидация телефона
export function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  return cleanPhone.length >= 10 && cleanPhone.length <= 15
}
