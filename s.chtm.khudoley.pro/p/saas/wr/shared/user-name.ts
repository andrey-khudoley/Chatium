// @shared

/**
 * Возвращает отображаемое имя пользователя
 *
 * @param user - Объект пользователя (SmartUser)
 * @returns Имя пользователя: "Имя Фамилия", "Имя", "Фамилия" или "Гость"
 */
export function getUserDisplayName(user: any): string {
  if (!user) return 'Гость'

  // Если есть firstName и/или lastName
  const firstName = user.firstName?.trim()
  const lastName = user.lastName?.trim()

  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }

  if (firstName) {
    return firstName
  }

  if (lastName) {
    return lastName
  }

  // Если нет имени - возвращаем "Гость"
  return 'Гость'
}
