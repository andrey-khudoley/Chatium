// @shared-route
import { requireAnyUser } from '@app/auth'
import type { FingerprintData } from '../../../lib/core/fingerprint'
import * as loggerLib from '../../../lib/logger.lib'
import * as campaignRepo from '../../../lib/repo/campaignRepo'
import * as pageRepo from '../../../lib/repo/pageRepo'
import * as linkRepo from '../../../lib/repo/linkRepo'
import * as visitRepo from '../../../lib/repo/visitRepo'
import * as eventRepo from '../../../lib/repo/eventRepo'
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

const LOG_PATH = 'api/tests/endpoints-check/event-repo'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

const TEST_FINGERPRINT: FingerprintData = {
  ip: '127.0.0.1',
  userAgent: 'event-repo-test/1',
  acceptLanguage: 'ru-RU',
  platform: 'Linux',
  timezone: 'Europe/Moscow'
}

/**
 * GET /api/tests/endpoints-check/event-repo — тесты eventRepo (processRegistration, processOrder, processPayment).
 */
export const eventRepoTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const userId = ctx.user?.id
  if (typeof userId !== 'string') {
    return { success: false, error: 'Нет пользователя в контексте', results: [], at: Date.now() }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки eventRepo`,
    payload: {}
  })

  const results: TestResult[] = []
  let campaignId: string | null = null
  let partnerId: string | null = null
  let pageId: string | null = null
  let partnerLinkId: string | null = null
  let testRef: string | null = null

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
        tgId: 'test-tg-event-' + Date.now(),
        username: 'test_event_user',
        fullName: 'Test Event Partner',
        stats: null
      })
      partnerId = partner?.id ?? null

      const page = await pageRepo.createPage(ctx, {
        campaignId,
        title: `[${LOG_PATH}] Тестовая страница`,
        urlTemplate: 'https://example.com?ref={ref}'
      })
      pageId = page?.id ?? null

      if (!partnerId || !pageId) {
        pushSkipped(results, !partnerId ? 'Партнёр не создан' : 'Страница не создана')
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
            const r1 = await eventRepo.processRegistration(ctx, campaignId, {
              ref: testRef,
              name: 'Event Test User',
              email: 'event@test.example',
              rawPayload: { test: true }
            })
            const regOk = r1.success && r1.isNew
            results.push({
              id: 'processRegistration-new',
              title: 'processRegistration (новый)',
              passed: regOk
            })
            if (!regOk) {
              results[results.length - 1].error = `success=${r1.success}, isNew=${r1.isNew}`
            }
          } catch (e) {
            results.push({
              id: 'processRegistration-new',
              title: 'processRegistration (новый)',
              passed: false,
              error: (e as Error)?.message ?? String(e)
            })
          }

          try {
            const r2 = await eventRepo.processRegistration(ctx, campaignId, {
              ref: testRef,
              phone: '+79001112233',
              rawPayload: {}
            })
            const idemOk = r2.success && !r2.isNew
            results.push({
              id: 'processRegistration-idempotent',
              title: 'processRegistration (идемпотентность)',
              passed: idemOk
            })
            if (!idemOk) {
              results[results.length - 1].error = `ожидался isNew=false, получено isNew=${r2.isNew}`
            }
          } catch (e) {
            results.push({
              id: 'processRegistration-idempotent',
              title: 'processRegistration (идемпотентность)',
              passed: false,
              error: (e as Error)?.message ?? String(e)
            })
          }

          const orderId = 'order-event-test-' + Date.now()
          try {
            const o1 = await eventRepo.processOrder(ctx, campaignId, {
              ref: testRef,
              orderId,
              productName: 'Test Product',
              orderSum: 50000,
              rawPayload: {}
            })
            const orderOk = o1.success && o1.isNew
            results.push({
              id: 'processOrder-new',
              title: 'processOrder (новый заказ)',
              passed: orderOk
            })
            if (!orderOk) {
              results[results.length - 1].error = `success=${o1.success}, isNew=${o1.isNew}`
            }
          } catch (e) {
            results.push({
              id: 'processOrder-new',
              title: 'processOrder (новый заказ)',
              passed: false,
              error: (e as Error)?.message ?? String(e)
            })
          }

          try {
            const o2 = await eventRepo.processOrder(ctx, campaignId, {
              ref: testRef,
              orderId,
              productName: 'Test Product 2',
              orderSum: 100,
              rawPayload: {}
            })
            const orderIdemOk = o2.success && !o2.isNew
            results.push({
              id: 'processOrder-idempotent',
              title: 'processOrder (идемпотентность)',
              passed: orderIdemOk
            })
            if (!orderIdemOk) {
              results[results.length - 1].error = `ожидался isNew=false, получено isNew=${o2.isNew}`
            }
          } catch (e) {
            results.push({
              id: 'processOrder-idempotent',
              title: 'processOrder (идемпотентность)',
              passed: false,
              error: (e as Error)?.message ?? String(e)
            })
          }

          try {
            const p1 = await eventRepo.processPayment(ctx, campaignId, {
              ref: testRef,
              orderId,
              paymentSum: 50000,
              rawPayload: {}
            })
            const payOk = p1.success && p1.isNew
            results.push({
              id: 'processPayment-new',
              title: 'processPayment (новая оплата)',
              passed: payOk
            })
            if (!payOk) {
              results[results.length - 1].error = `success=${p1.success}, isNew=${p1.isNew}`
            }
          } catch (e) {
            results.push({
              id: 'processPayment-new',
              title: 'processPayment (новая оплата)',
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

  return { success: true, test: 'event-repo', results, at: Date.now() }
})

function pushSkipped(results: TestResult[], reason: string): void {
  const ids = [
    'processRegistration-new',
    'processRegistration-idempotent',
    'processOrder-new',
    'processOrder-idempotent',
    'processPayment-new'
  ]
  const titles: Record<string, string> = {
    'processRegistration-new': 'processRegistration (новый)',
    'processRegistration-idempotent': 'processRegistration (идемпотентность)',
    'processOrder-new': 'processOrder (новый заказ)',
    'processOrder-idempotent': 'processOrder (идемпотентность)',
    'processPayment-new': 'processPayment (новая оплата)'
  }
  for (const id of ids) {
    results.push({ id, title: titles[id], passed: false, error: reason })
  }
}
