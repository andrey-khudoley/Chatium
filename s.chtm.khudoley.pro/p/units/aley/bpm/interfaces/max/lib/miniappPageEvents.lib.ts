import * as repo from '../repos/miniappPageEvents.repo'
import * as loggerLib from './logger.lib'
import { publishCoreBrokerEvent } from './broker/coreBrokerClient.lib'
import { getMiniappPage } from './miniapps/registry.lib'
import { validateMiniappInitData } from './miniapps/initData.lib'
import { safeError, sanitizeJson } from './max/safe.lib'
import type { MiniappPageEventsRow } from '../tables/miniappPageEvents.table'

const LOG_PATH = 'lib/miniappPageEvents.lib'

export type MiniappBootstrapRequest = { pageKey?: string; initData?: string; payload?: unknown }

export type MiniappActionRequest = {
  pageKey?: string
  action?: string
  initData?: string
  payload?: unknown
}

function normalizeEventSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '')
}

function miniappBrokerEventType(row: MiniappPageEventsRow): string {
  const page = normalizeEventSegment(row.pageKey) || 'root'
  if (row.eventType === 'bootstrap') return `max.miniapp.${page}.bootstrap`
  const action = normalizeEventSegment(row.action)
  return action ? `max.miniapp.${page}.${action}` : `max.miniapp.${page}.action`
}

async function publishMiniappEvent(ctx: app.Ctx, row: MiniappPageEventsRow) {
  const eventType = miniappBrokerEventType(row)
  try {
    const payload: Record<string, unknown> = {
      miniappEventId: row.id,
      pageKey: row.pageKey,
      receivedAt: row.receivedAt,
      maxUserId: row.maxUserId,
      chatId: row.chatId,
      startParam: row.startParam,
      payloadRef: {
        projectRoot: 'p/units/aley/bpm/interfaces/max',
        table: 'MiniappPageEvents',
        id: row.id
      }
    }
    if (row.eventType === 'action') payload.action = row.action
    const result = await publishCoreBrokerEvent(ctx, {
      eventType,
      eventVersion: 1,
      occurredAt: row.receivedAt,
      targetModules: Array.isArray(row.brokerTargetModules)
        ? (row.brokerTargetModules as string[])
        : [],
      aggregateType: 'max.miniapp_page_event',
      aggregateId: row.id,
      idempotencyKey: `max-miniapp:${row.id}`,
      payload,
      metadata: { module: 'max-miniapp' }
    })
    if (result.success) {
      return repo.markBrokerPublished(ctx, row, {
        eventId: String(result.eventId ?? ''),
        eventType,
        publishedAt: Date.now()
      })
    }
    return repo.markBrokerPublishFailed(ctx, row, {
      eventType,
      error: safeError(result.error ?? 'broker publish failed')
    })
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Broker publish failed for miniapp event`,
      payload: { rowId: row.id, eventType, error: safeError(error) }
    })
    return repo.markBrokerPublishFailed(ctx, row, { eventType, error: safeError(error) })
  }
}

export async function bootstrapMiniappPage(ctx: app.Ctx, request: MiniappBootstrapRequest) {
  const pageKey = request.pageKey || 'root'
  const page = getMiniappPage(pageKey)
  if (!page) throw new Error('Unknown miniapp page')
  const launch = await validateMiniappInitData(ctx, request.initData ?? '')
  const receivedAt = Date.now()
  let row = await repo.create(ctx, {
    pageKey,
    eventType: 'bootstrap',
    action: '',
    receivedAt,
    maxUserId: launch.maxUser?.id ?? '',
    chatId: launch.chat?.id ?? '',
    startParam: launch.startParam,
    initDataHash: launch.hash,
    payload: sanitizeJson(request.payload ?? {}),
    brokerEventType: 'max.miniapp.root.bootstrap',
    brokerTargetModules: [],
    brokerPublishStatus: 'not_published'
  })
  row = await publishMiniappEvent(ctx, row)
  return {
    success: true,
    page: { pageKey: page.pageKey, title: page.title, allowedActions: page.allowedActions },
    context: {
      maxUser: launch.maxUser,
      chat: launch.chat,
      startParam: launch.startParam
    },
    brokerPublishStatus: row.brokerPublishStatus
  }
}

export async function acceptMiniappAction(ctx: app.Ctx, request: MiniappActionRequest) {
  const pageKey = request.pageKey || 'root'
  const page = getMiniappPage(pageKey)
  if (!page) throw new Error('Unknown miniapp page')
  const action = typeof request.action === 'string' ? request.action.trim() : ''
  if (!action || !page.allowedActions.includes(action)) throw new Error('Action is not allowed')
  const launch = await validateMiniappInitData(ctx, request.initData ?? '')
  const receivedAt = Date.now()
  let row = await repo.create(ctx, {
    pageKey,
    eventType: 'action',
    action,
    receivedAt,
    maxUserId: launch.maxUser?.id ?? '',
    chatId: launch.chat?.id ?? '',
    startParam: launch.startParam,
    initDataHash: launch.hash,
    payload: sanitizeJson(request.payload ?? {}),
    brokerEventType: `max.miniapp.${normalizeEventSegment(pageKey)}.${normalizeEventSegment(action)}`,
    brokerTargetModules: [],
    brokerPublishStatus: 'not_published'
  })
  row = await publishMiniappEvent(ctx, row)
  return { success: true, eventId: row.id, brokerPublishStatus: row.brokerPublishStatus }
}

export async function retryMiniappBrokerPublish(ctx: app.Ctx, rows: MiniappPageEventsRow[]) {
  let published = 0
  let failed = 0
  for (const row of rows) {
    const updated = await publishMiniappEvent(ctx, row)
    if (updated.brokerPublishStatus === 'published') published++
    else failed++
  }
  return { published, failed }
}
