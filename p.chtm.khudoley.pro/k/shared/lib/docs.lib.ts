/**
 * Бизнес-логика документов: источник (Yandex API), кэш Heap, синхронизация.
 * Вызывает repos и settings.lib, использует @app/request.
 */
import { request } from '@app/request'
import { parseInstructions } from '../shared/instructionParser'
import * as settingsLib from './settings.lib'
import * as cacheRepo from '../repos/docsCache.repo'
import type { DocsCacheRow } from '../repos/docsCache.repo'

const DOCS_PREFIX = 'usage=external/service=docs/'
const CACHE_SYNC_BATCH_LIMIT = 200
const MAX_SOURCE_PAGES = 20
const UTF8_ENCODER = new TextEncoder()
let syncInFlight: Promise<void> | null = null

export const MAX_DOCS_TO_CHECK = 200
export const DEFAULT_LIST_LIMIT = 1000
export const MAX_LIST_LIMIT = 1000

export interface DocsListItem {
  key: string
  size: number
  lastModified: string
}

export interface ListDocsData {
  items: DocsListItem[]
  nextToken?: string
}

export interface SourceDocResult {
  kind: 'ok' | 'not-found' | 'error'
  markdown?: string
  error?: string
}

// ——— Чистые хелперы (без ctx) ———

export function normalizeFilename(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function getUtf8Size(markdown: string): number {
  return UTF8_ENCODER.encode(markdown).length
}

export function isTruthyQuery(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true'
}

export function parseLimit(raw: unknown, maxLimit: number = MAX_LIST_LIMIT): number {
  const parsed = parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIST_LIMIT
  }
  return Math.min(parsed, maxLimit)
}

function parseOffsetToken(raw: string | undefined): number {
  if (!raw) return 0
  const parsed = parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function normalizeLastModified(value: unknown): string {
  if (typeof value === 'string' && value.trim().length > 0) return value
  return new Date().toISOString()
}

function normalizeSize(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) return parsed
  }
  return fallback
}

export function normalizeInstruction(raw: string | undefined): string {
  if (raw === undefined || raw === null) return 'shared'
  const s = String(raw).trim().toLowerCase()
  return s.length > 0 && /^[a-z0-9_-]+$/.test(s) ? s : 'shared'
}

export function normalizeInstructions(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((instruction): instruction is string => typeof instruction === 'string' && instruction.trim().length > 0)
    .map(instruction => instruction.trim().toLowerCase())
}

export function toListItem(row: DocsCacheRow): DocsListItem {
  const key = normalizeFilename(row.key)
  const markdown = typeof row.markdown === 'string' ? row.markdown : ''
  return {
    key,
    size: normalizeSize(row.size, getUtf8Size(markdown)),
    lastModified: normalizeLastModified(row.lastModified)
  }
}

export function paginateItems(items: DocsListItem[], limit: number, token?: string): ListDocsData {
  const offset = parseOffsetToken(token)
  const pagedItems = items.slice(offset, offset + limit)
  const nextOffset = offset + limit
  return {
    items: pagedItems,
    nextToken: nextOffset < items.length ? String(nextOffset) : undefined
  }
}

// ——— Источник (внешний API) ———

function getFullKey(filename: string): string {
  return DOCS_PREFIX + filename
}

function getFilename(fullKey: string): string {
  if (fullKey.startsWith(DOCS_PREFIX)) return fullKey.substring(DOCS_PREFIX.length)
  return fullKey
}

function buildQueryUrl(base: string, path: string, params: Record<string, string | number | boolean>): string {
  const queryParts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    const encodedKey = encodeURIComponent(key)
    const encodedValue = key === 'prefix' ? value.toString() : encodeURIComponent(value.toString())
    queryParts.push(`${encodedKey}=${encodedValue}`)
  }
  return `${base}${path}?${queryParts.join('&')}`
}

interface SourceListItem {
  key?: unknown
  size?: unknown
  lastModified?: unknown
}

interface SourceListBody {
  items?: SourceListItem[]
  nextToken?: unknown
}

