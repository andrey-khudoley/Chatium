// @shared

const BOOT_STATIC_READY = 'boot-static-ready'

/** Ожидание веб-шрифтов не дольше этого (мс), чтобы не зависнуть на «вечной» загрузке шрифта */
const FONT_READY_MAX_MS = 10000

function waitForFontsLoaded(): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.resolve()
  }
  const fonts = document.fonts
  if (!fonts || !fonts.ready) {
    return Promise.resolve()
  }
  return Promise.race([
    fonts.ready.then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, FONT_READY_MAX_MS))
  ])
}

/**
 * Статическая фаза прелоадера завершена (страница + шрифты по сигналу из preloader) — можно показывать шапку/подвал.
 */
export function subscribeBootStaticReady(cb: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }
  const w = window as Window & { bootStaticReady?: boolean }
  if (w.bootStaticReady) {
    queueMicrotask(cb)
    return () => {}
  }
  const handler = () => cb()
  window.addEventListener(BOOT_STATIC_READY, handler)
  return () => window.removeEventListener(BOOT_STATIC_READY, handler)
}

/**
 * После отрисовки Vue: шрифты, microtask, кадр — затем скрытие прелоадера (синхронно с реальной отрисовкой).
 */
export function scheduleHideBootLoader(): void {
  void runHideBootLoader()
}

async function runHideBootLoader() {
  await waitForFontsLoaded()
  await Promise.resolve()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
  const hide = (window as Window & { hideBootLoader?: () => void }).hideBootLoader
  if (hide) hide()
}
