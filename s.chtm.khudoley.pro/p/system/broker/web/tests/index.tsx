// @shared
import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import UnitTestsPage from '../../pages/tests/UnitTestsPage.vue'

/**
 * Интерактивная страница тестов (§9.1) — для разработчика. UnitTestsPage.vue
 * импортирует shared/* и роут-объекты с // @shared-route напрямую, вызывая их
 * через .run(ctx, ...) с глобальным ctx (007-vue.md, «@shared-route и метод
 * .run()»; образец — inner/samples/new_project/tests/pages/UnitTestsPage.vue,
 * фикс-раунда 1, п.17) — props с URL больше не нужны.
 */
export const brokerTestsPageRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  return (
    <html>
      <head>
        <title>broker — Unit Tests</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
      </head>
      <body>
        <UnitTestsPage />
      </body>
    </html>
  )
})
