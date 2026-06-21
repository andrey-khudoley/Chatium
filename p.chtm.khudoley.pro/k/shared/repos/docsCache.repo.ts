/**
 * Репозиторий кэша документов — слой работы с БД.
 * Только CRUD, без бизнес-логики.
 */
import DocsCache, { type DocsCacheRow } from '../tables/docsCache.table'

export type { DocsCacheRow }

export async function findAllOrderByLastModifiedDesc(ctx: app.Ctx): Promise<DocsCacheRow[]> {
  return DocsCache.findAll(ctx, { order: [{ lastModified: 'desc' }] })
}

export async function findAll(ctx: app.Ctx): Promise<DocsCacheRow[]> {
  return DocsCache.findAll(ctx, {})
}

export async function findOneByKey(ctx: app.Ctx, key: string): Promise<DocsCacheRow | null> {
  return DocsCache.findOneBy(ctx, { key })
}

export async function deleteByKey(ctx: app.Ctx, key: string): Promise<void> {
  const row = await DocsCache.findOneBy(ctx, { key })
  if (row) {
    await DocsCache.delete(ctx, row.id)
  }
}

export interface UpsertCachePayload {
  key: string
  markdown: string
  size: number
  lastModified: string
  etag?: string
  instructions?: string[]
  cachedAt?: number
}

export async function upsert(ctx: app.Ctx, payload: UpsertCachePayload): Promise<void> {
  await DocsCache.createOrUpdateBy(ctx, 'key', {
    key: payload.key,
    markdown: payload.markdown,
    size: payload.size,
    lastModified: payload.lastModified,
    etag: payload.etag ?? '',
    instructions: payload.instructions ?? [],
    cachedAt: payload.cachedAt ?? Date.now()
  })
}

export async function countAll(ctx: app.Ctx): Promise<number> {
  return DocsCache.countBy(ctx, {})
}
