/**
 * Репозиторий страниц (pages).
 * createPage — создание; getPageById, getCampaignPages, findPageBySecret — чтение.
 */

import { generateCampaignSecret } from '../core/refGenerator'
import Pages from '../../tables/pages.table'

export interface CreatePageInput {
  campaignId: string
  title: string
  urlTemplate: string
}

/**
 * Создаёт целевую страницу кампании с URL-шаблоном (плейсхолдер {ref}) и генерирует webhookSecret.
 */
export async function createPage(ctx: app.Ctx, input: CreatePageInput): Promise<typeof Pages.T> {
  const webhookSecret = generateCampaignSecret()
  return Pages.create(ctx, {
    campaignId: input.campaignId,
    title: input.title,
    urlTemplate: input.urlTemplate,
    webhookSecret
  })
}

/**
 * Возвращает страницу по id или null.
 */
export async function getPageById(ctx: app.Ctx, pageId: string): Promise<typeof Pages.T | null> {
  return Pages.findById(ctx, pageId)
}

/**
 * Возвращает страницу по webhook secret (для webhook-хуков).
 */
export async function findPageBySecret(ctx: app.Ctx, key: string): Promise<typeof Pages.T | null> {
  return Pages.findOneBy(ctx, { webhookSecret: key })
}

/**
 * Возвращает список страниц кампании.
 */
export async function getCampaignPages(
  ctx: app.Ctx,
  campaignId: string
): Promise<Array<typeof Pages.T>> {
  return Pages.findAll(ctx, {
    where: { campaignId },
    limit: 1000
  })
}

export interface UpdatePageInput {
  title?: string
  urlTemplate?: string
}

/**
 * Обновляет страницу по id.
 */
export async function updatePage(
  ctx: app.Ctx,
  pageId: string,
  input: UpdatePageInput
): Promise<typeof Pages.T | null> {
  const page = await Pages.findById(ctx, pageId)
  if (!page) return null
  const patch: { title?: string; urlTemplate?: string } = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.urlTemplate !== undefined) patch.urlTemplate = input.urlTemplate
  const updated = await Pages.update(ctx, { id: pageId, ...patch })
  return updated as typeof Pages.T | null
}

/**
 * Удаляет страницу по id.
 */
export async function deletePage(ctx: app.Ctx, pageId: string): Promise<boolean> {
  const page = await Pages.findById(ctx, pageId)
  if (!page) return false
  await Pages.delete(ctx, pageId)
  return true
}
