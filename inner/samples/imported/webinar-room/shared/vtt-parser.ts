// @shared

export interface VTTCue {
  startTime: number // секунды
  endTime: number // секунды
  text: string
}

export interface VTTSegment {
  startTime: number // секунды
  endTime: number // секунды
  cues: VTTCue[]
  text: string // объединённый текст всех cues
}

function parseVTTTimestamp(raw: string): number | null {
  // Supports both MM:SS.mmm and HH:MM:SS.mmm (also comma as millisecond separator).
  const normalized = raw.trim().replace(',', '.')
  const parts = normalized.split(':')

  if (parts.length === 2) {
    const minutes = Number(parts[0])
    const secPart = Number(parts[1])
    if (!Number.isFinite(minutes) || !Number.isFinite(secPart)) return null
    return minutes * 60 + secPart
  }

  if (parts.length === 3) {
    const hours = Number(parts[0])
    const minutes = Number(parts[1])
    const secPart = Number(parts[2])
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(secPart))
      return null
    return hours * 3600 + minutes * 60 + secPart
  }

  return null
}

/**
 * Парсит VTT текст в структурированные cues
 */
export function parseVTT(vttText: string): VTTCue[] {
  const lines = vttText.split('\n')
  const cues: VTTCue[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()

    // Пропускаем заголовок WEBVTT и пустые строки
    if (line === 'WEBVTT' || line === '' || line.startsWith('NOTE')) {
      i++
      continue
    }

    // Проверяем формат временной метки:
    // - MM:SS.mmm --> MM:SS.mmm
    // - HH:MM:SS.mmm --> HH:MM:SS.mmm
    const timeMatch = line.match(
      /^((?:\d{2}:)?\d{2}:\d{2}[\.,]\d{3})\s+-->\s+((?:\d{2}:)?\d{2}:\d{2}[\.,]\d{3})/
    )
    if (timeMatch) {
      const startTime = parseVTTTimestamp(timeMatch[1])
      const endTime = parseVTTTimestamp(timeMatch[2])

      if (startTime === null || endTime === null) {
        i++
        continue
      }

      // Собираем текст из следующих строк до пустой строки
      i++
      const textLines: string[] = []
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim())
        i++
      }

      if (textLines.length > 0) {
        cues.push({
          startTime,
          endTime,
          text: textLines.join(' ')
        })
      }
    } else {
      i++
    }
  }

  return cues
}

/**
 * Разбивает VTT cues на сегменты заданной длительности (в секундах)
 */
export function splitVTTIntoSegments(cues: VTTCue[], segmentDurationSeconds: number): VTTSegment[] {
  if (cues.length === 0) return []

  const segments: VTTSegment[] = []
  let currentSegmentStart = 0

  while (true) {
    const segmentEnd = currentSegmentStart + segmentDurationSeconds

    // Собираем cues которые попадают в текущий сегмент
    const segmentCues = cues.filter(
      (cue) => cue.startTime >= currentSegmentStart && cue.startTime < segmentEnd
    )

    if (segmentCues.length === 0) break

    // Находим реальное время окончания сегмента (последний cue)
    const actualEndTime = Math.max(...segmentCues.map((c) => c.endTime))

    segments.push({
      startTime: currentSegmentStart,
      endTime: actualEndTime,
      cues: segmentCues,
      text: segmentCues.map((c) => c.text).join(' ')
    })

    currentSegmentStart = segmentEnd
  }

  return segments
}

/**
 * Форматирует время в формате MM:SS или HH:MM:SS
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