async function listDocsFromSource(ctx: app.Ctx, limit: number, token?: string): Promise<ListDocsData> {
  const { baseUrl } = await settingsLib.getDocsApiSettings(ctx)
  const params: Record<string, string | number> = { prefix: DOCS_PREFIX, limit }
  if (token) params.token = token
  const url = buildQueryUrl(baseUrl, '/docs', params)
  const response = await request({
    url,
    method: 'get',
    headers: { Accept: 'application/json' },
    responseType: 'json',
    throwHttpErrors: false
  })
  if (response.statusCode !== 200) throw new Error(`API error: ${response.statusCode}`)
  const body = response.body as SourceListBody
  const rawItems = Array.isArray(body.items) ? body.items : []
  const items: DocsListItem[] = rawItems
    .map(item => {
      const key = normalizeFilename(item.key)
      if (!key) return null
      return {
        key: getFilename(key),
        size: normalizeSize(item.size, 0),
        lastModified: normalizeLastModified(item.lastModified)
      }
    })
    .filter((item): item is DocsListItem => item !== null)
  return { items, nextToken: typeof body.nextToken === 'string' ? body.nextToken : undefined }
}

export async function getDocFromSource(ctx: app.Ctx, filename: string, download: boolean): Promise<SourceDocResult> {
  const { baseUrl } = await settingsLib.getDocsApiSettings(ctx)
  const params: Record<string, string | number | boolean> = { key: getFullKey(filename) }
  if (download) params.download = 1
  const url = buildQueryUrl(baseUrl, '/doc', params)
  const response = await request({
    url,
    method: 'get',
    headers: { Accept: 'text/markdown; charset=utf-8' },
    responseType: 'text',
    throwHttpErrors: false
  })
  if (response.statusCode === 404) return { kind: 'not-found' }
  if (response.statusCode !== 200) return { kind: 'error', error: `API error: ${response.statusCode}` }
  return { kind: 'ok', markdown: typeof response.body === 'string' ? response.body : String(response.body ?? '') }
}

export async function putDocToSource(
  ctx: app.Ctx,
  filename: string,
  markdown: string
): Promise<{ success: boolean; etag?: string; error?: string; details?: unknown }> {
  const { baseUrl, adminToken } = await settingsLib.getDocsApiSettings(ctx)
  const url = buildQueryUrl(baseUrl, '/doc', { key: getFullKey(filename) })
  const headers: Record<string, string> = { 'Content-Type': 'text/markdown; charset=utf-8' }
  if (adminToken) headers['X-Docs-Admin'] = adminToken
  const response = await request({
    url,
    method: 'put',
    headers,
    body: markdown,
    responseType: 'text',
    throwHttpErrors: false
  })
  if (response.statusCode === 401) return { success: false, error: 'Unauthorized' }
  if (response.statusCode !== 200 && response.statusCode !== 204) {
    return { success: false, error: `API error: ${response.statusCode}`, details: response.body }
  }
  return { success: true, etag: response.headers['etag'] || '' }
}

export async function deleteDocFromSource(
  ctx: app.Ctx,
  filename: string
): Promise<{ success: boolean; error?: string; details?: unknown }> {
  const { baseUrl, adminToken } = await settingsLib.getDocsApiSettings(ctx)
  const url = buildQueryUrl(baseUrl, '/doc', { key: getFullKey(filename) })
  const headers: Record<string, string> = {}
  if (adminToken) headers['X-Docs-Admin'] = adminToken
  const response = await request({
    url,
    method: 'delete',
    headers,
    responseType: 'text',
    throwHttpErrors: false
  })
  if (response.statusCode === 401) return { success: false, error: 'Unauthorized' }
  if (response.statusCode !== 204 && response.statusCode !== 200) {
    return { success: false, error: `API error: ${response.statusCode}`, details: response.body }
  }
  return { success: true }
}

// ——— Кэш (через репо) ———

export async function listCacheRows(ctx: app.Ctx): Promise<DocsCacheRow[]> {
  return cacheRepo.findAllOrderByLastModifiedDesc(ctx)
}

export async function findCacheRowByFilename(ctx: app.Ctx, filename: string): Promise<DocsCacheRow | null> {
  return cacheRepo.findOneByKey(ctx, filename)
}

export async function deleteCacheRowByFilename(ctx: app.Ctx, filename: string): Promise<void> {
  await cacheRepo.deleteByKey(ctx, filename)
}

export async function upsertCacheRow(
  ctx: app.Ctx,
  payload: {
    key: string
    markdown: string
    size: number
    lastModified: string
    etag?: string
    instructions?: string[]
  }
): Promise<void> {
  const instructions = payload.instructions ?? parseInstructions(payload.markdown)
  await cacheRepo.upsert(ctx, {
    key: payload.key,
    markdown: payload.markdown,
    size: payload.size,
    lastModified: payload.lastModified,
    etag: payload.etag || '',
    instructions,
    cachedAt: Date.now()
  })
}

// ——— Синхронизация ———

