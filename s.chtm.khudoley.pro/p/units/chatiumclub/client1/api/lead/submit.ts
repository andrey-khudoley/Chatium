// @shared-route
import * as loggerLib from '../../lib/logger.lib'
import * as leadFlow from '../../lib/leadFlow.lib'

const LOG_PATH = 'api/lead/submit'

/**
 * POST /api/lead/submit — публичная точка входа лид-формы App A.
 * Тело: `{ email, name, phone?, utmSource?, utmCampaign?, landingId?, customFields?, offerCode? }`.
 *
 * Поведение:
 * 1. Валидация на сервере (повтор клиентской) — `lib/leadFlow.validateLeadInput`.
 * 2. `invoke('addUser', ...)` через локальный SDK gateway-клиент.
 * 3. Если задан `offerCode` и `addUser` прошёл — `invoke('createDeal', ...)`.
 * 4. Запись в Heap-таблицу `Leads` (всегда, даже при ошибке gateway) — для
 *    воспроизводимости демо-сценария и счётчиков в админке.
 *
 * Возвращает:
 * - `success: true` + `leadId` + детали по `addUser`/`createDeal` при `addUserOk`;
 * - `success: false` + `validationErrors` или `error.code` от gateway/SDK иначе.
 *
 * Без авторизации: посетитель лендинга не залогинен в Chatium. Защита от спама
 * (rate-limit, captcha) — за пределами этого роута; см. `docs/architecture.md` App A.
 */
export const submitLeadRoute = app.post('/', async (ctx, req) => {
  const startedAt = Date.now()
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: {
      bodyKeys: req.body ? Object.keys(req.body as object) : [],
      hasUser: !!ctx.user
    }
  })

  const body = (req.body ?? {}) as Partial<leadFlow.LeadFormInput>

  let result: leadFlow.LeadFlowResult
  try {
    result = await leadFlow.processLead(ctx, body)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] internal error`,
      payload: { error: msg, durationMs: Date.now() - startedAt }
    })
    return {
      success: false,
      error: { code: 'CLIENT1_INTERNAL_ERROR', message: 'Внутренняя ошибка обработчика лида.' }
    }
  }

  if (result.validationErrors.length > 0) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] validation failed`,
      payload: { errors: result.validationErrors, durationMs: Date.now() - startedAt }
    })
    return { success: false, validationErrors: result.validationErrors }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: result.ok ? 6 : 4,
    message: `[${LOG_PATH}] exit`,
    payload: {
      ok: result.ok,
      leadId: result.leadId,
      addUserOk: result.addUser.ok,
      addUserErrorCode: result.addUser.ok ? null : result.addUser.errorCode,
      createDealOk: result.createDeal.ok,
      createDealSkipped: result.createDeal.skipped,
      durationMs: Date.now() - startedAt
    }
  })

  return {
    success: result.ok,
    leadId: result.leadId,
    addUser: result.addUser,
    createDeal: result.createDeal
  }
})
