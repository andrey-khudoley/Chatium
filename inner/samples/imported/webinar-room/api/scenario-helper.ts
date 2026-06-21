import Autowebinars from '../tables/autowebinars.table'

export function tryParseScenarioJSON(raw: string): { events: any[] } | null {
  const normalized = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')

  if (!normalized) return null

  try {
    const parsed = JSON.parse(normalized)
    if (parsed && Array.isArray(parsed.events)) return parsed
    return null
  } catch {
    return null
  }
}

export function extractScenarioFromAssistantContent(content: any): { events: any[] } | null {
  if (
    content &&
    typeof content === 'object' &&
    !Array.isArray(content) &&
    Array.isArray(content.events)
  ) {
    return content
  }

  if (typeof content === 'string') {
    return tryParseScenarioJSON(content)
  }

  if (Array.isArray(content)) {
    const textParts = content
      .filter((block: any) => block?.type === 'text' && typeof block.text === 'string')
      .map((block: any) => block.text)

    for (const text of textParts) {
      const parsed = tryParseScenarioJSON(text)
      if (parsed) return parsed
    }

    const joinedText = textParts.join('\n').trim()
    if (joinedText) return tryParseScenarioJSON(joinedText)
  }

  return null
}

export function formatMinuteLabel(minute: number): string {
  const h = Math.floor(minute / 60)
  const m = minute % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export function formatOffsetForTranscript(sec: number): string {
  const whole = Math.max(0, Math.floor(sec))
  const h = Math.floor(whole / 3600)
  const m = Math.floor((whole % 3600) / 60)
  const s = whole % 60
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function getFakeOnlinePoints(aw: any): Array<{ minute: number; count: number }> {
  const durationSeconds = Math.max(aw?.duration || 0, 0)
  const durationMinutes = Math.max(1, Math.floor(durationSeconds / 60))
  const raw = Array.isArray(aw?.fakeOnlineConfig) ? aw.fakeOnlineConfig : []

  const normalized = raw
    .map((point: any) => ({ minute: Number(point?.minute), count: Number(point?.count) }))
    .filter((point: any) => Number.isFinite(point.minute) && Number.isFinite(point.count))
    .map((point: any) => ({
      minute: Math.max(0, Math.min(durationMinutes, Math.round(point.minute))),
      count: Math.max(0, Math.round(point.count))
    }))
    .sort((a: any, b: any) => a.minute - b.minute)

  if (normalized.length > 0) return normalized

  return [
    { minute: 0, count: 50 },
    { minute: Math.floor(durationMinutes / 2), count: 100 },
    { minute: durationMinutes, count: 80 }
  ]
}

export function buildOnlineContext(points: Array<{ minute: number; count: number }>): string {
  const durationMinutes = Math.max(1, points[points.length - 1]?.minute || 1)
  const maxPointsInPrompt = 24
  const step = Math.max(1, Math.ceil(points.length / maxPointsInPrompt))
  const sampled = points.filter((_, index) => index % step === 0)

  const first = points[0]
  const last = points[points.length - 1]
  if (first && (!sampled[0] || sampled[0].minute !== first.minute)) sampled.unshift(first)
  if (last && sampled[sampled.length - 1]?.minute !== last.minute) sampled.push(last)

  const peak = points.reduce(
    (best, point) => (point.count > best.count ? point : best),
    points[0] || { minute: 0, count: 0 }
  )
  const avg =
    points.length > 0
      ? Math.round(points.reduce((acc, point) => acc + point.count, 0) / points.length)
      : 0

  const timeline = sampled
    .map(
      (point) => `- ${formatMinuteLabel(point.minute)} (${point.minute}м): ~${point.count} зрителей`
    )
    .join('\n')

  return `Профиль онлайна (из БД):\n- Средний онлайн: ~${avg}\n- Пик онлайна: ~${peak.count} в ${formatMinuteLabel(peak.minute)} (${peak.minute}м)\n- Длительность: ${durationMinutes} минут\n\nТаймкоды онлайна:\n${timeline}`
}

export async function updateScenarioGenerationState(
  ctx: app.Ctx,
  autowebinarId: string,
  status: 'processing' | 'completed' | 'failed',
  error?: string
) {
  await Autowebinars.update(ctx, {
    id: autowebinarId,
    scenarioGenerationStatus: status,
    scenarioGenerationError: error || null
  } as any)
}
