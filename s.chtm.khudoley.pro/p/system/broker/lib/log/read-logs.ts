import { WORKSPACE_PATH } from '../../config/env'
import type { LogLevel } from './logger'

export type LogRow = {
  ts: string
  level: string
  msg: string
  kv: string
}

export type ReadLogsOptions = {
  levels?: LogLevel[]
  /** Подстрока в message, регистронезависимо. */
  search?: string
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}

function escapeSqlString(value: string): string {
  // Backslash — раньше кавычки (фикс-раунда 1, п.14): иначе "'" после уже
  // экранированного "\\" мог бы неверно склеиться в SQL-строке.
  return value.replace(/\\/g, '\\\\').replace(/'/g, "''")
}

/** Санитизация подстроки поиска — экранирует спецсимволы ILIKE ('%','_') и кавычку. */
function sanitizeSearch(search: string): string {
  return escapeSqlString(search).replace(/[%_]/g, (c) => `\\${c}`)
}

function toSqlStringList(values: string[]): string {
  return values.map((v) => `'${escapeSqlString(v)}'`).join(', ')
}

/**
 * Дата в литерал ClickHouse DateTime64(3, 'UTC'): 'YYYY-MM-DD HH:MM:SS.sss'.
 * toISOString() не годится — CH не принимает 'T'-разделитель и суффикс 'Z'
 * (подтверждено рантайм-ошибкой Cannot convert string ... to type DateTime64,
 * независимый аудит 22-07-2026; формат — 050-logging.md «Колонка ts64»).
 */
function toClickHouseDateTime(d: Date): string {
  return d.toISOString().replace('T', ' ').replace('Z', '')
}

/**
 * Чтение исторических логов брокера через queryAi (§5.10.7). Два обязательных
 * условия: фильтр по workspace_path (иначе в выдачу попадут чужие логи и системные
 * записи платформы) и временные условия средствами SQL (ts64 — DateTime64).
 */
export async function readLogs(
  ctx: RichUgcCtx,
  opts: ReadLogsOptions = {}
): Promise<{ rows: LogRow[]; total: number }> {
  // @ts-ignore — @traffic/sdk внедряется платформой в рантайме, локальных типов нет (050-logging.md)
  const { queryAi } = await import('@traffic/sdk')

  const conditions: string[] = [`workspace_path = '${escapeSqlString(WORKSPACE_PATH)}'`]
  if (opts.levels && opts.levels.length > 0) {
    conditions.push(`level IN (${toSqlStringList(opts.levels)})`)
  }
  if (opts.search) {
    conditions.push(`msg ILIKE '%${sanitizeSearch(opts.search)}%'`)
  }
  if (opts.from) {
    conditions.push(`ts64 >= '${toClickHouseDateTime(opts.from)}'`)
  }
  if (opts.to) {
    conditions.push(`ts64 <= '${toClickHouseDateTime(opts.to)}'`)
  }

  const where = conditions.join(' AND ')
  const limit = opts.limit ?? 50
  const offset = opts.offset ?? 0

  // json_str сознательно НЕ выбирается в списке (§5.10.7) — тянется отдельным
  // запросом при раскрытии конкретной записи (readLogsByMark ниже).
  const [dataResult, countResult] = await Promise.all([
    queryAi(
      ctx,
      `SELECT ts64, level, msg, kv FROM chatium_ai.account_logs WHERE ${where} ORDER BY ts64 DESC LIMIT ${limit} OFFSET ${offset}`
    ),
    queryAi(ctx, `SELECT count() AS total FROM chatium_ai.account_logs WHERE ${where}`)
  ])

  const rows: LogRow[] = (dataResult.rows ?? []).map((r: Record<string, unknown>) => ({
    ts: String(r.ts64),
    level: String(r.level),
    msg: String(r.msg),
    kv: String(r.kv ?? '')
  }))
  const total = Number(countResult.rows?.[0]?.total ?? 0)

  return { rows, total }
}

export type LogPayloadRow = { jsonStr: string | null }

/**
 * Раскрытие payload одной записи лога по точным {ts,msg,kv} (§5.11 «Живой
 * монитор», волна 2.5) — round-trip значений ts/msg/kv, как есть из LogRow
 * (список никогда не переформатирует их). Нет строк → null (не бросает) —
 * вызывающий роут отличает «не найдено» от «найдено, но без payload»
 * (json_str может быть NULL у самой строки).
 *
 * ⚠️ Известное ограничение схемы (не баг, фикс-цикл волны 2.5): у строки
 * account_logs нет уникального id, совпадение {ts64,msg,kv} — не гарантированный
 * ключ. Две записи с идентичными ts/msg/kv в один и тот же миллисекундный тик
 * (например, дублирующийся вызов writeServerLog с тем же текстом) дадут
 * коллизию — LIMIT 1 вернёт произвольную из них.
 */
export async function readLogPayload(
  ctx: RichUgcCtx,
  params: { ts: string; msg: string; kv: string }
): Promise<LogPayloadRow | null> {
  // @ts-ignore — @traffic/sdk внедряется платформой в рантайме, локальных типов нет (050-logging.md)
  const { queryAi } = await import('@traffic/sdk')

  const conditions = [
    `workspace_path = '${escapeSqlString(WORKSPACE_PATH)}'`,
    `ts64 = '${escapeSqlString(params.ts)}'`,
    `msg = '${escapeSqlString(params.msg)}'`,
    `kv = '${escapeSqlString(params.kv)}'`
  ].join(' AND ')

  const result = await queryAi(
    ctx,
    `SELECT json_str FROM chatium_ai.account_logs WHERE ${conditions} LIMIT 1`
  )

  const row = result.rows?.[0] as Record<string, unknown> | undefined
  if (!row) return null
  return { jsonStr: row.json_str == null ? null : String(row.json_str) }
}

export type LogByMarkRow = {
  workspacePath: string
  jsonStr: string | null
  msg: string
}

/**
 * Для лог-теста (§9.5.2, log_two_phase): читает по метке в message, включая
 * workspace_path и json_str (в отличие от readLogs — здесь это как раз предмет
 * проверки, не списочная выборка).
 */
export async function readLogsByMark(
  ctx: RichUgcCtx,
  mark: string,
  opts: { withPathFilter: boolean }
): Promise<LogByMarkRow[]> {
  // @ts-ignore — @traffic/sdk внедряется платформой в рантайме, локальных типов нет
  const { queryAi } = await import('@traffic/sdk')

  const conditions: string[] = [`msg LIKE '%${escapeSqlString(mark)}%'`]
  if (opts.withPathFilter) {
    conditions.push(`workspace_path = '${escapeSqlString(WORKSPACE_PATH)}'`)
  }

  const result = await queryAi(
    ctx,
    `SELECT workspace_path, json_str, msg FROM chatium_ai.account_logs WHERE ${conditions.join(' AND ')} ORDER BY ts64 DESC LIMIT 20`
  )

  return (result.rows ?? []).map((r: Record<string, unknown>) => ({
    workspacePath: String(r.workspace_path ?? ''),
    jsonStr: r.json_str == null ? null : String(r.json_str),
    msg: String(r.msg)
  }))
}
