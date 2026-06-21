// @shared

/**
 * Calculate fake online count based on config and current minute
 * Uses linear interpolation between points.
 * Optional low-frequency deterministic noise can be enabled via options.
 */
export interface FakeOnlineOptions {
  noisePercent?: number
  noiseIntervalMinutes?: number
}

export function calculateFakeOnline(
  currentMinute: number,
  config: Array<{ minute: number; count: number }>,
  duration: number,
  options: FakeOnlineOptions = {}
): number {
  // Default config if not provided
  const defaultConfig: Array<{ minute: number; count: number }> = [
    { minute: 0, count: 50 },
    { minute: Math.floor(duration / 2 / 60), count: 100 },
    { minute: Math.floor(duration / 60), count: 80 }
  ]

  const activeConfig = config && config.length > 0 ? config : defaultConfig
  const sortedConfig = [...activeConfig].sort((a, b) => a.minute - b.minute)

  let onlineCount = sortedConfig[0]?.count || 50

  // Linear interpolation between points
  for (let i = 0; i < sortedConfig.length - 1; i++) {
    const p1 = sortedConfig[i]
    const p2 = sortedConfig[i + 1]

    if (currentMinute >= p1.minute && currentMinute <= p2.minute) {
      const t = (currentMinute - p1.minute) / (p2.minute - p1.minute)
      onlineCount = Math.round(p1.count + (p2.count - p1.count) * t)
      break
    } else if (currentMinute > p2.minute) {
      onlineCount = p2.count
    }
  }

  // Optional deterministic noise (disabled by default).
  // This avoids second-by-second jitter because the value changes only once per time bucket.
  const noisePercent = Math.max(0, options.noisePercent ?? 0)
  const noiseIntervalMinutes = Math.max(1, Math.floor(options.noiseIntervalMinutes ?? 5))

  if (noisePercent > 0) {
    const bucket = Math.floor(currentMinute / noiseIntervalMinutes)
    const seed = ((bucket + 1) * 9301 + 49297) % 233280
    const normalized = seed / 233280 // [0, 1)
    const signed = normalized * 2 - 1 // [-1, 1)
    const variation = Math.round(onlineCount * noisePercent * signed)
    onlineCount = Math.max(0, onlineCount + variation)
  }

  return onlineCount
}
