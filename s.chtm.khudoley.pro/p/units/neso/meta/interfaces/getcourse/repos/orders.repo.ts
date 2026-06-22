import { Orders, type OrdersRow } from '../tables/orders.table'

export async function findByOrderKey(ctx: app.Ctx, orderKey: string): Promise<OrdersRow | null> {
  return Orders.findOneBy(ctx, { orderKey })
}

export async function findByIdempotencyKey(
  ctx: app.Ctx,
  idempotencyKey: string
): Promise<OrdersRow | null> {
  return Orders.findOneBy(ctx, { idempotencyKey })
}

export async function findByGcDealId(ctx: app.Ctx, gcDealId: string): Promise<OrdersRow | null> {
  return Orders.findOneBy(ctx, { gcDealId })
}

export async function findByGcDealNumber(
  ctx: app.Ctx,
  gcDealNumber: string
): Promise<OrdersRow | null> {
  return Orders.findOneBy(ctx, { gcDealNumber })
}

export type OrdersUpsertInput = Partial<OrdersRow> & { orderKey: string }

export async function upsert(ctx: app.Ctx, data: OrdersUpsertInput): Promise<OrdersRow> {
  // @ts-ignore — Heap createOrUpdateBy не экспортирует точный тип входа
  return Orders.createOrUpdateBy(ctx, 'orderKey', data)
}
