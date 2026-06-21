import { runWithExclusiveLock } from '@app/sync'
import ChatMetrics from '../tables/chat-metrics.table'

const LOCK_KEY = 'chat-metrics'

export const METRIC_KEYS = {
  processedMessages: 'processedMessages',
  errors: 'errors'
} as const

export type MetricKey = (typeof METRIC_KEYS)[keyof typeof METRIC_KEYS]

export async function get(ctx: app.Ctx, metricKey: string): Promise<number> {
  const row = await ChatMetrics.findOneBy(ctx, { metricKey })
  return row?.value ?? 0
}

export async function getAll(ctx: app.Ctx): Promise<Record<string, number>> {
  const rows = await ChatMetrics.findAll(ctx, {})
  const out: Record<string, number> = {}
  for (const row of rows) {
    out[row.metricKey] = row.value ?? 0
  }
  return out
}

export async function increment(ctx: app.Ctx, metricKey: string, delta: number = 1): Promise<void> {
  await runWithExclusiveLock(ctx, LOCK_KEY, async () => {
    const row = await ChatMetrics.findOneBy(ctx, { metricKey })
    const newValue = (row?.value ?? 0) + delta
    if (row) {
      await ChatMetrics.update(ctx, { id: row.id, value: newValue })
    } else {
      await ChatMetrics.create(ctx, { metricKey, value: newValue })
    }
  })
}

export async function reset(ctx: app.Ctx): Promise<void> {
  await runWithExclusiveLock(ctx, LOCK_KEY, async () => {
    const rows = await ChatMetrics.findAll(ctx, {})
    for (const row of rows) {
      await ChatMetrics.update(ctx, { id: row.id, value: 0 })
    }
  })
}
