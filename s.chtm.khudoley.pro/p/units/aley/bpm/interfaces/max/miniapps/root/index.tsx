import { jsx } from '@app/html-jsx'
import { getMiniappPage } from '../../lib/miniapps/registry.lib'
import { getFullUrl } from '../../config/routes'
import { miniappBootstrapRoute } from '../../api/miniapps/bootstrap'

export const miniappRootPage = app.html('/', async () => {
  const page = getMiniappPage('root')
  const bootstrapUrl = getFullUrl(miniappBootstrapRoute.url())
  return (
    <html>
      <head>
        <title>{page?.title ?? 'A/Ley BPM'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script src="https://app.max.ru/sdk/max-web-app.js"></script>
        <script>
          {`window.__MINIAPP_BOOT__=${JSON.stringify({
            pageKey: 'root',
            title: 'A/Ley BPM',
            bootstrapUrl
          })};`}
        </script>
      </head>
      <body>
        <main style={{ fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
          <h1>A/Ley BPM</h1>
          <div id="miniapp-root">Loading...</div>
        </main>
        <script>
          {`
          (function () {
            var root = document.getElementById('miniapp-root');
            function render(text) {
              if (root) root.textContent = text;
            }
            var boot = window.__MINIAPP_BOOT__ || {};
            var webApp = window.WebApp || (window.MAX && window.MAX.WebApp) || {};
            var initData = webApp.initData || '';
            if (!initData) {
              render('MAX initData is not available');
              return;
            }
            fetch(boot.bootstrapUrl, {
              method: 'POST',
              credentials: 'include',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ pageKey: boot.pageKey || 'root', initData: initData, payload: {} })
            })
              .then(function (res) { return res.json(); })
              .then(function (data) {
                if (!data || data.success === false) {
                  render((data && data.error) || 'Bootstrap failed');
                  return;
                }
                render((data.page && data.page.title) || boot.title || 'A/Ley BPM');
              })
              .catch(function () {
                render('Bootstrap failed');
              });
          })();
        `}
        </script>
      </body>
    </html>
  )
})
