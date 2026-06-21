import { runWithExclusiveLock } from '@app/sync'
import * as settingsLib from './settings.lib'
import * as loggerLib from './logger.lib'
import * as rawRepo from '../repos/maxRawUpdates.repo'
import * as chatsRepo from '../repos/maxChats.repo'
import { publishCoreBrokerEvent } from './broker/coreBrokerClient.lib'
import { extractChatId, extractUserId, safeError, sanitizeJson, stableHash } from './max/safe.lib'
import type { MaxRawUpdatesRow } from '../tables/maxRawUpdates.table'

const LOG_PATH = 'lib/maxRawUpdates.lib'

function updateObject(update: unknown): Record<string, unknown> {
  if (typeof update !== 'object' || update === null || Array.isArray(update)) {
    throw new Error('MAX update payload must be object')
  }
  return update as Record<string, unknown>
}

export function mapMaxUpdateToBrokerEventType(updateType: string): string {
  const normalized = updateType
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '')
  return normalized ? `max.${normalized}` : 'max.raw_update.accepted'
}

async function publishMaxRawUpdateAccepted(
  ctx: app.Ctx,
  row: MaxRawUpdatesRow
): Promise<MaxRawUpdatesRow> {
  const enabled = await settingsLib.getSetting(
    ctx,
    settingsLib.SETTING_KEYS.CORE_BROKER_PUBLISH_ENABLED
  )
  if (enabled === false) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Broker publish disabled for MAX raw update`,
      payload: { rowId: row.id, updateType: row.updateType }
    })
    return row
  }
  const eventType = mapMaxUpdateToBrokerEventType(row.updateType)
  try {
    const result = await publishCoreBrokerEvent(ctx, {
      eventType,
      eventVersion: 1,
      occurredAt: row.receivedAt,
      aggregateType: 'max.raw_update',
      aggregateId: row.id,
      idempotencyKey: `max-raw:${row.fingerprint}`,
      payload: {
        rawUpdateId: row.id,
        source: row.source,
        updateType: row.updateType,
        maxTimestamp: row.maxTimestamp,
        receivedAt: row.receivedAt,
        chatId: row.chatId,
        userId: row.userId,
        fingerprint: row.fingerprint,
        rawRef: {
          projectRoot: 'p/units/aley/bpm/interfaces/max',
          table: 'MaxRawUpdates',
          id: row.id
        }
      },
      metadata: { module: 'max' }
    })
    if (result.success) {
      return rawRepo.markBrokerPublished(ctx, row, {
        eventId: String(result.eventId ?? ''),
        eventType,
        publishedAt: Date.now()
      })
    }
    return rawRepo.markBrokerPublishFailed(ctx, row, {
      eventType,
      error: safeError(result.error ?? 'broker publish failed')
    })
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Broker publish failed for MAX raw update`,
      payload: { rowId: row.id, eventType, error: safeError(error) }
    })
    return rawRepo.markBrokerPublishFailed(ctx, row, { eventType, error: safeError(error) })
  }
}

export async function acceptMaxUpdate(
  ctx: app.Ctx,
  data: { source: 'webhook' | 'long_polling'; update: unknown; marker?: number | null }
): Promise<{ row: MaxRawUpdatesRow; skipped: boolean }> {
  const update = updateObject(data.update)
  const updateType = typeof update.update_type === 'string' ? update.update_type.trim() : ''
  if (!updateType) throw new Error('update_type is required')
  if (typeof update.timestamp !== 'number' || !Number.isFinite(update.timestamp)) {
    throw new Error('timestamp must be number')
  }
  const maxTimestamp = update.timestamp
  const fingerprint = stableHash(update)
  const dedupPolicy = await settingsLib.getSetting(
    ctx,
    settingsLib.SETTING_KEYS.MAX_RAW_DEDUP_POLICY
  )
  return runWithExclusiveLock(ctx, `max-raw:${fingerprint}`, async () => {
    if (dedupPolicy === 'fingerprint') {
      const existing = await rawRepo.findByFingerprint(ctx, fingerprint)
      if (existing) {
        await loggerLib.writeServerLog(ctx, {
          severity: 7,
          message: `[${LOG_PATH}] Duplicate MAX raw update skipped`,
          payload: { rowId: existing.id, fingerprint }
        })
        return { row: existing, skipped: true }
      }
    }
    const chatId = extractChatId(update)
    const userId = extractUserId(update)
    const receivedAt = Date.now()
    let row = await rawRepo.create(ctx, {
      source: data.source,
      updateType,
      maxTimestamp,
      receivedAt,
      chatId,
      userId,
      fingerprint,
      rawUpdate: sanitizeJson(update),
      rawMeta: { marker: data.marker ?? null },
      brokerEventType: mapMaxUpdateToBrokerEventType(updateType),
      brokerPublishStatus: 'not_published'
    })
    if (
      chatId &&
      (await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.MAX_CHAT_DISCOVERY_ENABLED)) !==
        false
    ) {
      await chatsRepo.upsert(ctx, {
        chatId,
        chatType: 'unknown',
        status: 'active',
        title: `Chat ${chatId}`,
        dialogUserId: userId,
        lastEventTime: maxTimestamp,
        rawChat: sanitizeJson(update)
      })
    }
    row = await publishMaxRawUpdateAccepted(ctx, row)
    return { row, skipped: false }
  })
}

export async function retryMaxRawBrokerPublish(ctx: app.Ctx, rows: MaxRawUpdatesRow[]) {
  let published = 0
  let failed = 0
  for (const row of rows) {
    const updated = await publishMaxRawUpdateAccepted(ctx, row)
    if (updated.brokerPublishStatus === 'published') published++
    else failed++
  }
  return { published, failed }
}
