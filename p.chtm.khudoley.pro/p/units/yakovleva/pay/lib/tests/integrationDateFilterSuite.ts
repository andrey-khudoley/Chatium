/**
 * Интеграционные проверки фильтра панели по дате/времени (Heap):
 *  - getPanelDateFilter roundtrip (сохранение → чтение → сброс), с восстановлением;
 *  - валидация setSetting(PANEL_DATE_FILTER) бросает на невалидном (без записи);
 *  - граничные where-выборки репозиториев ($gte/$lt) — read-only, без сидинга данных.
 *
 * Вынесено из integrationSuite ради лимита размера файла.
 */
import * as settingsLib from '../settings.lib'
import * as settingsRepo from '../../repos/settings.repo'
import * as requestLogRepo from '../../repos/requestLog.repo'
import * as webhookLogRepo from '../../repos/webhookLog.repo'
import { type TemplateIntegrationTestResult, tryAsync } from './integrationSuiteHelpers'

export async function runDateFilterIntegrationChecks(
  ctx: app.Ctx,
  results: TemplateIntegrationTestResult[]
): Promise<void> {
  const KEY = settingsLib.SETTING_KEYS.PANEL_DATE_FILTER
  const farFuture = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000

  await tryAsync(
    results,
    'df_getPanelDateFilter_roundtrip',
    'getPanelDateFilter: save → read → reset',
    async () => {
      const prev = await settingsLib.getPanelDateFilter(ctx)
      try {
        const from = 1_600_000_000_000
        const to = 1_600_000_100_000
        await settingsLib.setSetting(ctx, KEY, { from, to })
        const got = await settingsLib.getPanelDateFilter(ctx)
        const okSet = got.from === from && got.to === to
        await settingsRepo.deleteByKey(ctx, KEY)
        const cleared = await settingsLib.getPanelDateFilter(ctx)
        const okClear = cleared.from === undefined && cleared.to === undefined
        return okSet && okClear
      } finally {
        // Восстановить прежнее глобальное состояние фильтра.
        if (prev.from === undefined && prev.to === undefined) {
          await settingsRepo.deleteByKey(ctx, KEY)
        } else {
          await settingsLib.setSetting(ctx, KEY, prev)
        }
      }
    }
  )

  await tryAsync(
    results,
    'df_setSetting_invalid_throws',
    'setSetting(PANEL_DATE_FILTER, from>to/<=0) бросает',
    async () => {
      let threwNeg = false
      try {
        await settingsLib.setSetting(ctx, KEY, { from: -1 })
      } catch {
        threwNeg = true
      }
      let threwOrder = false
      try {
        await settingsLib.setSetting(ctx, KEY, { from: 2000, to: 1000 })
      } catch {
        threwOrder = true
      }
      // Валидация срабатывает до записи в Heap — состояние фильтра не меняется.
      return threwNeg && threwOrder
    }
  )

  await tryAsync(
    results,
    'df_requestlog_range_bounds',
    'requestLog: countInRange/findInRange границы $gte/$lt',
    async () => {
      const all = await requestLogRepo.countInRange(ctx)
      const noneAfter = await requestLogRepo.countInRange(ctx, farFuture)
      const noneBefore = await requestLogRepo.countInRange(ctx, undefined, 1)
      const okCount = await requestLogRepo.countOkInRange(ctx)
      const rowsNone = await requestLogRepo.findInRange(ctx, farFuture)
      const rowsAll = await requestLogRepo.findInRange(ctx, undefined, undefined, 5)
      return (
        typeof all === 'number' &&
        all >= 0 &&
        noneAfter === 0 &&
        noneBefore === 0 &&
        typeof okCount === 'number' &&
        okCount >= 0 &&
        okCount <= all &&
        Array.isArray(rowsNone) &&
        rowsNone.length === 0 &&
        Array.isArray(rowsAll) &&
        rowsAll.length <= 5
      )
    }
  )

  await tryAsync(
    results,
    'df_webhooklog_range_bounds',
    'webhookLog: countInRange/findInRange/byOrder границы',
    async () => {
      const all = await webhookLogRepo.countInRange(ctx)
      const noneAfter = await webhookLogRepo.countInRange(ctx, farFuture)
      const succNone = await webhookLogRepo.countStatusSuccessInRange(ctx, farFuture)
      const tokNone = await webhookLogRepo.countTokenValidInRange(ctx, farFuture)
      const rowsNone = await webhookLogRepo.findInRange(ctx, farFuture)
      const byOrder = await webhookLogRepo.findByOrderNumberInRange(ctx, `__no_order_${Date.now()}`)
      return (
        typeof all === 'number' &&
        all >= 0 &&
        noneAfter === 0 &&
        succNone === 0 &&
        tokNone === 0 &&
        Array.isArray(rowsNone) &&
        rowsNone.length === 0 &&
        Array.isArray(byOrder) &&
        byOrder.length === 0
      )
    }
  )
}
