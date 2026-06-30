// @shared
import { jsx } from '@app/html-jsx'
import WinnersPage from '../../pages/WinnersPage.vue'
import { getLogLevelForPage, getLogLevelScript } from '../../shared/logLevel'
import { getTheme, getWheelBrandLabel } from '../../lib/settings.lib'
import { maskEmail } from '../../lib/wheel.lib'
import * as spinsRepo from '../../repos/spins.repo'

/**
 * SSR route /web/winners — публичная таблица победителей в дизайне темы колеса.
 * Доступ: Guest (без auth). §6.6
 */

/**
 * Глобальные @keyframes для темы колеса (общие с index.tsx).
 * Winners страница использует тот же визуальный язык.
 */
const WHEEL_KEYFRAMES = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
`

export const winnersPageRoute = app.html('/', async (ctx) => {
  const logLevel = await getLogLevelForPage(ctx)

  // Первая порция победителей (§6.6: limit=50, offset=0)
  const rows = await spinsRepo.findRecent(ctx, 50, 0)

  // Маскируем email — полный email клиенту не передаётся (§16.10)
  const winners = rows.map((row) => ({
    emailMasked: maskEmail(row.email),
    prize: row.prize,
    timestamp: row.timestamp
  }))

  const hasMore = rows.length === 50

  // Активная тема и брендовая подпись (§14.1, §9)
  const themeId = await getTheme(ctx)
  const brandLabel = await getWheelBrandLabel(ctx)

  return (
    <html lang="ru">
      <head>
        <title>Список победителей</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <script>{getLogLevelScript(logLevel)}</script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Playfair+Display:wght@600;700&family=Fredoka:wght@500;600&family=Unbounded:wght@500;700&family=Russo+One&family=Montserrat:wght@600;700&family=Manrope:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script src="/s/metric/clarity.js"></script>
        <style>{WHEEL_KEYFRAMES}</style>
      </head>
      <body>
        <WinnersPage
          winners={winners}
          hasMore={hasMore}
          themeId={themeId}
          brandLabel={brandLabel}
        />
      </body>
    </html>
  )
})

export default winnersPageRoute
