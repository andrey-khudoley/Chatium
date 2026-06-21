import * as loggerLib from './logger.lib'
import * as quizRepo from '../repos/quizAnswers.repo'
import { invoke } from './gateway/gatewayClient'
import { QUIZ_ID, QUIZ_QUESTIONS, findQuizQuestion } from './quizConfig'

const LOG_MODULE = 'lib/quizFlow.lib'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type RawQuizAnswerValue = string | string[] | number | undefined | null
export type RawQuizAnswers = Record<string, RawQuizAnswerValue>

export type QuizValidationError = { questionId: string; message: string }

export type QuizSubmitInput = {
  email: string
  name?: string
  answers: RawQuizAnswers
  /**
   * Опционально включить синхронизацию с GC (`updateUserCustomFields`).
   * Если не задано — берётся `true` при наличии email и SDK-настроек, иначе квиз
   * сохраняется только в Heap App B (план §1.8.3).
   */
  syncToGc?: boolean
}

export type NormalizedAnswer = { questionId: string; value: string | string[] | number }

/**
 * Валидация и нормализация ответов согласно `QUIZ_QUESTIONS`.
 * Сбрасывает неизвестные questionId, проверяет required/scale/options.
 */
export function validateAnswers(input: { email?: string; answers?: RawQuizAnswers }): {
  errors: QuizValidationError[]
  normalized: NormalizedAnswer[]
} {
  const errors: QuizValidationError[] = []
  const normalized: NormalizedAnswer[] = []

  const email = typeof input.email === 'string' ? input.email.trim() : ''
  if (!email) {
    errors.push({ questionId: '__email', message: 'Email обязателен' })
  } else if (!EMAIL_RE.test(email)) {
    errors.push({ questionId: '__email', message: 'Некорректный формат email' })
  }

  const answers = (input.answers ?? {}) as RawQuizAnswers

  for (const q of QUIZ_QUESTIONS) {
    const raw = answers[q.id]
    if (raw === undefined || raw === null || raw === '') {
      if (q.required) {
        errors.push({ questionId: q.id, message: 'Ответ обязателен' })
      }
      continue
    }
    if (q.type === 'single-choice') {
      const v = String(raw)
      if (!q.options?.includes(v)) {
        errors.push({ questionId: q.id, message: 'Недопустимый вариант ответа' })
        continue
      }
      normalized.push({ questionId: q.id, value: v })
    } else if (q.type === 'multiple-choice') {
      const arr = Array.isArray(raw) ? raw.map((x) => String(x)) : [String(raw)]
      const filtered = arr.filter((v) => q.options?.includes(v))
      if (filtered.length === 0) {
        if (q.required) {
          errors.push({ questionId: q.id, message: 'Выберите хотя бы один вариант' })
        }
        continue
      }
      normalized.push({ questionId: q.id, value: filtered })
    } else if (q.type === 'scale') {
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw))
      const min = q.scaleMin ?? 1
      const max = q.scaleMax ?? 10
      if (!Number.isFinite(n) || n < min || n > max) {
        errors.push({ questionId: q.id, message: `Допустимо число от ${min} до ${max}` })
        continue
      }
      normalized.push({ questionId: q.id, value: Math.round(n) })
    } else if (q.type === 'text') {
      const v = String(raw).trim()
      if (q.maxLength && v.length > q.maxLength) {
        errors.push({ questionId: q.id, message: `Не более ${q.maxLength} символов` })
        continue
      }
      if (!v) {
        if (q.required) {
          errors.push({ questionId: q.id, message: 'Ответ обязателен' })
        }
        continue
      }
      normalized.push({ questionId: q.id, value: v })
    }
  }

  return { errors, normalized }
}

/** Преобразование нормализованных ответов в `customFields` для GC (`updateUserCustomFields`). */
export function answersToCustomFields(answers: NormalizedAnswer[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const a of answers) {
    out[`quiz_${a.questionId}`] = Array.isArray(a.value) ? a.value.join(', ') : String(a.value)
  }
  return out
}

/** Поиск пользователя в GC: гарантия наличия `UserIdentifier.email` для updateUserCustomFields. */
export function buildUpdateUserCustomFieldsArgs(
  email: string,
  answers: NormalizedAnswer[]
): Record<string, unknown> {
  return {
    UserIdentifier: { email },
    customFields: answersToCustomFields(answers)
  }
}

