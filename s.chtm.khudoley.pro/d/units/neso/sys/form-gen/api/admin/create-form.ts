import { requireAccountRole } from '@app/auth'
import { FormsTable } from '../../tables/forms.table'
import { generateFormSlug } from '../../lib/form/slug'
import { widgetAbsoluteUrl } from '../../config/routes'

/**
 * Создание формы — генератор сниппетов (§5.3 спеки). Мультиофферная (дельта 7
 * плана): offers — массив `{offerId,title,price,currency}` (s.array(s.object(...)) —
 * подтверждённый платформенный синтаксис, deprecated/imported/tg-copy/api/chats.ts).
 * Вызывается из AdminPage.vue через fetch (same-origin) — не `.run()`.
 */
export const createFormRoute = app
  .post('/')
  .body((s) => ({
    offers: s.array(
      s.object({
        offerId: s.string(),
        title: s.string(),
        price: s.string(),
        currency: s.string()
      })
    )
  }))
  .handle(async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const offers = req.body.offers.filter((offer) => offer.offerId && offer.title)
    if (offers.length === 0) {
      ctx.account.log('form-gen: form.create_no_offers', {
        level: 'warn',
        json: { reason: 'no_valid_offers', inputCount: req.body.offers.length }
      })
      return { ok: false, error: 'NO_OFFERS' }
    }

    const slug = generateFormSlug()
    await FormsTable.create(ctx, {
      slug,
      offers,
      appearance: {}
    })

    ctx.account.log('form-gen: form.created', {
      level: 'info',
      json: { slug, offerCount: offers.length }
    })

    return {
      ok: true,
      slug,
      scriptSnippet: `<script src="${widgetAbsoluteUrl(slug)}" async></script>`,
      divSnippet: `<div id="${slug}"></div>`
    }
  })
