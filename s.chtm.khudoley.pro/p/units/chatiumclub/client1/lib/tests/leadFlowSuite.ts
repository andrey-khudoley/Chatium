/**
 * Юнит-набор сценария A (лид с лендинга): синхронные проверки без Heap.
 * Покрывает валидацию входных данных и сборку `args` для invoke('addUser') / invoke('createDeal').
 */
import {
  validateLeadInput,
  buildAddUserArgs,
  buildCreateDealArgs,
  DEMO_LEAD_EMAIL,
  type LeadFormInput
} from '../leadFlow.lib'

export type LeadUnitTestResult = { id: string; title: string; passed: boolean; error?: string }

function tryPush(
  results: LeadUnitTestResult[],
  id: string,
  title: string,
  fn: () => boolean
): void {
  try {
    results.push({ id, title, passed: fn() })
  } catch (e) {
    results.push({ id, title, passed: false, error: (e as Error)?.message ?? String(e) })
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function runLeadUnitChecks(): LeadUnitTestResult[] {
  const results: LeadUnitTestResult[] = []

  tryPush(results, 'lead_validate_empty', 'validateLeadInput пустого объекта', () => {
    const e = validateLeadInput({})
    return e.some((x) => x.field === 'email') && e.some((x) => x.field === 'name')
  })

  tryPush(results, 'lead_validate_bad_email', 'validateLeadInput плохой email', () => {
    const e = validateLeadInput({ email: 'not-an-email', name: 'Иван' })
    return e.length === 1 && e[0]!.field === 'email'
  })

  tryPush(results, 'lead_validate_short_name', 'validateLeadInput короткое имя', () => {
    const e = validateLeadInput({ email: DEMO_LEAD_EMAIL, name: 'X' })
    return e.length === 1 && e[0]!.field === 'name'
  })

  tryPush(results, 'lead_validate_ok', 'validateLeadInput валидные данные', () => {
    const e = validateLeadInput({ email: DEMO_LEAD_EMAIL, name: 'Тестер' })
    return e.length === 0
  })

  tryPush(results, 'lead_validate_phone_garbage', 'validateLeadInput мусор в телефоне', () => {
    const e = validateLeadInput({ email: DEMO_LEAD_EMAIL, name: 'Тестер', phone: 'abc' })
    return e.length === 1 && e[0]!.field === 'phone'
  })

  tryPush(results, 'lead_validate_phone_ok', 'validateLeadInput телефон с +', () => {
    const e = validateLeadInput({ email: DEMO_LEAD_EMAIL, name: 'Тестер', phone: '+79991234567' })
    return e.length === 0
  })

  tryPush(results, 'lead_validate_email_trim', 'validateLeadInput email с пробелами', () => {
    const e = validateLeadInput({ email: '   ' + DEMO_LEAD_EMAIL + '   ', name: 'Тестер' })
    return e.length === 0
  })

  tryPush(results, 'lead_buildAddUserArgs_minimal', 'buildAddUserArgs минимальные', () => {
    const args = buildAddUserArgs({ email: DEMO_LEAD_EMAIL, name: 'Тестер' })
    if (!isObject(args.params)) return false
    const params = args.params
    if (!isObject(params.user)) return false
    const user = params.user as Record<string, unknown>
    return (
      user.email === DEMO_LEAD_EMAIL &&
      user.name === 'Тестер' &&
      isObject(params.system) &&
      (params.system as Record<string, unknown>).refresh_if_exists === 1
    )
  })

  tryPush(results, 'lead_buildAddUserArgs_phone', 'buildAddUserArgs c телефоном', () => {
    const args = buildAddUserArgs({ email: DEMO_LEAD_EMAIL, name: 'Тестер', phone: '+79991234567' })
    if (!isObject(args.params)) return false
    const user = (args.params as Record<string, unknown>).user as Record<string, unknown>
    return user.phone === '+79991234567'
  })

  tryPush(
    results,
    'lead_buildAddUserArgs_no_phone_skipped',
    'buildAddUserArgs без телефона ключ не добавляется',
    () => {
      const args = buildAddUserArgs({ email: DEMO_LEAD_EMAIL, name: 'Тестер' })
      const user = (args.params as Record<string, unknown>).user as Record<string, unknown>
      return !('phone' in user)
    }
  )

  tryPush(results, 'lead_buildAddUserArgs_customFields', 'buildAddUserArgs c customFields', () => {
    const args = buildAddUserArgs({
      email: DEMO_LEAD_EMAIL,
      name: 'Тестер',
      customFields: { source: 'demo' }
    })
    const params = args.params as Record<string, unknown>
    return (
      isObject(params.user_addfields) &&
      (params.user_addfields as Record<string, unknown>).source === 'demo'
    )
  })

  tryPush(
    results,
    'lead_buildCreateDealArgs_no_offer',
    'buildCreateDealArgs без offer_code → null',
    () => {
      return (
        buildCreateDealArgs({ email: DEMO_LEAD_EMAIL, name: 'Тестер' } as LeadFormInput) === null
      )
    }
  )

  tryPush(
    results,
    'lead_buildCreateDealArgs_with_offer',
    'buildCreateDealArgs с offer_code',
    () => {
      const args = buildCreateDealArgs({
        email: DEMO_LEAD_EMAIL,
        name: 'Тестер',
        offerCode: 'webinar-lead'
      } as LeadFormInput)
      if (!args || !isObject(args.params)) return false
      const params = args.params as Record<string, unknown>
      return (
        isObject(params.user) &&
        (params.user as Record<string, unknown>).email === DEMO_LEAD_EMAIL &&
        isObject(params.deal) &&
        (params.deal as Record<string, unknown>).offer_code === 'webinar-lead'
      )
    }
  )

  tryPush(
    results,
    'lead_demo_email_const',
    'DEMO_LEAD_EMAIL фиксирован как tester@khudoley.pro',
    () => {
      return DEMO_LEAD_EMAIL === 'tester@khudoley.pro'
    }
  )

  return results
}
