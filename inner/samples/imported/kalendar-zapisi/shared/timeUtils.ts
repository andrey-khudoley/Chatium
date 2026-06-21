// @shared

export function getMoscowNow(): Date {
  const now = new Date()
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000
  return new Date(utcTime + 3 * 60 * 60 * 1000)
}

export function getMoscowDateString(): string {
  const now = getMoscowNow()
  return now.toISOString().split('T')[0]
}
