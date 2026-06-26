import Diagnostics, { type DiagnosticsRow } from '../tables/diagnostics.table'

const LOG_MODULE = 'repos/diagnostics.repo'

type CreateData = {
  visitorId?: string
  ip?: string
  url?: string
  params?: string
  dom?: string
  info?: unknown
}

type FilterOptions = {
  visitorId?: string
  ip?: string
  url?: string
}

type FindPageOptions = {
  limit: number
  offset: number
  filters?: FilterOptions
}

function buildWhere(filters?: FilterOptions): Record<string, unknown> | undefined {
  if (!filters) return undefined
  const where: Record<string, unknown> = {}
  if (filters.visitorId && filters.visitorId.trim()) {
    where.visitorId = filters.visitorId.trim()
  }
  if (filters.ip && filters.ip.trim()) {
    where.ip = filters.ip.trim()
  }
  if (filters.url && filters.url.trim()) {
    where.url = filters.url.trim()
  }
  return Object.keys(where).length > 0 ? where : undefined
}

export async function create(ctx: app.Ctx, data: CreateData): Promise<DiagnosticsRow> {
  ctx.account.log('[repos/diagnostics.repo] create entry', {
    level: 'info',
    json: { visitorId: data.visitorId, urlLen: data.url?.length, domLen: data.dom?.length }
  })
  const row = await Diagnostics.create(ctx, {
    visitorId: data.visitorId,
    ip: data.ip,
    url: data.url,
    params: data.params,
    dom: data.dom,
    info: data.info
  })
  ctx.account.log('[repos/diagnostics.repo] create exit', {
    level: 'info',
    json: { id: row.id }
  })
  return row
}

export async function findPage(ctx: app.Ctx, opts: FindPageOptions): Promise<DiagnosticsRow[]> {
  ctx.account.log(`[${LOG_MODULE}] findPage entry`, {
    level: 'info',
    json: { limit: opts.limit, offset: opts.offset, filters: opts.filters }
  })
  const where = buildWhere(opts.filters)
  const rows = await Diagnostics.findAll(ctx, {
    where,
    order: [{ createdAt: 'desc' }],
    limit: opts.limit,
    offset: opts.offset
  })
  ctx.account.log(`[${LOG_MODULE}] findPage exit`, {
    level: 'info',
    json: { count: rows.length }
  })
  return rows
}

export async function countPage(ctx: app.Ctx, filters?: FilterOptions): Promise<number> {
  const where = buildWhere(filters)
  const count = await Diagnostics.countBy(ctx, where)
  return count
}

export async function remove(ctx: app.Ctx, id: string): Promise<boolean> {
  ctx.account.log(`[${LOG_MODULE}] remove entry`, {
    level: 'info',
    json: { id }
  })
  const row = await Diagnostics.findById(ctx, id)
  if (!row) {
    ctx.account.log(`[${LOG_MODULE}] remove: not found`, {
      level: 'warn',
      json: { id }
    })
    return false
  }
  await Diagnostics.delete(ctx, id)
  ctx.account.log(`[${LOG_MODULE}] remove exit`, {
    level: 'info',
    json: { id }
  })
  return true
}

export async function findById(ctx: app.Ctx, id: string): Promise<DiagnosticsRow | null> {
  ctx.account.log(`[${LOG_MODULE}] findById entry`, {
    level: 'info',
    json: { id }
  })
  const row = await Diagnostics.findById(ctx, id)
  ctx.account.log(`[${LOG_MODULE}] findById exit`, {
    level: 'info',
    json: { found: !!row }
  })
  return row ?? null
}
