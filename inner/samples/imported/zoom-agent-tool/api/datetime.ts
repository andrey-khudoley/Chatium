import { zonedTimeToUtc, format } from '@npm/date-fns-tz'

type ParseResult =
  | {
      ok: true
      timestamp: number
      formatted_date: string
      iso_string: string
    }
  | {
      ok: false
      error: string
    }

export async function parseDateTimeToTimestamp(
  ctx: any,
  dateTimeString: string,
  timezone: string
): Promise<ParseResult> {
  try {
    const now = new Date()
    let targetDate: Date | null = null

    // Приводим строку к нижнему регистру и удаляем лишние пробелы
    const input = dateTimeString.toLowerCase().trim()

    // Парсим дни недели
    const dayNames = [
      'понедельник',
      'вторник',
      'сред',
      'четверг',
      'пятница',
      'суббота',
      'воскресенье'
    ]
    const dayIndex = dayNames.findIndex((day) => input.includes(day))

    // Парсим относительные даты
    if (input.includes('сегодня')) {
      targetDate = new Date(now)
    } else if (input.includes('завтра')) {
      targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() + 1)
    } else if (input.includes('послезавтра')) {
      targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() + 2)
    } else if (dayIndex >= 0) {
      // День недели
      targetDate = new Date(now)
      const currentDay = targetDate.getDay() // 0 = воскресенье, 1 = понедельник
      const targetDay = dayIndex + 1 // 1 = понедельник

      let daysDiff = targetDay - currentDay
      if (daysDiff <= 0) {
        daysDiff += 7 // На следующей неделе
      }
      targetDate.setDate(targetDate.getDate() + daysDiff)
    } else if (input.includes('через') && input.includes('час')) {
      // Относительное время: "через 2 часа"
      const hoursMatch = input.match(/через\s+(\d+)\s*час/)
      if (hoursMatch && hoursMatch[1]) {
        const hours = parseInt(hoursMatch[1])
        targetDate = new Date(now.getTime() + hours * 60 * 60 * 1000)
      }
    } else if (input.includes('через') && input.includes('минут')) {
      // Относительное время: "через 30 минут"
      const minutesMatch = input.match(/через\s+(\d+)\s*минут/)
      if (minutesMatch && minutesMatch[1]) {
        const minutes = parseInt(minutesMatch[1])
        targetDate = new Date(now.getTime() + minutes * 60 * 1000)
      }
    } else {
      // Пробуем распарсить как ISO формат: "2026-05-03 20:00" или "2026-05-03"
      const isoMatch = input.match(/(\d{4})-(\d{2})-(\d{2})/)
      if (isoMatch && isoMatch[1] && isoMatch[2] && isoMatch[3]) {
        const year = parseInt(isoMatch[1])
        const month = parseInt(isoMatch[2]) - 1 // JS месяцы с 0
        const day = parseInt(isoMatch[3])

        targetDate = new Date(year, month, day)

        // Если есть время в строке
        const timeMatch = input.match(/(\d{1,2}):(\d{2})/)
        if (timeMatch && timeMatch[1] && timeMatch[2]) {
          const hours = parseInt(timeMatch[1])
          const minutes = parseInt(timeMatch[2])
          targetDate.setHours(hours, minutes, 0, 0)
        }
      }
    }

    // Если нашли дату, но не нашли время в формате ЧЧ:ММ — ищем время
    if (targetDate) {
      const timeMatch = input.match(/(\d{1,2}):(\d{2})/)
      if (timeMatch && timeMatch[1] && timeMatch[2]) {
        const hours = parseInt(timeMatch[1])
        const minutes = parseInt(timeMatch[2])
        targetDate.setHours(hours, minutes, 0, 0)
      } else if (!input.includes('через')) {
        // Если время не указано и не относительная дата — ставим текущее время
        targetDate.setHours(now.getHours(), now.getMinutes(), 0, 0)
      }
    }

    if (!targetDate) {
      return {
        ok: false,
        error: `Не удалось распознать формат даты/времени: "${dateTimeString}". Поддерживаемые форматы: "завтра 20:00", "2026-05-03 20:00", "понедельник 10:00", "через 2 часа"`
      }
    }

    // Конвертируем локальное время в timezone → UTC timestamp
    const utcDate = zonedTimeToUtc(targetDate, timezone)
    const timestamp = Math.floor(utcDate.getTime() / 1000)

    // Форматируем для вывода
    const formattedDate = format(utcDate, 'yyyy-MM-dd HH:mm', { timeZone: timezone })
    const isoString = utcDate.toISOString()

    return {
      ok: true,
      timestamp,
      formatted_date: formattedDate,
      iso_string: isoString
    }
  } catch (error: any) {
    return {
      ok: false,
      error: error.message
    }
  }
}
