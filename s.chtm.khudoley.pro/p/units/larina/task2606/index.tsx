// @shared
import { jsx } from '@app/html-jsx'
import { getFullUrl, ROUTES } from './config/routes'
import { DEFAULT_PROJECT_TITLE } from './config/project'

/**
 * Главная страница — инструкция по встройке: сниппет <script src> с кнопкой копирования
 * и ссылка на админку.
 */
export const indexPageRoute = app.html('/', async (ctx, _req) => {
  const adminUrl = getFullUrl(ROUTES.admin)
  // Абсолютный URL встраиваемого скрипта (с доменом) через платформенный API
  const embedUrl = ctx.account.url(getFullUrl('/api/embed/script'))
  const snippet = `<script src="${embedUrl}"></script>`

  const copyScript = `
    (function () {
      var btn = document.getElementById('copy-btn');
      var snippet = ${JSON.stringify(snippet)};
      var codeEl = document.getElementById('snippet-text');
      if (codeEl) { codeEl.textContent = snippet; }
      function flash(text) {
        var prev = btn.innerHTML;
        btn.innerHTML = text;
        btn.classList.add('copied');
        setTimeout(function () {
          btn.innerHTML = prev;
          btn.classList.remove('copied');
        }, 1800);
      }
      function fallbackCopy() {
        var ta = document.createElement('textarea');
        ta.value = snippet;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        return ok;
      }
      btn.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(snippet).then(
            function () { flash('Скопировано'); },
            function () { flash(fallbackCopy() ? 'Скопировано' : 'Не удалось'); }
          );
        } else {
          flash(fallbackCopy() ? 'Скопировано' : 'Не удалось');
        }
      });
    })();
  `

  return (
    <html>
      <head>
        <title>{DEFAULT_PROJECT_TITLE}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <style>{`
          :root {
            --bg: #0f1117;
            --card: #171a23;
            --border: #2a2f3a;
            --text: #e8e8e8;
            --muted: #9aa0ac;
            --accent: #3b82f6;
            --accent-hover: #2f6fe0;
            --ok: #1f9d57;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg);
            color: var(--text);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            padding: 24px;
          }
          .card {
            width: 100%;
            max-width: 720px;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 32px;
          }
          h1 { margin: 0 0 8px; font-size: 22px; }
          .lead { margin: 0 0 24px; color: var(--muted); font-size: 14px; line-height: 1.5; }
          .snippet-box {
            display: flex;
            gap: 10px;
            align-items: stretch;
            margin-bottom: 18px;
            flex-wrap: wrap;
          }
          code.snippet {
            flex: 1 1 360px;
            min-width: 0;
            background: #0b0d12;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px 14px;
            font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
            font-size: 13px;
            color: #cdd3df;
            overflow-x: auto;
            white-space: nowrap;
            display: flex;
            align-items: center;
          }
          button#copy-btn {
            flex: 0 0 auto;
            border: none;
            border-radius: 8px;
            padding: 0 20px;
            min-height: 44px;
            background: var(--accent);
            color: #fff;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.15s ease;
            white-space: nowrap;
          }
          button#copy-btn:hover { background: var(--accent-hover); }
          button#copy-btn.copied { background: var(--ok); }
          .hint { color: var(--muted); font-size: 13px; line-height: 1.5; margin: 0 0 24px; }
          .admin-link {
            display: inline-block;
            color: var(--accent);
            text-decoration: none;
            font-size: 14px;
          }
          .admin-link:hover { text-decoration: underline; }
        `}</style>
      </head>
      <body>
        <div class="card">
          <h1>Диагностика — установка скрипта</h1>
          <p class="lead">
            Скопируйте сниппет и вставьте его в код нужной страницы (например, в шаблон GetCourse).
            При загрузке страницы скрипт отправит данные посетителя в этот модуль.
          </p>
          <div class="snippet-box">
            <code class="snippet" id="snippet-text"></code>
            <button id="copy-btn" type="button">
              Копировать
            </button>
          </div>
          <p class="hint">
            Вставлять один раз на страницу. Приём данных можно включать и отключать в админке
            тумблером.
          </p>
          <a class="admin-link" href={adminUrl}>
            → Открыть админку
          </a>
        </div>
        <script>{copyScript}</script>
      </body>
    </html>
  )
})

export default indexPageRoute
