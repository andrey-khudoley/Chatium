// @shared
import type { ThemeMode } from './themeCatalog'
import { getThemePreset } from './themeCatalog'

function serializeTokens(tokens: Record<string, string>): string {
  return Object.entries(tokens)
    .map(([name, value]) => `    ${name}: ${value};`)
    .join('\n')
}

function buildThemeTokenStyles(theme: ThemeMode, presetId?: string): string {
  const preset = getThemePreset(theme, presetId)

  return `
  :root {
${serializeTokens(preset.tokens)}
    color-scheme: ${preset.mode};
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-height: 100vh;
    color: var(--text-primary);
    font-family: var(--font-sans);
    background:
      var(--gradient-ambient-top),
      var(--gradient-ambient-bottom),
      var(--gradient-app);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: var(--noise-opacity, 0.04);
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.18) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.14) 1px, transparent 1px);
    background-size: 96px 96px;
    mix-blend-mode: soft-light;
  }

  ::selection {
    background: var(--accent-soft);
    color: var(--text-primary);
  }
  `
}

const pageStyles = `
  html {
    margin: 0;
    background: var(--bg-primary, #05080a);
  }

  body {
    position: relative;
    overflow: hidden;
  }

  body.boot-complete {
    overflow-x: hidden;
    overflow-y: auto;
  }
`

const scrollbarStyles = `
  @supports not selector(::-webkit-scrollbar) {
    body,
    .dc-main {
      scrollbar-width: thin;
      scrollbar-color: var(--border-strong) transparent;
    }
  }

  body::-webkit-scrollbar,
  .dc-main::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  body::-webkit-scrollbar-track,
  .dc-main::-webkit-scrollbar-track {
    background: transparent;
  }

  body::-webkit-scrollbar-thumb,
  .dc-main::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--accent) 40%, transparent);
    border: 2px solid transparent;
    border-radius: 999px;
    background-clip: padding-box;
  }

  body::-webkit-scrollbar-thumb:hover,
  .dc-main::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, var(--accent) 58%, transparent);
    border: 2px solid transparent;
    background-clip: padding-box;
  }
`

const ID_THEME_GLOBAL = 'dc-theme-global'

/** Полный блок общих стилей страницы: токены темы, база html/body, скроллбар. */
export function getGlobalThemeStyles(theme: ThemeMode, presetId?: string): string {
  return [buildThemeTokenStyles(theme, presetId), pageStyles, scrollbarStyles].join('\n')
}

/** Id тега стилей, чтобы компонент не дублировал, если роут уже вставил стили. */
export function getThemeStyleElementId(): string {
  return ID_THEME_GLOBAL
}
