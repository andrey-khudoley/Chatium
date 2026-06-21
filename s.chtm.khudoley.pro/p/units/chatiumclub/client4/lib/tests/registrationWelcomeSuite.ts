/**
 * Юнит-набор сценария D (регистрация → приветствие в боте): синхронные проверки без Heap.
 * Покрывает безопасное сравнение токенов, нормализацию событий GC и подстановку шаблона.
 */
import {
  normalizeRegistrationEvent,
  renderWelcomeMessage,
  DEFAULT_WELCOME_TEMPLATE
} from '../registrationWelcome.lib'
import { safeEqualToken } from '../webhookSecret.lib'

export type RegistrationWelcomeUnitTestResult = {
  id: string
  title: string
  passed: boolean
  error?: string
}

function tryPush(
  results: RegistrationWelcomeUnitTestResult[],
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

export function runRegistrationWelcomeUnitChecks(): RegistrationWelcomeUnitTestResult[] {
  const results: RegistrationWelcomeUnitTestResult[] = []

  // safeEqualToken
  tryPush(results, 'webhook_safeEqualToken_equal', 'safeEqualToken равные строки', () => {
    return safeEqualToken('abc123XYZ', 'abc123XYZ')
  })
  tryPush(results, 'webhook_safeEqualToken_diff', 'safeEqualToken разные строки', () => {
    return !safeEqualToken('abc123XYZ', 'abc123XYZ_')
  })
  tryPush(results, 'webhook_safeEqualToken_empty', 'safeEqualToken пустые строки', () => {
    return !safeEqualToken('', '') && !safeEqualToken('a', '') && !safeEqualToken('', 'b')
  })
  tryPush(results, 'webhook_safeEqualToken_length_diff', 'safeEqualToken разная длина', () => {
    return !safeEqualToken('short', 'mucholongerstring')
  })
  tryPush(results, 'webhook_safeEqualToken_non_strings', 'safeEqualToken не-строки', () => {
    return !safeEqualToken(1 as unknown as string, '1')
  })

  // normalizeRegistrationEvent
  tryPush(results, 'normalize_empty_payload', 'normalizeRegistrationEvent пустой объект', () => {
    const e = normalizeRegistrationEvent({})
    return e.email === '' && e.activityId === '' && e.activityName === '' && e.gcEventId === ''
  })

  tryPush(results, 'normalize_user_email_top', 'normalizeRegistrationEvent email на user', () => {
    const e = normalizeRegistrationEvent({
      user: { email: 'a@b.c', name: 'Иван' },
      training: { id: '777', name: 'Демо-вебинар', start_date: '2026-06-01' }
    })
    return (
      e.email === 'a@b.c' &&
      e.name === 'Иван' &&
      e.activityId === '777' &&
      e.activityName === 'Демо-вебинар' &&
      e.activityDate === '2026-06-01'
    )
  })

  tryPush(
    results,
    'normalize_event_id_synthetic',
    'normalizeRegistrationEvent синтетический event_id',
    () => {
      const e = normalizeRegistrationEvent({ user: { email: 'a@b.c' }, training: { id: '777' } })
      return e.gcEventId === 'reg_a@b.c_777'
    }
  )

  tryPush(results, 'normalize_event_id_explicit', 'normalizeRegistrationEvent явный id', () => {
    const e = normalizeRegistrationEvent({ id: 'gc-evt-1', user: { email: 'a@b.c' } })
    return e.gcEventId === 'gc-evt-1'
  })

  tryPush(
    results,
    'normalize_webinar_synonym',
    'normalizeRegistrationEvent синоним webinar',
    () => {
      const e = normalizeRegistrationEvent({ webinar: { id: '999', title: 'Вебинар X' } })
      return e.activityId === '999' && e.activityName === 'Вебинар X'
    }
  )

  tryPush(results, 'normalize_root_synonyms', 'normalizeRegistrationEvent синонимы корня', () => {
    const e = normalizeRegistrationEvent({
      email: 'root@b.c',
      training_id: 'tid',
      training_name: 'Treñ-Name'
    })
    return e.email === 'root@b.c' && e.activityId === 'tid' && e.activityName === 'Treñ-Name'
  })

  // renderWelcomeMessage
  tryPush(results, 'render_default_template', 'renderWelcomeMessage по дефолтному шаблону', () => {
    const text = renderWelcomeMessage(DEFAULT_WELCOME_TEMPLATE, {
      gcEventId: 'x',
      email: 'a@b.c',
      name: 'Иван',
      activityId: '777',
      activityName: 'Демо-вебинар',
      activityDate: '2026-06-01',
      dialogId: '',
      userId: ''
    })
    return text.includes('Иван') && text.includes('Демо-вебинар') && text.includes('2026-06-01')
  })

  tryPush(results, 'render_no_name_fallback', 'renderWelcomeMessage без имени → "участник"', () => {
    const text = renderWelcomeMessage('{{name}}-{{activityName}}-{{activityDate}}', {
      gcEventId: '',
      email: '',
      name: '',
      activityId: '',
      activityName: '',
      activityDate: '',
      dialogId: '',
      userId: ''
    })
    return text === 'участник-мероприятие в GetCourse-'
  })

  tryPush(results, 'render_replace_all', 'renderWelcomeMessage заменяет все вхождения', () => {
    const text = renderWelcomeMessage('{{name}} {{name}}', {
      gcEventId: '',
      email: '',
      name: 'Иван',
      activityId: '',
      activityName: '',
      activityDate: '',
      dialogId: '',
      userId: ''
    })
    return text === 'Иван Иван'
  })

  return results
}
