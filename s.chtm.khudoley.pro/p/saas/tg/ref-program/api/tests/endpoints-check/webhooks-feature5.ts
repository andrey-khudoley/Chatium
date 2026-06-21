// @shared-route
import { requireAnyUser } from '@app/auth'
import { request } from '@app/request'
import { getBaseUrl, getFullUrl } from '../../../config/routes'
import type { FingerprintData } from '../../../lib/core/fingerprint'
import * as loggerLib from '../../../lib/logger.lib'
import * as campaignRepo from '../../../lib/repo/campaignRepo'
import * as pageRepo from '../../../lib/repo/pageRepo'
import * as linkRepo from '../../../lib/repo/linkRepo'
import * as visitRepo from '../../../lib/repo/visitRepo'
import Campaigns from '../../../tables/campaigns.table'
import CampaignMembers from '../../../tables/campaign_members.table'
import Partners from '../../../tables/partners.table'
import Pages from '../../../tables/pages.table'
import PartnerLinks from '../../../tables/partner_links.table'
import Visits from '../../../tables/visits.table'
import Referrals from '../../../tables/referrals.table'
import Registrations from '../../../tables/registrations.table'
import Orders from '../../../tables/orders.table'
import Payments from '../../../tables/payments.table'

const LOG_PATH = 'api/tests/endpoints-check/webhooks-feature5'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

const TEST_FINGERPRINT: FingerprintData = {
  ip: '127.0.0.1',
  userAgent: 'webhooks-feature5-test/1',
  acceptLanguage: 'ru-RU',
  platform: 'Linux',
  timezone: 'Europe/Moscow'
}

function hookRegisterUrl(): string {
  return getBaseUrl() + getFullUrl('hook/register')
}

function hookOrderUrl(): string {
  return getBaseUrl() + getFullUrl('hook/order')
}

function hookPaymentUrl(): string {
  return getBaseUrl() + getFullUrl('hook/payment')
}

/**
 * GET /api/tests/endpoints-check/webhooks-feature5 — тесты webhook'ов фичи 5 (POST hook/register, hook/order, hook/payment).
 */