async function fetchAllDocsFromSource(ctx: app.Ctx): Promise<DocsListItem[]> {
  let token: string | undefined
  const sourceItems: DocsListItem[] = []
  for (let page = 0; page < MAX_SOURCE_PAGES; page++) {
    const pageData = await listDocsFromSource(ctx, CACHE_SYNC_BATCH_LIMIT, token)
    sourceItems.push(...pageData.items)
    if (!pageData.nextToken) break
    token = pageData.nextToken
  }
  return sourceItems
}

export async function syncCacheFromSource(ctx: app.Ctx): Promise<void> {
  if (!syncInFlight) {
    syncInFlight = (async () => {
      const sourceItems = await fetchAllDocsFromSource(ctx)
      const sourceByKey = new Map<string, DocsListItem>()
      for (const item of sourceItems) {
        if (item.key) sourceByKey.set(item.key, item)
      }
      const existingRows = await cacheRepo.findAll(ctx)
      const existingByKey = new Map<string, DocsCacheRow>()
      for (const row of existingRows) {
        const key = normalizeFilename(row.key)
        if (key) existingByKey.set(key, row)
      }
      for (const sourceItem of sourceByKey.values()) {
        const existing = existingByKey.get(sourceItem.key)
        const isFile = sourceItem.size > 0 && !sourceItem.key.endsWith('/')
        const existingMarkdown = typeof existing?.markdown === 'string' ? existing.markdown : ''
        const existingSize = normalizeSize(existing?.size, getUtf8Size(existingMarkdown))
        const existingLastModified = normalizeLastModified(existing?.lastModified)
        let markdown = isFile ? existingMarkdown : ''
        const shouldRefreshContent =
          isFile &&
          (!existing ||
            existingMarkdown.length === 0 ||
            existingSize !== sourceItem.size ||
            existingLastModified !== sourceItem.lastModified)
        if (shouldRefreshContent) {
          const sourceDoc = await getDocFromSource(ctx, sourceItem.key, false)
          if (sourceDoc.kind === 'ok') markdown = sourceDoc.markdown || ''
          else if (sourceDoc.kind === 'error') {
            ctx.account.log('Error syncing cache for doc', {
              level: 'warn',
              json: { filename: sourceItem.key, error: sourceDoc.error }
            })
          }
        }
        await cacheRepo.upsert(ctx, {
          key: sourceItem.key,
          markdown,
          size: sourceItem.size,
          lastModified: sourceItem.lastModified,
          etag: typeof existing?.etag === 'string' ? existing.etag : '',
          instructions: isFile ? parseInstructions(markdown) : [],
          cachedAt: Date.now()
        })
      }
      for (const row of existingRows) {
        const key = normalizeFilename(row.key)
        if (!key || sourceByKey.has(key)) continue
        await cacheRepo.deleteByKey(ctx, key)
      }
    })().finally(() => {
      syncInFlight = null
    })
  }
  await syncInFlight
}

export async function ensureCacheWarm(ctx: app.Ctx): Promise<void> {
  const cacheCount = await cacheRepo.countAll(ctx)
  if (cacheCount > 0) return
  await syncCacheFromSource(ctx)
}

export async function refreshSingleDocCache(
  ctx: app.Ctx,
  filename: string,
  options: { fallbackMarkdown?: string; fallbackEtag?: string; fallbackSize?: number } = {}
): Promise<{ success: boolean; warning?: string; error?: string }> {
  const sourceDoc = await getDocFromSource(ctx, filename, false)
  let markdown = options.fallbackMarkdown ?? ''
  let warning: string | undefined
  if (sourceDoc.kind === 'ok') {
    markdown = sourceDoc.markdown || ''
  } else if (sourceDoc.kind === 'not-found') {
    if (options.fallbackMarkdown === undefined) {
      await deleteCacheRowByFilename(ctx, filename)
      return { success: false, error: 'NotFound' }
    }
    warning = 'Cache fallback is used because source document is not visible yet'
  } else if (sourceDoc.kind === 'error') {
    if (options.fallbackMarkdown === undefined) {
      return { success: false, error: sourceDoc.error || 'Failed to fetch document from source' }
    }
    warning = `Cache fallback is used because source read failed: ${sourceDoc.error || 'Unknown error'}`
  }
  const size =
    sourceDoc.kind === 'ok'
      ? getUtf8Size(markdown)
      : normalizeSize(options.fallbackSize, getUtf8Size(markdown))
  await upsertCacheRow(ctx, {
    key: filename,
    markdown,
    size,
    lastModified: new Date().toISOString(),
    etag: options.fallbackEtag || '',
    instructions: parseInstructions(markdown)
  })
  return { success: true, warning }
}
