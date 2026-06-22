import { CheckoutRequests, type CheckoutRequestsRow } from '../tables/checkoutRequests.table'

export async function findByRequestKey(
  ctx: app.Ctx,
  requestKey: string
): Promise<CheckoutRequestsRow | null> {
  return CheckoutRequests.findOneBy(ctx, { requestKey })
}

export async function findByIdempotencyKey(
  ctx: app.Ctx,
  idempotencyKey: string
): Promise<CheckoutRequestsRow | null> {
  return CheckoutRequests.findOneBy(ctx, { idempotencyKey })
}

export type CheckoutRequestsUpsertInput = Partial<CheckoutRequestsRow> & { requestKey: string }

export async function upsert(
  ctx: app.Ctx,
  data: CheckoutRequestsUpsertInput
): Promise<CheckoutRequestsRow> {
  // @ts-ignore — Heap createOrUpdateBy не экспортирует точный тип входа
  return CheckoutRequests.createOrUpdateBy(ctx, 'requestKey', data)
}
