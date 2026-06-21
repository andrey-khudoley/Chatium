// @shared
import { jsx } from '@app/html-jsx'
import TestsPage from '../../pages/TestsPage.vue'
import { getBootLoaderDiv, getDemoPageHead } from '../../shared/demoPageShell'
import { DEFAULT_PROJECT_TITLE, TESTS_PAGE_NAME } from '../../config/project'
import { getBpmNavUrlsAsync } from '../../lib/navUrls.lib'

const groups = [
  {
    id: 'layers',
    title: 'Data layers',
    checks: [
      {
        id: 'tables',
        label: 'Heap tables are preserved',
        state: 'done' as const,
        details: 'В проекте остались `tables/settings.table.ts` и `tables/logs.table.ts`.'
      },
      {
        id: 'repos',
        label: 'Repository layer is preserved',
        state: 'done' as const,
        details: 'Слой `repos/` сохранён и подключён к library-слою.'
      },
      {
        id: 'libs',
        label: 'Library layer is preserved',
        state: 'done' as const,
        details: 'Слой `lib/` сохранён и используется в админ-маршруте.'
      }
    ]
  },
  {
    id: 'migration',
    title: 'Migration status',
    checks: [
      {
        id: 'path',
        label: 'Project moved to /p/units/neso/bpm',
        state: 'done' as const,
        details: 'Рабочий корень проекта теперь `p/units/neso/bpm`.'
      },
      {
        id: 'legacy-ui',
        label: 'Legacy CRM UI removed',
        state: 'done' as const,
        details: 'Из исходного CRM-проекта удалены прежние web/pages/components/layout и т.д.'
      },
      {
        id: 'docs',
        label: 'Update docs snapshot',
        state: 'active' as const,
        details: 'README обновлён под новую структуру BPM-проекта.'
      }
    ]
  },
  {
    id: 'design',
    title: 'Design catalog',
    checks: [
      {
        id: 'design-index',
        label: 'Design index route exists',
        state: 'done' as const,
        details: 'Маршрут `/web/design` создан и содержит навигацию по сценариям.'
      },
      {
        id: 'design-pages',
        label: '19 scenario pages generated',
        state: 'done' as const,
        details: 'Сгенерирован набор отдельных маршрутов `/web/design/<scenario>` (19 страниц).'
      },
      {
        id: 'api-isolation',
        label: 'Design pages are API-independent',
        state: 'done' as const,
        details: 'Страницы design используют только mock/shared-данные и UI-компоненты.'
      }
    ]
  },
  {
    id: 'ui-kit',
    title: 'Reusable components',
    checks: [
      {
        id: 'imported',
        label: 'design_2 reusable components copied',
        state: 'done' as const,
        details: 'Компоненты из `p/neso/design_2/components` и layout/shared перенесены в BPM.'
      },
      {
        id: 'scenario-kit',
        label: 'Scenario-specific components added',
        state: 'done' as const,
        details:
          'Добавлены новые блоки: `DcSlaGauge`, `DcSwimlaneBoard`, `DcDecisionTree`, `DcRiskHeatmap`, `DcCapacityMatrix`, `DcMilestoneRail`, `DcRoleStack`, `DcCommandDeck`.'
      },
      {
        id: 'visual-review',
        label: 'Manual visual review in browser',
        state: 'todo' as const,
        details: 'Проверка финального UI в браузере остаётся следующей ручной задачей.'
      }
    ]
  }
]

export const testsPageRoute = app.html('/', async (ctx) => {
  const navUrls = await getBpmNavUrlsAsync(ctx)
  return (
    <html>
      <head>
        {getDemoPageHead('light', TESTS_PAGE_NAME, DEFAULT_PROJECT_TITLE, 'Info', 'misty-daybreak')}
      </head>
      <body>
        {getBootLoaderDiv('light', DEFAULT_PROJECT_TITLE, 'misty-daybreak')}
        <TestsPage
          homeUrl={navUrls.homeUrl}
          adminUrl={navUrls.adminUrl}
          designUrl={navUrls.designUrl}
          loginUrl={navUrls.loginUrl}
          groups={groups}
        />
      </body>
    </html>
  )
})

export default testsPageRoute
