/**
 * Сценарии /v1/{op} — фаза 2 (производители). Вынесено из v1OpsScenarios ради лимита размера
 * файла; собирается в общий реестр в v1OpsScenarios (порядок сохранён).
 */
import { V1_OPS_HEAP_KEYS, V1_OPS_TESTER_EMAIL } from './v1OpsRunContext'
import { type V1OpScenario, pickPath, asNumberLike } from './v1OpsScenarioHelpers'

export const v1OpsScenariosPhase2: V1OpScenario[] = [
  {
    op: 'addUser',
    phase: 2,
    hint: `Создание/импорт пользователя с email ${V1_OPS_TESTER_EMAIL}; запоминает userId.`,
    build: () => ({
      args: {
        params: {
          user: {
            email: V1_OPS_TESTER_EMAIL
          }
        }
      }
    }),
    capture: (parsed, runCtx) => {
      const userId =
        asNumberLike(pickPath(parsed, 'data.result.user_id')) ??
        asNumberLike(pickPath(parsed, 'data.user_id')) ??
        asNumberLike(pickPath(parsed, 'data.result.id')) ??
        asNumberLike(pickPath(parsed, 'data.id'))
      if (userId !== undefined) runCtx.userId = userId
    }
  },
  {
    op: 'createDeal',
    phase: 2,
    dependsOn: ['addUser'],
    heapKeys: [V1_OPS_HEAP_KEYS.OFFER_ID],
    hint: 'Создание сделки на тестового пользователя; offerId из Heap. Запоминает dealId.',
    build: ({ runCtx, heap }) => {
      if (heap.offerId === undefined) {
        return { skip: `Не задан Heap-ключ ${V1_OPS_HEAP_KEYS.OFFER_ID}` }
      }
      const offerCode = String(heap.offerId)
      return {
        args: {
          params: {
            user: { email: runCtx.testerEmail },
            deal: { offer_code: offerCode }
          }
        }
      }
    },
    capture: (parsed, runCtx) => {
      const dealId =
        asNumberLike(pickPath(parsed, 'data.result.deal_id')) ??
        asNumberLike(pickPath(parsed, 'data.deal_id')) ??
        asNumberLike(pickPath(parsed, 'data.result.id'))
      if (dealId !== undefined) runCtx.dealId = dealId
    }
  },
  {
    op: 'exportUsers',
    phase: 2,
    hint: 'Старт экспорта пользователей; запоминает exportId для getExportResult.',
    build: () => ({ args: {} }),
    capture: (parsed, runCtx) => {
      const exportId =
        asNumberLike(pickPath(parsed, 'data.export_id')) ??
        asNumberLike(pickPath(parsed, 'data.info.export_id')) ??
        asNumberLike(pickPath(parsed, 'data.id'))
      if (exportId !== undefined) runCtx.exportId = exportId
    }
  },
  {
    op: 'exportDeals',
    phase: 2,
    hint: 'Старт экспорта сделок (резервный источник exportId).',
    build: () => ({ args: {} }),
    capture: (parsed, runCtx) => {
      if (runCtx.exportId !== undefined) return
      const exportId =
        asNumberLike(pickPath(parsed, 'data.export_id')) ??
        asNumberLike(pickPath(parsed, 'data.info.export_id'))
      if (exportId !== undefined) runCtx.exportId = exportId
    }
  },
  {
    op: 'exportPayments',
    phase: 2,
    hint: 'Старт экспорта платежей (резервный источник exportId).',
    build: () => ({ args: {} }),
    capture: (parsed, runCtx) => {
      if (runCtx.exportId !== undefined) return
      const exportId =
        asNumberLike(pickPath(parsed, 'data.export_id')) ??
        asNumberLike(pickPath(parsed, 'data.info.export_id'))
      if (exportId !== undefined) runCtx.exportId = exportId
    }
  }
]
