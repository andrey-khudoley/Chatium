// @shared
/**
 * JSX-страницы системы доступа (ADR 0003, §1.11.4/§1.11.6):
 * «ссылка недействительна / уже использована», 403 и т.п.
 *
 * Возвращает JSX.SingleElement для возврата из app.html-роута. Статус (410/403/400)
 * выставляется на стороне роута через `ctx.resp.setStatusCode(n)`. Стиль — тёмный
 * монохром-терминал (Share Tech Mono, акцент #d3234b), самодостаточный, без SSR Vue.
 */

import { jsx } from '@app/html-jsx'

export type AccessPageAction = {
  label: string
  /** Ссылка для перехода. */
  href?: string
  /** Если задано — кнопка отправляет POST на этот URL (например /s/auth/sign-out). */
  postUrl?: string
  primary?: boolean
}

export type AccessMessagePageProps = {
  title: string
  heading: string
  paragraphs: string[]
  actions?: AccessPageAction[]
}

const ACCESS_PAGE_STYLES = `
  :root {
    --bg: #0a0a0a; --panel: #141414; --border: #2a2a2a;
    --text: #e8e8e8; --muted: #a0a0a0; --accent: #d3234b; --accent-hover: #e6395f;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; background: var(--bg); color: var(--text);
    font-family: 'Share Tech Mono', 'Courier New', monospace; letter-spacing: 0.03em;
    display: flex; align-items: center; justify-content: center; padding: 24px;
  }
  .card {
    max-width: 560px; width: 100%; background: var(--panel);
    border: 1px solid var(--border); border-radius: 4px; padding: 32px;
  }
  h1 { font-size: 22px; margin: 0 0 16px; color: var(--accent); }
  .msg { color: var(--muted); line-height: 1.6; margin: 0 0 12px; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
  .btn {
    display: inline-block; padding: 10px 18px; border: 1px solid var(--border);
    border-radius: 3px; color: var(--text); background: transparent; cursor: pointer;
    font-family: inherit; font-size: 14px; text-decoration: none; letter-spacing: 0.03em;
  }
  .btn:hover { border-color: var(--accent); color: var(--accent); }
  .btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .btn-primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); color: #fff; }
`

function ActionEl(a: AccessPageAction) {
  const cls = a.primary ? 'btn btn-primary' : 'btn'
  if (a.postUrl) {
    return (
      <form method="POST" action={a.postUrl} style="margin:0">
        <button type="submit" class={cls}>
          {a.label}
        </button>
      </form>
    )
  }
  return (
    <a class={cls} href={a.href ?? '#'}>
      {a.label}
    </a>
  )
}

/** Полная HTML-страница-сообщение (JSX.SingleElement). */
export function AccessMessagePage(props: AccessMessagePageProps) {
  return (
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{props.title}</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
        <style>{ACCESS_PAGE_STYLES}</style>
      </head>
      <body>
        <div class="card">
          <h1>{props.heading}</h1>
          {props.paragraphs.map((p) => (
            <p class="msg">{p}</p>
          ))}
          {props.actions && props.actions.length > 0 ? (
            <div class="actions">{props.actions.map((a) => ActionEl(a))}</div>
          ) : null}
        </div>
      </body>
    </html>
  )
}