export const webhooksFeature5TestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const userId = ctx.user?.id
  if (typeof userId !== 'string') {
    return { success: false, error: 'Нет пользователя в контексте', results: [], at: Date.now() }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки webhooks фичи 5`,
    payload: {}
  })

  const results: TestResult[] = []
  let campaignId: string | null = null
  let partnerId: string | null = null
  let pageId: string | null = null
  let partnerLinkId: string | null = null
  let testRef: string | null = null
  let key: string | null = null

  try {
    const campaign = await campaignRepo.createCampaign(ctx, {
      title: `[${LOG_PATH}] Тестовая кампания`,
      ownerUserId: userId
    })
    campaignId = campaign?.id ?? null

    if (!campaignId) {
      pushSkipped(results, 'Кампания не создана')
    } else {
      const partner = await Partners.create(ctx, {
        campaignId,
        tgId: 'test-tg-webhook-' + Date.now(),
        username: 'test_webhook_user',
        fullName: 'Test Webhook Partner',
        stats: null
      })
      partnerId = partner?.id ?? null

      const page = await pageRepo.createPage(ctx, {
        campaignId,
        title: `[${LOG_PATH}] Тестовая страница`,
        urlTemplate: 'https://example.com?ref={ref}'
      })
      pageId = page?.id ?? null
      key = page?.webhookSecret ?? null

      if (!partnerId || !pageId || !key) {
        pushSkipped(
          results,
          !partnerId
            ? 'Партнёр не создан'
            : !pageId
              ? 'Страница не создана'
              : 'Нет webhookSecret у страницы'
        )
      } else {
        const link = await linkRepo.getOrCreatePartnerLink(ctx, campaignId, partnerId, pageId)
        partnerLinkId = link?.id ?? null

        if (!partnerLinkId) {
          pushSkipped(results, 'Партнёрская ссылка не создана')
        } else {
          const visitResult = await visitRepo.createVisit(ctx, {
            campaignId,
            partnerLinkId,
            partnerId,
            pageId,
            fingerprint: TEST_FINGERPRINT
          })
          testRef = visitResult.ref

          try {
            const res = await request({
              url: hookRegisterUrl(),
              method: 'post',
              json: {
                key,
                ref: testRef,
                name: 'Webhook Test User',
                email: 'webhook@test.example'
              },
              responseType: 'json',
              throwHttpErrors: false
            } as unknown as Parameters<typeof request>[0])
            const body = res.body as { success?: boolean; error?: string } | undefined
            const passed = body?.success === true
            results.push({
              id: 'hook-register',
              title: 'POST hook/register → success',
              passed,
              error: passed ? undefined : (body?.error ?? `status=${res.statusCode}`)
            })
          } catch (e) {
            results.push({
              id: 'hook-register',
              title: 'POST hook/register → success',
              passed: false,
              error: (e as Error)?.message ?? String(e)
            })
          }

          const orderId = 'order-webhook-test-' + Date.now()
          try {
            const res = await request({
              url: hookOrderUrl(),
              method: 'post',
              json: {
                key,
                ref: testRef,
                order_id: orderId,
                product_name: 'Webhook Test Product',
                order_sum: 300
              },
              responseType: 'json',
              throwHttpErrors: false
            } as unknown as Parameters<typeof request>[0])
            const body = res.body as { success?: boolean; error?: string } | undefined
            const passed = body?.success === true
            results.push({
              id: 'hook-order',
              title: 'POST hook/order → success',
              passed,
              error: passed ? undefined : (body?.error ?? `status=${res.statusCode}`)
            })
          } catch (e) {
            results.push({
              id: 'hook-order',
              title: 'POST hook/order → success',
              passed: false,
              error: (e as Error)?.message ?? String(e)
            })
          }

          try {
            const res = await request({
              url: hookPaymentUrl(),
              method: 'post',
              json: {
                key,
                ref: testRef,
                order_id: orderId,
                payment_sum: 300
              },
              responseType: 'json',
              throwHttpErrors: false
            } as unknown as Parameters<typeof request>[0])
            const body = res.body as { success?: boolean; error?: string } | undefined
            const passed = body?.success === true
            results.push({
              id: 'hook-payment',
              title: 'POST hook/payment → success',
              passed,
              error: passed ? undefined : (body?.error ?? `status=${res.statusCode}`)
            })
          } catch (e) {
            results.push({
              id: 'hook-payment',
              title: 'POST hook/payment → success',
              passed: false,
              error: (e as Error)?.message ?? String(e)
            })
          }
        }
      }
    }
  } finally {
    if (campaignId) {
      const regs = await Registrations.findAll(ctx, { where: { campaignId }, limit: 100 })
      for (const r of regs) {
        try {
          await Registrations.delete(ctx, r.id)
        } catch (_) {}
      }
      const ords = await Orders.findAll(ctx, { where: { campaignId }, limit: 100 })
      for (const o of ords) {
        try {
          await Orders.delete(ctx, o.id)
        } catch (_) {}
      }
      const pays = await Payments.findAll(ctx, { where: { campaignId }, limit: 100 })
      for (const p of pays) {
        try {
          await Payments.delete(ctx, p.id)
        } catch (_) {}
      }
      const refs = await Referrals.findAll(ctx, { where: { campaignId }, limit: 100 })
      for (const r of refs) {
        try {
          await Referrals.delete(ctx, r.id)
        } catch (_) {}
      }
      const visits = await Visits.findAll(ctx, { where: { campaignId }, limit: 500 })
      for (const v of visits) {
        try {
          await Visits.delete(ctx, v.id)
        } catch (_) {}
      }
      const links = await PartnerLinks.findAll(ctx, { where: { campaignId }, limit: 100 })
      for (const l of links) {
        try {
          await PartnerLinks.delete(ctx, l.id)
        } catch (_) {}
      }
      const pages = await Pages.findAll(ctx, { where: { campaignId }, limit: 100 })
      for (const p of pages) {
        try {
          await Pages.delete(ctx, p.id)
        } catch (_) {}
      }
      if (partnerId) {
        try {
          await Partners.delete(ctx, partnerId)
        } catch (_) {}
      }
      const members = await CampaignMembers.findAll(ctx, {
        where: { campaignId },
        limit: 100
      })
      for (const m of members) {
        try {
          await CampaignMembers.delete(ctx, m.id)
        } catch (_) {}
      }
      try {
        await Campaigns.delete(ctx, campaignId)
      } catch (_) {}
    }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Итог: ${results.filter((r) => r.passed).length}/${results.length} тестов пройдено`,
    payload: { results: results.map((r) => ({ id: r.id, passed: r.passed, error: r.error })) }
  })

  return { success: true, test: 'webhooks-feature5', results, at: Date.now() }
})

function pushSkipped(results: TestResult[], reason: string): void {
  const ids = ['hook-register', 'hook-order', 'hook-payment']
  const titles: Record<string, string> = {
    'hook-register': 'POST hook/register → success',
    'hook-order': 'POST hook/order → success',
    'hook-payment': 'POST hook/payment → success'
  }
  for (const id of ids) {
    results.push({ id, title: titles[id], passed: false, error: reason })
  }
}
