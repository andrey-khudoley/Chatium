// @shared

/**
 * Дедупликация событий - убирает последовательные дубликаты
 * Событие = дубликат если оно идет СРАЗУ после события с тем же URL+UID и разница <= 5 сек
 */
export function deduplicateEvents(events: any[]): any[] {
  if (!events || events.length === 0) {
    return events
  }

  const result: any[] = []
  let lastAddedKey: string | null = null
  let lastAddedTs: number | null = null

  for (const event of events) {
    const urlPath = event.urlPath || ''
    const uid = event.uid || event.user_id || ''
    const key = `${urlPath}:${uid}`
    const eventTs = new Date(event.ts || '').getTime()

    let isDuplicate = false

    // Проверяем только с ПОСЛЕДНИМ ДОБАВЛЕННЫМ событием
    if (lastAddedKey && lastAddedTs) {
      if (key === lastAddedKey) {
        const diffSeconds = Math.abs(eventTs - lastAddedTs) / 1000

        // Если разница <= 5 секунд - это последовательный дубликат
        if (diffSeconds <= 5) {
          isDuplicate = true
        }
      }
    }

    if (!isDuplicate) {
      // Добавляем событие и обновляем "последнее добавленное"
      result.push(event)
      lastAddedKey = key
      lastAddedTs = eventTs
    }
    // Если дубликат - НЕ обновляем "последнее добавленное"
  }

  return result
}