export type QuizSubmitResult = {
  ok: boolean
  recordId: string
  validationErrors: QuizValidationError[]
  gcSync: { ok: boolean; skipped: boolean; errorCode?: string; requestId: string | null }
}

/**
 * Полный цикл App B:
 * 1. Валидация и нормализация ответов.
 * 2. Запись в Heap (всегда, до GC) — Heap == SSOT квиза, спека B §4.
 * 3. Опц. invoke('updateUserCustomFields', ...) — план §1.3 (опц. для прототипа).
 *
 * Возвращает структурированный результат — без бросания исключений.
 */
export async function processQuizSubmit(
  ctx: app.Ctx,
  input: QuizSubmitInput
): Promise<QuizSubmitResult> {
  const startedAt = Date.now()
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] processQuizSubmit entry`,
    payload: {
      hasEmail: !!input?.email,
      answerKeys: Object.keys(input?.answers ?? {}),
      syncToGcRequested: input?.syncToGc !== false
    }
  })

  const { errors, normalized } = validateAnswers({ email: input?.email, answers: input?.answers })
  if (errors.length > 0) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] processQuizSubmit validation failed`,
      payload: { errors }
    })
    return {
      ok: false,
      recordId: '',
      validationErrors: errors,
      gcSync: { ok: false, skipped: true, requestId: null }
    }
  }

  const email = String(input.email).trim()
  const name = typeof input?.name === 'string' ? input.name.trim() : ''

  let gcSync: QuizSubmitResult['gcSync'] = {
    ok: false,
    skipped: true,
    requestId: null
  }

  if (input.syncToGc !== false) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] processQuizSubmit invoke updateUserCustomFields`,
      payload: { email, fieldsCount: normalized.length }
    })
    const r = await invoke(ctx, {
      op: 'updateUserCustomFields',
      args: buildUpdateUserCustomFieldsArgs(email, normalized)
    })
    let errorCode: string | null = null
    if ('error' in r && r.error) {
      errorCode = r.error.code
    }
    if (r.ok) {
      gcSync = { ok: true, skipped: false, requestId: r.requestId }
    } else {
      gcSync = { ok: false, skipped: false, errorCode: errorCode ?? '', requestId: r.requestId }
    }
    await loggerLib.writeServerLog(ctx, {
      severity: r.ok ? 6 : 4,
      message: `[${LOG_MODULE}] processQuizSubmit updateUserCustomFields result`,
      payload: {
        ok: r.ok,
        errorCode,
        gatewayHttpStatus: r.gatewayHttpStatus,
        requestId: r.requestId
      }
    })
  } else {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] processQuizSubmit GC sync explicitly disabled`,
      payload: {}
    })
  }

  const row = await quizRepo.create(ctx, {
    quizId: QUIZ_ID,
    email,
    name,
    answers: normalized,
    gcSyncOk: gcSync.ok,
    gcSyncErrorCode: gcSync.ok ? '' : (gcSync.errorCode ?? ''),
    ...(gcSync.requestId ? { gatewayRequestId: gcSync.requestId } : {})
  })

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] processQuizSubmit exit`,
    payload: {
      recordId: String(row.id),
      gcSyncOk: gcSync.ok,
      gcSyncSkipped: gcSync.skipped,
      durationMs: Date.now() - startedAt
    }
  })

  // Базовый успех — это запись в Heap (Heap = SSOT квиза по спеке B §4).
  // GC-синхронизация опциональна, её отказ не делает submit неуспешным.
  return {
    ok: true,
    recordId: String(row.id),
    validationErrors: [],
    gcSync
  }
}

/**
 * Подмена для дебага: выдать перечень всех вопросов квиза с полем `answered`.
 * Используется тестовой страницей и админкой. Не делает запросов наружу.
 */
export function describeQuizForUi(): {
  quizId: string
  questions: Array<{
    id: string
    type: string
    text: string
    options?: string[]
    required: boolean
  }>
} {
  return {
    quizId: QUIZ_ID,
    questions: QUIZ_QUESTIONS.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      ...(q.options ? { options: q.options } : {}),
      required: q.required
    }))
  }
}

// Экспорт для удобства внешних потребителей
export { QUIZ_ID, QUIZ_QUESTIONS, findQuizQuestion }
