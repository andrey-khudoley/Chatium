import { FormsTable } from '../tables/forms.table'
import { getGcSettings, normalizeSchoolHost } from '../lib/settings/gcSettings'
import { mapSubmitToParams } from '../lib/submit/mapParams'
import { createDealProto } from '../lib/gc/createDeal'
import type { OfferSnapshot } from '../lib/form/types'

type SubmitResponsePayload = { ok: true; redirectUrl: string } | { ok: false; error: string }

/**
 * CORS-конверт (дельта 3 плана) — ОБЯЗАТЕЛЬНО оборачивает КАЖДЫЙ return (happy +
 * все ошибки + тихая деградация), иначе внешний домен не прочитает тело ошибки
 * (§5.2 спеки — ACAO: * на всех ветках, эндпоинт публичный, без credentials).
 */
function corsJson(payload: SubmitResponsePayload) {
  return {
    statusCode: 200,
    rawHttpBody: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  }
}

/**
 * Публичный эндпоинт отправки формы (§5.2 спеки). Тело — x-www-form-urlencoded
 * (simple request, дельта 2), ответ — JSON. Валидация → поиск формы → проверка
 * offerId → настройки GC → маппинг → вызов GC (волна 1, прямой) → редирект.
 */
export const submitFormRoute = app
  .post('/')
  .body((s) => ({
    // Все поля .optional() (fix-цикл ревью, п.2): отказ схемы на обязательном
    // поле отвечает БЕЗ CORS-заголовка (валидация — до handler, мимо corsJson).
    // Непустота проверяется вручную внутри handler и уходит через corsJson.
    slug: s.string().optional(),
    offerId: s.string().optional(),
    name: s.string().optional(),
    email: s.string().optional(),
    phone: s.string().optional(),
    utmSource: s.string().optional(),
    utmMedium: s.string().optional(),
    utmCampaign: s.string().optional(),
    utmContent: s.string().optional(),
    utmTerm: s.string().optional()
  }))
  .handle(async (ctx, req) => {
    const { slug, offerId, name, email, phone } = req.body

    ctx.account.log('form-gen: submit.received', {
      level: 'debug',
      json: { slug, hasName: !!name, hasEmail: !!email, hasPhone: !!phone }
    })

    if (!slug || !offerId || !name || !email || !phone) {
      ctx.account.log('form-gen: submit.validation_failed', {
        level: 'warn',
        json: { slug: slug ?? null }
      })
      return corsJson({ ok: false, error: 'VALIDATION_FAILED' })
    }

    const form = await FormsTable.findOneBy(ctx, { slug })
    if (!form) {
      // Тихая деградация (§2 п.1 спеки) — удалённый/несуществующий formID.
      ctx.account.log('form-gen: submit.form_not_found', { level: 'warn', json: { slug } })
      return corsJson({ ok: false, error: 'FORM_NOT_FOUND' })
    }

    const offers = (form.offers ?? []) as OfferSnapshot[]
    const selectedOffer = offers.find((offer) => offer.offerId === offerId)
    if (!selectedOffer) {
      ctx.account.log('form-gen: submit.offer_not_in_form', {
        level: 'warn',
        json: { slug, offerId }
      })
      return corsJson({ ok: false, error: 'OFFER_NOT_IN_FORM' })
    }

    const gcSettings = await getGcSettings(ctx)
    if (!gcSettings.schoolUrl || !gcSettings.schoolKey) {
      ctx.account.log('form-gen: submit.settings_missing', { level: 'error', json: { slug } })
      return corsJson({ ok: false, error: 'SETTINGS_MISSING' })
    }

    const params = mapSubmitToParams({
      name,
      email,
      phone,
      offerId,
      // Цена — из серверного снимка выбранного оффера (§3.1), не с клиента.
      price: selectedOffer.price,
      utm: {
        utmSource: req.body.utmSource,
        utmMedium: req.body.utmMedium,
        utmCampaign: req.body.utmCampaign,
        utmContent: req.body.utmContent,
        utmTerm: req.body.utmTerm
      }
    })

    const gcResult = await createDealProto(ctx, {
      host: normalizeSchoolHost(gcSettings.schoolUrl),
      schoolKey: gcSettings.schoolKey,
      paramsPayload: params
    })

    if (!gcResult.ok) {
      ctx.account.log('form-gen: submit.gc_failed', {
        level: 'error',
        json: { slug, error: gcResult.error }
      })
      return corsJson({ ok: false, error: gcResult.error })
    }

    ctx.account.log('form-gen: submit.ok', { level: 'info', json: { slug, offerId } })
    return corsJson({ ok: true, redirectUrl: gcResult.redirectUrl })
  })
