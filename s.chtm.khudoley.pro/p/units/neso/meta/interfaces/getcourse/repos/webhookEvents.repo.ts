import { WebhookEvents, type WebhookEventsRow } from '../tables/webhookEvents.table'

export async function findByWebhookId(
  ctx: app.Ctx,
  webhookId: string
): Promise<WebhookEventsRow | null> {
  return WebhookEvents.findOneBy(ctx, { webhookId })
}

export type WebhookEventsUpsertInput = Partial<WebhookEventsRow> & { webhookId: string }

export async function upsert(
  ctx: app.Ctx,
  data: WebhookEventsUpsertInput
): Promise<WebhookEventsRow> {
  // @ts-ignore — Heap createOrUpdateBy не экспортирует точный тип входа
  return WebhookEvents.createOrUpdateBy(ctx, 'webhookId', data)
}
