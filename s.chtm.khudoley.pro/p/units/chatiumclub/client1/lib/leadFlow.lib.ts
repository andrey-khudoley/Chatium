import * as loggerLib from './logger.lib'
import * as leadsRepo from '../repos/leads.repo'
import { invoke } from './gateway/gatewayClient'

const LOG_MODULE = 'lib/leadFlow.lib'

/**
 * Email тестового пользователя для демо-каркаса (план §1.8.2): хардкод, не Heap.
 * При реальной подаче формы используется email посетителя; это значение —
 * fallback для smoke-проверки и автотестов.
 */
export const DEMO_LEAD_EMAIL = 'tester@khudoley.pro'

/**
 * Базовая валидация входных данных лид-формы.
 * Возвращает массив ошибок (пустой = всё ок).
 */
export type LeadFormInput = {
  email: string
  name: string
  phone?: string
  utmSource?: string
  utmCampaign?: string
  landingId?: string
  customFields?: Record<string, unknown>
  /** Опционально: код предложения для создания сделки (`createDeal.deal.offer_code`). */
  offerCode?: string
}

export type LeadValidationError = { field: string; message: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateLeadInput(input: Partial<LeadFormInput>): LeadValidationError[] {
  const errors: LeadValidationError[] = []
  const email = typeof input.email === 'string' ? input.email.trim() : ''
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const phone = typeof input.phone === 'string' ? input.phone.trim() : ''
  if (!email) {
    errors.push({ field: 'email', message: 'Email обязателен' })
  } else if (!EMAIL_RE.test(email)) {
    errors.push({ field: 'email', message: 'Некорректный формат email' })
  }
  if (!name) {
    errors.push({ field: 'name', message: 'Имя обязательно' })
  } else if (name.length < 2) {
    errors.push({ field: 'name', message: 'Имя слишком короткое' })
  }
  if (phone && phone.length > 0 && !/[+\d]/.test(phone)) {
    errors.push({ field: 'phone', message: 'Телефон содержит недопустимые символы' })
  }
  return errors
}

/**
 * Сборка `args` для `addUser` (контур legacy GetCourse): корнем тела является
 * объект `params` с блоком `user` (manual §4.5 gateway, спека сценария A §4).
 *
 * `refresh_if_exists: 1` — обновлять, если пользователь с таким email уже существует.
 */
export function buildAddUserArgs(input: LeadFormInput): Record<string, unknown> {
  const params: Record<string, unknown> = {
    user: {
      email: input.email,
      ...(input.name ? { name: input.name } : {}),
      ...(input.phone ? { phone: input.phone } : {})
    },
    system: {
      refresh_if_exists: 1
    }
  }
  if (input.customFields && Object.keys(input.customFields).length > 0) {
    params.user_addfields = input.customFields
  }
  return { params }
}

/**
 * Сборка `args` для `createDeal` (контур legacy). Возвращает `null`, если
 * `offerCode` не указан — тогда `createDeal` пропускается.
 */
export function buildCreateDealArgs(input: LeadFormInput): Record<string, unknown> | null {
  if (!input.offerCode) {
    return null
  }
  const params: Record<string, unknown> = {
    user: { email: input.email },
    deal: { offer_code: input.offerCode }
  }
  return { params }
}

export type LeadFlowResult = {
  ok: boolean
  leadId: string
  addUser: { ok: boolean; errorCode?: string; requestId: string | null }
  createDeal: { ok: boolean; errorCode?: string; requestId: string | null; skipped: boolean }
  validationErrors: LeadValidationError[]
}

/**
 * Полный цикл обработки лида: валидация → invoke('addUser') → опц. invoke('createDeal') →
 * запись в Heap-таблицу `Leads`. Не бросает исключений на уровне SDK/gateway —
 * фиксирует все коды ошибок в результате и в Heap.
 *
 * Логирует входные параметры (без чувствительных данных), длительность, исходы вызовов SDK.
 */
export async function processLead(
  ctx: app.Ctx,
  raw: Partial<LeadFormInput>
): Promise<LeadFlowResult> {
  const startedAt = Date.now()
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] processLead entry`,
    payload: {
      hasEmail: !!raw?.email,
      hasName: !!raw?.name,
      hasPhone: !!raw?.phone,
      utmSource: raw?.utmSource ?? null,
      landingId: raw?.landingId ?? null,
      hasOfferCode: !!raw?.offerCode
    }
  })

  const validationErrors = validateLeadInput(raw)
  if (validationErrors.length > 0) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] processLead validation failed`,
      payload: { errors: validationErrors }
    })
    return {
      ok: false,
      leadId: '',
      addUser: { ok: false, errorCode: 'VALIDATION_FAILED', requestId: null },
      createDeal: { ok: false, requestId: null, skipped: true },
      validationErrors
    }
  }

  const input: LeadFormInput = {
    email: String(raw.email).trim(),
    name: String(raw.name).trim(),
    phone: typeof raw.phone === 'string' ? raw.phone.trim() : '',
    utmSource: typeof raw.utmSource === 'string' ? raw.utmSource.trim() : '',
    utmCampaign: typeof raw.utmCampaign === 'string' ? raw.utmCampaign.trim() : '',
    landingId: typeof raw.landingId === 'string' ? raw.landingId.trim() : '',
    customFields: raw.customFields,
    offerCode: typeof raw.offerCode === 'string' ? raw.offerCode.trim() : ''
  }

  const addUserArgs = buildAddUserArgs(input)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] processLead invoke addUser`,
    payload: { email: input.email, argsKeys: Object.keys(addUserArgs) }
  })
  const addUserResult = await invoke(ctx, { op: 'addUser', args: addUserArgs })
  let addUserErrorCode = ''
  if ('error' in addUserResult && addUserResult.error) {
    addUserErrorCode = addUserResult.error.code
  }
  await loggerLib.writeServerLog(ctx, {
    severity: addUserResult.ok ? 6 : 4,
    message: `[${LOG_MODULE}] processLead addUser result`,
    payload: {
      ok: addUserResult.ok,
      errorCode: addUserErrorCode || null,
      gatewayHttpStatus: addUserResult.gatewayHttpStatus,
      requestId: addUserResult.requestId
    }
  })

  let createDealResult: {
    ok: boolean
    errorCode?: string
    requestId: string | null
    skipped: boolean
  } = {
    ok: false,
    requestId: null,
    skipped: true
  }

  const createDealArgs = buildCreateDealArgs(input)
  if (createDealArgs && addUserResult.ok) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] processLead invoke createDeal`,
      payload: { email: input.email, offerCode: input.offerCode }
    })
    const cd = await invoke(ctx, { op: 'createDeal', args: createDealArgs })
    let cdErrorCode = ''
    if ('error' in cd && cd.error) {
      cdErrorCode = cd.error.code
    }
    createDealResult = {
      ok: cd.ok,
      requestId: cd.requestId,
      skipped: false,
      ...(cdErrorCode ? { errorCode: cdErrorCode } : {})
    }
    await loggerLib.writeServerLog(ctx, {
      severity: cd.ok ? 6 : 4,
      message: `[${LOG_MODULE}] processLead createDeal result`,
      payload: {
        ok: cd.ok,
        errorCode: cdErrorCode || null,
        gatewayHttpStatus: cd.gatewayHttpStatus,
        requestId: cd.requestId
      }
    })
  } else if (createDealArgs && !addUserResult.ok) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] processLead createDeal skipped: addUser failed`,
      payload: { addUserErrorCode: addUserErrorCode || null }
    })
  }

  const lastRequestId = createDealResult.requestId ?? addUserResult.requestId ?? undefined

  const lead = await leadsRepo.create(ctx, {
    email: input.email,
    name: input.name,
    phone: input.phone ?? '',
    utmSource: input.utmSource,
    utmCampaign: input.utmCampaign,
    landingId: input.landingId,
    addUserOk: addUserResult.ok,
    addUserErrorCode,
    createDealOk: createDealResult.ok,
    createDealErrorCode: createDealResult.ok ? '' : (createDealResult.errorCode ?? ''),
    ...(lastRequestId ? { gatewayRequestId: lastRequestId } : {})
  })

  const result: LeadFlowResult = {
    ok: addUserResult.ok,
    leadId: String(lead.id),
    addUser: addUserResult.ok
      ? { ok: true, requestId: addUserResult.requestId }
      : { ok: false, errorCode: addUserErrorCode, requestId: addUserResult.requestId },
    createDeal: createDealResult,
    validationErrors: []
  }

  await loggerLib.writeServerLog(ctx, {
    severity: result.ok ? 6 : 4,
    message: `[${LOG_MODULE}] processLead exit`,
    payload: {
      ok: result.ok,
      leadId: result.leadId,
      addUserOk: result.addUser.ok,
      createDealOk: result.createDeal.ok,
      createDealSkipped: result.createDeal.skipped,
      durationMs: Date.now() - startedAt
    }
  })

  return result
}
