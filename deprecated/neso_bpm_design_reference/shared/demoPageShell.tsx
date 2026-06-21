// @shared
import { jsx } from '@app/html-jsx'
import { getPageTitle } from '../config/project'
import { getThemePreset } from './themeCatalog'
import { getGlobalThemeStyles, getThemeStyleElementId } from './themeStyles'
import { getPreloaderStyles, getPreloaderScript } from './preloader'
import { getLogLevelScript } from './logLevel'

const DEFAULT_LOG_LEVEL = 'Info'

export type DemoTheme = 'dark' | 'light'

/** Контент для <head>: title, meta, токены темы, прелоадер, скрипты, шрифты. */
export function getDemoPageHead(
  theme: DemoTheme,
  pageTitle: string,
  projectName: string,
  logLevel: string = DEFAULT_LOG_LEVEL,
  themePresetId?: string
) {
  const fullTitle = getPageTitle(pageTitle, projectName)
  const preset = getThemePreset(theme, themePresetId)

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta charset="UTF-8" />
      <meta name="theme-color" content={preset.themeColor} />
      <script>{getLogLevelScript(logLevel)}</script>
      <script src="/s/metric/clarity.js"></script>
      <style id={getThemeStyleElementId()}>{getGlobalThemeStyles(theme, preset.id)}</style>
      <style>{getPreloaderStyles()}</style>
      <script>{getPreloaderScript(theme)}</script>
      <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
      <link rel="stylesheet" href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Mulish:ital,wght@0,200..1000;1,200..1000&family=Old+Standard+TT:ital,wght@0,400;0,700;1,400&display=swap"
        rel="stylesheet"
      />
    </>
  )
}

/** Разметка прелоадера (boot loader) для вставки в body. */
export function getBootLoaderDiv(theme: DemoTheme, projectName: string, themePresetId?: string) {
  const preset = getThemePreset(theme, themePresetId)

  return (
    <div
      id="boot-loader"
      data-theme={theme}
      data-theme-hint={theme}
      data-project-name={projectName}
      aria-live="polite"
      aria-busy="true"
    >
      <div class="boot-shell" role="status">
        <span class="boot-signal boot-signal--top" aria-hidden="true"></span>
        <span class="boot-signal boot-signal--bottom" aria-hidden="true"></span>
        <p class="boot-kicker">System Boot</p>
        <h1 class="boot-title">{projectName}</h1>
        <p class="boot-subtitle">Preparing BPM workspace...</p>
        <div class="boot-progress-track" aria-hidden="true">
          <span id="boot-progress-bar" class="boot-progress-bar"></span>
        </div>
        <div class="boot-meta">
          <span id="boot-status-text" class="boot-status-text">
            Building process control layers...
          </span>
          <span id="boot-progress-value" class="boot-progress-value">
            0%
          </span>
        </div>
        <div class="boot-theme-chip" id="boot-theme-pill">
          {preset.name}
        </div>
      </div>
    </div>
  )
}
