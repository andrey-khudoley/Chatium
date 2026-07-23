// @shared-route
import { requireAccountRole } from '@app/auth'
import { readLogPayload } from '../../../lib/log/read-logs'

/**
 * Admin-only раскрытие payload одной записи лога по точным {ts,msg,kv} (§5.11
 * п.1) — вызывается при разворачивании строки в живом мониторе. Отсутствующая
 * запись — не ошибка, а found:false (никогда не бросает).
 */
export const brokerAdminLogPayloadRoute = app
  .post('/')
  .body((s) => ({
    ts: s.string(),
    msg: s.string(),
    kv: s.string()
  }))
  .handle(async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')
    const row = await readLogPayload(ctx, req.body)
    return { success: true, found: row !== null, jsonStr: row?.jsonStr ?? null }
  })
