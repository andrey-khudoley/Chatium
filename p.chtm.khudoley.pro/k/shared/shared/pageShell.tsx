// @shared
import { jsx } from '@app/html-jsx'
import * as settingsLib from '../lib/settings.lib'
import { commonStyles, themeBootstrapScript } from '../styles'

export type KnowledgeTheme = 'light' | 'dark'

export interface SsrDocListItem {
  key: string
  size: number
  lastModified: string
}

export function normalizeInstructionQuery(raw: unknown, fallbackRaw?: unknown): string {
  const source = typeof raw === 'string' && raw.trim().length > 0
    ? raw
    : (typeof fallbackRaw === 'string' ? fallbackRaw : '')

  if (!source) return 'shared'

  const value = source.trim().toLowerCase()
  return /^[a-z0-9_-]+$/.test(value) ? value : 'shared'
}

export function isTruthyQuery(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true'
}

export async function getDefaultTheme(ctx: any): Promise<KnowledgeTheme> {
  try {
    return await settingsLib.getDefaultTheme(ctx)
  } catch {
    return 'dark'
  }
}

export const getHeadContent = (title: string, defaultTheme: KnowledgeTheme) => (
  <>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta charset="UTF-8" />
    <title>{title}</title>

    <link rel="stylesheet" href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
    <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js"></script>

    <script>{`window.__DEFAULT_THEME__ = '${defaultTheme}'`}</script>
    <script>{themeBootstrapScript}</script>
    <style>{commonStyles}</style>
  </>
)
