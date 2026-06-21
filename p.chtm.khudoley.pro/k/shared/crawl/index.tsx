// @shared
import { jsx } from '@app/html-jsx'
import { parseInstructions, stripInstructions } from '../shared/instructionParser'
import { renderMarkdownToHtml } from '../shared/markdownRenderer'
import { normalizeInstructionQuery } from '../shared/pageShell'
import { getDocRoute } from '../api/docs'
import { docViewRoute } from '../view'
import {
  ensureCacheWarm,
  isTruthyQuery,
  listCacheRows,
  normalizeInstructions,
  syncCacheFromSource,
  toListItem
} from '../lib/docs.lib'

interface CrawlDocItem {
  key: string
  size: number
  lastModified: string
  html: string
}

function buildViewUrl(filename: string): string {
  try {
    return docViewRoute.query({ f: filename }).url() ?? `./?f=${encodeURIComponent(filename)}`
  } catch {
    return `./?f=${encodeURIComponent(filename)}`
  }
}

function removeLinks(html: string): string {
  // Crawl page should only link to article pages, so strip links from markdown body.
  return html.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
}

function toReadableDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toISOString()
}

function getPageStyles(): string {
  return `
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f7f7f7;
      color: #181818;
      font: 16px/1.55 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    main {
      width: min(1100px, 100%);
      margin: 0 auto;
      padding: 24px 18px 56px;
    }
    .header {
      margin-bottom: 16px;
      padding: 18px;
      background: #fff;
      border: 1px solid #e3e3e3;
      border-radius: 12px;
    }
    .header h1 {
      margin: 0 0 8px;
      font-size: 28px;
      line-height: 1.2;
    }
    .meta {
      margin: 0;
      color: #5c5c5c;
      font-size: 14px;
    }
    .error {
      margin: 0 0 16px;
      padding: 12px 14px;
      border: 1px solid #e9b5b5;
      border-radius: 10px;
      background: #fff1f1;
      color: #8a1f1f;
    }
    .doc {
      margin: 0 0 16px;
      padding: 16px;
      border: 1px solid #dfdfdf;
      border-radius: 12px;
      background: #fff;
    }
    .doc h2 {
      margin: 0 0 8px;
      font-size: 22px;
      line-height: 1.25;
    }
    .doc h2 a {
      color: #0a5eb0;
      text-decoration: none;
    }
    .doc h2 a:hover {
      text-decoration: underline;
    }
    .doc-meta {
      margin: 0 0 12px;
      color: #666;
      font-size: 13px;
    }
    .doc-body h1, .doc-body h2, .doc-body h3, .doc-body h4, .doc-body h5, .doc-body h6 {
      line-height: 1.25;
      margin: 0.9em 0 0.5em;
    }
    .doc-body p, .doc-body ul, .doc-body ol, .doc-body pre, .doc-body blockquote {
      margin: 0 0 0.9em;
    }
    .doc-body pre {
      overflow: auto;
      padding: 10px;
      border-radius: 8px;
      background: #f4f4f4;
    }
    .doc-body code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: #f4f4f4;
      padding: 0.1em 0.3em;
      border-radius: 5px;
    }
    @media (max-width: 720px) {
      .header h1 { font-size: 24px; }
      .doc h2 { font-size: 20px; }
    }
  `
}

export const crawlPageRoute = app.get('/', async (ctx, req) => {
  const instruction = normalizeInstructionQuery(req.query.s, req.query.instruction)
  const refresh = isTruthyQuery(req.query.refresh)

  const crawlDocs: CrawlDocItem[] = []
  let error = ''

  try {
    if (refresh) {
      await syncCacheFromSource(ctx)
    } else {
      await ensureCacheWarm(ctx)
    }

    const rows = await listCacheRows(ctx)
    const filteredRows = rows
      .map(row => ({
        row,
        listItem: toListItem(row)
      }))
      .filter(({ listItem }) => listItem.key.length > 0 && listItem.size > 0 && !listItem.key.endsWith('/'))
      .filter(({ row }) => {
        const parsedFromCache = normalizeInstructions(row.instructions)
        if (parsedFromCache.length > 0) {
          return parsedFromCache.includes(instruction)
        }

        const markdown = typeof row.markdown === 'string' ? row.markdown : ''
        return parseInstructions(markdown).includes(instruction)
      })
      .sort((a, b) => a.listItem.key.localeCompare(b.listItem.key))

    for (const { row, listItem } of filteredRows) {
      let markdown = typeof row.markdown === 'string' ? row.markdown : ''

      // Cache can contain metadata before body sync. Fill missing content on demand.
      if (!markdown) {
        const docResult = await getDocRoute.query({ filename: listItem.key }).run(ctx)
        if (docResult.success && typeof docResult.data === 'string') {
          markdown = docResult.data
        }
      }

      const html = await renderMarkdownToHtml(stripInstructions(markdown))

      crawlDocs.push({
        key: listItem.key,
        size: listItem.size,
        lastModified: listItem.lastModified,
        html: removeLinks(html)
      })
    }
  } catch (routeError) {
    error = String(routeError)
  }

  const now = new Date().toISOString()
  const title = instruction === 'shared'
    ? 'Knowledge Crawl'
    : `Knowledge Crawl @${instruction}`

  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <title>{title}</title>
        <meta name="robots" content="index,follow" />
        <style>{getPageStyles()}</style>
      </head>
      <body>
        <main>
          <header class="header">
            <h1>{title}</h1>
            <p class="meta">directive=@{instruction} | docs={crawlDocs.length} | generated={now}</p>
          </header>

          {error ? <p class="error">{error}</p> : null}

          {crawlDocs.map((doc) => (
            <article class="doc" id={`doc-${doc.key.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}`}>
              <h2><a href={buildViewUrl(doc.key)}>{doc.key}</a></h2>
              <p class="doc-meta">size={doc.size} bytes | updated={toReadableDate(doc.lastModified)}</p>
              <section class="doc-body" innerHTML={doc.html}></section>
            </article>
          ))}
        </main>
      </body>
    </html>
  )
})
