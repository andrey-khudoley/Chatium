import { jsx } from '@app/html-jsx'
import { SITE_CSS } from './shared/styles'
import { TARIFFS, CURRENCY, HERO, TARIFF_CTA_HREF, Tariff } from './shared/pricing'

/**
 * Корневой роут проекта chatium-price.
 *
 * Единственная задача проекта — показать прайс-лист. Страница полностью
 * статическая (интерактива нет), поэтому рендерится на сервере как обычный
 * HTML через @app/html-jsx — без Vue и клиентского бандла. Данные тарифов и
 * CSS вынесены в shared/, вёрстка их не хардкодит.
 *
 * Дизайн снят с chatium.ru/pricing; тарифы — из актуального макета.
 */

/** Карточка одного тарифа. */
function TariffCard(t: Tariff) {
  return (
    <div class={t.featured ? 'card card--featured' : 'card'}>
      <h2 class="card__name">{t.name}</h2>

      <div class="price">
        <span class="price__now">
          {t.price} {CURRENCY}
        </span>
        {t.oldPrice ? (
          <span class="price__old">
            {t.oldPrice} {CURRENCY}
          </span>
        ) : null}
        <span class="price__period">{t.period}</span>
      </div>

      <a
        href={TARIFF_CTA_HREF}
        class={t.ctaVariant === 'primary' ? 'cta cta--primary' : 'cta cta--secondary'}
      >
        {t.ctaLabel}
      </a>

      <ul class="features">
        {t.features.map((f) => (
          <li>
            <span class="features__check">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export const indexPageRoute = app.html('/', async (ctx) => {
  ctx.account.log('[chatium-price] рендер прайс-листа: ' + TARIFFS.length + ' тариф(ов)')

  const year = new Date().getFullYear()

  return (
    <html lang="ru">
      <head>
        <title>Тарифы Chatium</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <style>{SITE_CSS}</style>
      </head>
      <body>
        <main class="wrap">
          <header class="head">
            <p class="promo">
              <span class="promo__dot"></span>
              {HERO.promo}
            </p>
            <h1 class="head__title">{HERO.title}</h1>
            <p class="head__subtitle">{HERO.subtitle}</p>
            <div class="head__cta">
              <a href={HERO.primaryHref} class="btn btn--primary">
                {HERO.primaryCta}
              </a>
              <a href={HERO.secondaryHref} class="btn btn--ghost">
                {HERO.secondaryCta}
              </a>
            </div>
          </header>

          <section class="grid">
            {TARIFFS.map((t) => (
              <TariffCard {...t} />
            ))}
          </section>
        </main>

        <footer class="foot">
          <p class="foot__copy">© 2019–{year} · Сделано на Chatium</p>
        </footer>
      </body>
    </html>
  )
})

export default indexPageRoute
