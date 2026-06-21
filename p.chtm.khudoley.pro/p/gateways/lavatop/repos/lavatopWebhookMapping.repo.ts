/**
 * Репозиторий маппинга `contractId → клиентский callback-URL` (lavatopWebhookMapping.table).
 *
 * Уникальность `contract_id` обеспечивается на уровне приложения: `upsertByContractId`
 * обновляет существующую запись или создаёт новую (идемпотентность при retry `createInvoice`).
 */

import { runWithExclusiveLock } from '@app/sync'
import LavatopWebhookMapping, {
  type LavatopWebhookMappingRow
} from '../tables/lavatopWebhookMapping.table'
import * as loggerLib from '../lib/logger.lib'

const LOG_MODULE = 'repos/lavatopWebhookMapping.repo'

export type UpsertMappingPayload = {
  contract_id: string
  callback_url: string
  client_order_id?: string
}

/**
 * Создать маппинг или обновить существующий для того же `contract_id`.
 * Идемпотентно: повторный `createInvoice` с тем же contractId (retry клиента) не плодит дубли.
 */
export async function upsertByContractId(
  ctx: app.Ctx,
  payload: UpsertMappingPayload
): Promise<LavatopWebhookMappingRow> {
  // Лок по contract_id: параллельные createInvoice с одним contractId (retry клиента) не должны
  // создать две записи маппинга (гонка между findOneBy и create).
  return runWithExclusiveLock(
    ctx,
    `lavatop_whmap:${payload.contract_id}`,
    async (lockCtx: app.Ctx): Promise<LavatopWebhookMappingRow> => {
      const existing = await LavatopWebhookMapping.findOneBy(lockCtx, {
        contract_id: payload.contract_id
      })
      const data: Record<string, unknown> = {
        contract_id: payload.contract_id,
        callback_url: payload.callback_url,
        created_at: Date.now()
      }
      if (payload.client_order_id !== undefined) {
        data.client_order_id = payload.client_order_id
      }

      let row: LavatopWebhookMappingRow
      if (existing) {
        // client_order_id обновляем только если он явно передан — повторный createInvoice без него
        // не должен затирать ранее сохранённый идентификатор заказа.
        const updateData: Record<string, unknown> = {
          id: existing.id,
          callback_url: payload.callback_url
        }
        if (payload.client_order_id !== undefined) {
          updateData.client_order_id = payload.client_order_id
        }
        row = await LavatopWebhookMapping.update(
          lockCtx,
          updateData as Parameters<typeof LavatopWebhookMapping.update>[1]
        )
      } else {
        row = await LavatopWebhookMapping.create(
          lockCtx,
          data as Parameters<typeof LavatopWebhookMapping.create>[1]
        )
      }

      await loggerLib.writeServerLog(lockCtx, {
        severity: 6,
        message: `[${LOG_MODULE}] upsertByContractId`,
        payload: { contractId: payload.contract_id, mappingId: row.id, reused: Boolean(existing) }
      })
      return row
    }
  )
}

/** Найти маппинг по contractId (точное совпадение). */
export async function findByContractId(
  ctx: app.Ctx,
  contractId: string
): Promise<LavatopWebhookMappingRow | null> {
  return LavatopWebhookMapping.findOneBy(ctx, { contract_id: contractId })
}
