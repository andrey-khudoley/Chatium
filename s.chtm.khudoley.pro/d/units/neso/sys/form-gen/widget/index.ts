import { FormsTable } from '../tables/forms.table'
import { renderWidgetJs, renderNoopJs } from '../lib/widget/renderWidgetJs'
import { WIDGET_CSS } from '../lib/widget/styles'
import { DEFAULT_APPEARANCE } from '../config/constants'
import { submitAbsoluteUrl } from '../config/routes'
import type { OfferSnapshot, FormAppearance } from '../lib/form/types'

/**
 * Виджет-скрипт (§5.1 спеки): серверный роут `widget?form=<formID>`,
 * запечённый конфиг. Каталог назван `widget/` (без `.js`): sync-агент Chatium
 * отклоняет каталоги с расширением в имени («Directory name cannot end with .js»),
 * а `.js` в `<script src>` необязателен — URL-сегмент `widget` резолвится штатно.
 * Тихая деградация (§2 п.1) — удалённый/несуществующий formID → no-op JS, статус 200.
 */
export const widgetJsRoute = app
  .get('/')
  .query((s) => ({ form: s.string() }))
  .handle(async (ctx, req) => {
    const slug = req.query.form
    const form = await FormsTable.findOneBy(ctx, { slug })

    const body = form
      ? renderWidgetJs({
          slug,
          offers: (form.offers ?? []) as OfferSnapshot[],
          appearance: { ...DEFAULT_APPEARANCE, ...((form.appearance ?? {}) as FormAppearance) },
          submitUrl: submitAbsoluteUrl(),
          css: WIDGET_CSS
        })
      : renderNoopJs()

    ctx.account.log('form-gen: widget.served', {
      level: 'debug',
      json: { slug, mode: form ? 'form' : 'noop' }
    })

    return {
      statusCode: 200,
      rawHttpBody: body,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    }
  })
