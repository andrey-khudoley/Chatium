import { jsx } from '@app/html-jsx'
import WheelPage from './pages/WheelPage.vue'
import { getLogLevelForPage, getLogLevelScript } from './shared/logLevel'
import { wheelPageCss3 } from './pagecss/wheelPageCss3'
import { loadEffectiveSegments, type EffectiveSegment, type LoadedSegment } from './lib/wheel.lib'
import { getTheme, getWheelBrandLabel } from './lib/settings.lib'

/**
 * Глобальные @keyframes колеса (анимации применяются инлайн в WheelPage).
 * Повторяют дизайн-референс «Колесо удачи».
 */
const WHEEL_KEYFRAMES = `
  @keyframes spin-glow { 0%,100% { opacity: .55; } 50% { opacity: .9; } }
  @keyframes pointer-nudge { 0%,100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(3px); } }
  @keyframes confetti-fall { 0% { opacity: 0; transform: translate3d(0,-10px,0) rotate(0deg); } 8% { opacity: 1; } 100% { opacity: 0; transform: translate3d(var(--dx,0),112vh,0) rotate(900deg); } }
  @keyframes rise-in { 0% { opacity: 0; transform: translateY(22px); } 100% { opacity: 1; transform: translateY(0); } }
  @keyframes toast-in { 0% { opacity: 0; transform: translateY(10px) scale(.96); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes sheen { 0% { transform: translateX(-120%) skewX(-18deg); } 100% { transform: translateX(220%) skewX(-18deg); } }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
`

export const indexPageRoute = app.html('/', async (ctx) => {
  const logLevel = await getLogLevelForPage(ctx)

  // Эффективные сегменты (§16.1)
  const segResult = await loadEffectiveSegments(ctx)

  let segments: EffectiveSegment[] = []
  let nEff = 6
  let segmentsError = false
  let segmentsErrorMessage = ''

  if (segResult.success) {
    // Маппинг LoadedSegment → публичный EffectiveSegment: без id/maxWins/full/prizeOfferID (§11.5, §16.1)
    segments = segResult.segments.map((seg: LoadedSegment): EffectiveSegment => {
      const pub: EffectiveSegment = {
        order: seg.order,
        label: seg.label,
        weight: seg.weight
      }
      if (seg.isAutoRetry) {
        pub.isAutoRetry = true
      }
      if (seg.redirectUrl) {
        pub.redirectUrl = seg.redirectUrl
      }
      return pub
    })
    nEff = segResult.nEff
  } else {
    segmentsError = true
    segmentsErrorMessage = segResult.error
  }

  // Активная тема (§14.1) — id передаётся в WheelPage, который применяет тему инлайн
  const themeId = await getTheme(ctx)
  // Подпись бренда (настраивается в админке, §9)
  const brandLabel = await getWheelBrandLabel(ctx)

  return (
    <html lang="ru">
      <head>
        <title>Колесо удачи</title>
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
        <style>{wheelPageCss3}</style>
      </head>
      <body>
        <WheelPage
          segments={segments}
          nEff={nEff}
          segmentsError={segmentsError}
          segmentsErrorMessage={segmentsErrorMessage}
          themeId={themeId}
          brandLabel={brandLabel}
        />
      </body>
    </html>
  )
})

export default indexPageRoute
