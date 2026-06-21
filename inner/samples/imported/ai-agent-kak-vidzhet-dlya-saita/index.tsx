import { jsx } from '@app/html-jsx'
import { findWorkspaceByEntryModuleId } from '@start/sdk'
import { setupPageRoute } from './setup'
import { findWorkspaceTransport } from './transport/hook'
import { requireAccountRole } from '@app/auth'
import GalleryPage from './pages/GalleryPage.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  // Если есть query параметр gallery - показываем галерею без проверки роли
  if (req.query.gallery !== undefined) {
    return (
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>AI-Виджет чата - Галерея</title>
        </head>
        <body>
          <GalleryPage />
        </body>
      </html>
    )
  }

  await requireAccountRole(ctx, 'Admin')

  const transport = await findWorkspaceTransport(ctx)
  if (!transport) {
    return ctx.resp.redirect(setupPageRoute.url())
  }

  const workspace = await findWorkspaceByEntryModuleId(ctx, ctx.entryModule.id)

  if (!workspace) {
    throw new Error('Workspace not found')
  }

  const embedCode = `<script
  async
  id="chatium-sender-widget-loader"
  src="${ctx.account.url('/app/sender/v2/widget/loader.v1.js')}"
  data-host="${ctx.account.host}"
  data-popup="${workspace.path}/popup"
  data-button="${workspace.path}/button"
  data-lang="ru"
  data-position="br"
  data-z-index="2147483000"
  data-popup-styles-border-radius="12px 12px 28px 28px"
  crossorigin="anonymous"
  referrerpolicy="strict-origin-when-cross-origin"
></script>`

  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/metric/clarity.js"></script>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          html,
          body {
            height: 100%;
            width: 100%;
          }


          body {
            background: #f5f5f7;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 60px 24px;
            position: relative;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif;
          }

          .content {
            background: #ffffff;
            border-radius: 8px;
            padding: 48px;
            box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
            max-width: 700px;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 32px;
          }

          .content__title {
            font-size: 32px;
            font-weight: 700;
            color: #000000;
            letter-spacing: -0.03em;
            line-height: 1.2;
          }

          .content__description {
            font-size: 17px;
            line-height: 1.5;
            color: #6e6e73;
          }

          .code-block {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .code-block__label {
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #86868b;
          }

          .code-block__input {
            width: 100%;
            min-height: 360px;
            resize: none;
            border: 1px solid #d2d2d7;
            border-radius: 6px;
            padding: 20px;
            background: #f5f5f7;
            color: #1d1d1f;
            font-family: "SF Mono", "Monaco", "Menlo", monospace;
            font-size: 12px;
            line-height: 1.6;
            transition: border-color 0.2s ease;
          }

          .code-block__input:focus {
            outline: none;
            border-color: #0071e3;
          }

          .code-block__actions {
            display: flex;
            justify-content: flex-end;
          }

          .copy-button {
            border: none;
            border-radius: 6px;
            padding: 12px 24px;
            background: #0071e3;
            color: #fff;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease, opacity 0.2s ease;
          }

          .copy-button:hover {
            background: #0077ed;
          }

          .copy-button:disabled {
            opacity: 0.7;
            cursor: default;
          }

          .arrow-note {
            position: fixed;
            right: 100px;
            bottom: 35px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            justify-content: center;
            text-align: right;
            gap: 8px;
            pointer-events: none;
            animation: pointRight 1.5s ease-in-out infinite;
          }

          @keyframes pointRight {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(8px); }
          }

          .arrow-note__label {
            font-size: 15px;
            font-weight: 600;
            color: #0071e3;
            background: #ffffff;
            padding: 6px 14px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          @media (max-width: 768px) {
            body {
              padding: 24px 16px 160px;
            }

            .content {
              padding: 32px 24px;
            }

            .content__title {
              font-size: 26px;
            }

            .arrow-note {
              right: 90px;
              bottom: 30px;
            }
          }
        `}</style>
      </head>
      <body>
        <div class="content">
          <h1 class="content__title">Виджет на сайт</h1>
          <p class="content__description">
            Добавьте код ниже на свой сайт, чтобы агент мог получать и отвечать на сообщения.
          </p>

          <div class="code-block">
            <span class="code-block__label">Код для встройки</span>
            <textarea id="widget-code" class="code-block__input" spellcheck="false" read-only>
              {embedCode.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}
            </textarea>
            <div class="code-block__actions">
              <button type="button" id="copy-button" class="copy-button">
                Скопировать
              </button>
            </div>
          </div>
        </div>

        <div class="arrow-note" aria-hidden="true">
          <span class="arrow-note__label">Протестировать</span>
        </div>

        <script
          id="chatium-sender-widget-loader"
          src={ctx.account.url('/app/sender/v2/widget/loader.v1.js')}
          async
          data-host={ctx.account.host}
          data-popup={`${workspace.path}/popup`}
          data-button={`${workspace.path}/button`}
          data-lang="ru"
          data-position="br"
          data-z-index="2147483000"
          data-popup-styles-border-radius="12px 12px 28px 28px"
          crossorigin="anonymous"
          referrerpolicy="strict-origin-when-cross-origin"
        ></script>

        <script>{`
          (function () {
            var copyButton = document.getElementById('copy-button');
            var textarea = document.getElementById('widget-code');
            if (!copyButton || !textarea) {
              return;
            }

            var originalText = copyButton.textContent || 'Скопировать';

            copyButton.addEventListener('click', function () {
              var code = textarea.value;

              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(code).then(showSuccess, fallbackCopy);
              } else {
                fallbackCopy();
              }

              function fallbackCopy() {
                textarea.focus();
                textarea.select();
                try {
                  var successful = document.execCommand('copy');
                  if (successful) {
                    showSuccess();
                  } else {
                    showError();
                  }
                } catch (err) {
                  showError();
                }
                textarea.setSelectionRange(0, 0);
                textarea.blur();
              }

              function showSuccess() {
                copyButton.textContent = 'Скопировано!';
                copyButton.disabled = true;
                setTimeout(function () {
                  copyButton.textContent = originalText;
                  copyButton.disabled = false;
                }, 1800);
              }

              function showError() {
                copyButton.textContent = 'Не удалось скопировать';
                copyButton.disabled = true;
                setTimeout(function () {
                  copyButton.textContent = originalText;
                  copyButton.disabled = false;
                }, 2200);
              }
            });
          })();
        `}</script>
      </body>
    </html>
  )
})
