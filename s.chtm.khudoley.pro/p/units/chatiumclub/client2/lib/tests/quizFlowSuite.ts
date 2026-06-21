/**
 * Юнит-набор сценария B (квиз → таблица): синхронные проверки без Heap.
 * Покрывает валидацию ответов и сборку args для invoke('updateUserCustomFields').
 */
import {
  validateAnswers,
  answersToCustomFields,
  buildUpdateUserCustomFieldsArgs,
  QUIZ_ID,
  QUIZ_QUESTIONS,
  type NormalizedAnswer
} from '../quizFlow.lib'

export type QuizUnitTestResult = { id: string; title: string; passed: boolean; error?: string }

function tryPush(
  results: QuizUnitTestResult[],
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

const TEST_EMAIL = 'tester@khudoley.pro'

export function runQuizUnitChecks(): QuizUnitTestResult[] {
  const results: QuizUnitTestResult[] = []

  tryPush(results, 'quiz_validate_no_email', 'validateAnswers без email', () => {
    const r = validateAnswers({ answers: { platform: 'GetCourse' } })
    return r.errors.some((e) => e.questionId === '__email')
  })

  tryPush(results, 'quiz_validate_bad_email', 'validateAnswers плохой email', () => {
    const r = validateAnswers({ email: 'no-at', answers: { platform: 'GetCourse' } })
    return r.errors.some((e) => e.questionId === '__email')
  })

  tryPush(results, 'quiz_validate_required_missing', 'validateAnswers required не заполнен', () => {
    const r = validateAnswers({ email: TEST_EMAIL, answers: {} })
    return r.errors.length > 0 && r.errors.some((e) => e.questionId === 'platform')
  })

  tryPush(
    results,
    'quiz_validate_optional_skipped',
    'validateAnswers optional поле пропускается',
    () => {
      const r = validateAnswers({
        email: TEST_EMAIL,
        answers: {
          platform: 'GetCourse',
          goal: ['Оплаты'],
          experience: 5
        }
      })
      return (
        r.errors.length === 0 &&
        r.normalized.length === 3 &&
        !r.normalized.some((n) => n.questionId === 'use_case')
      )
    }
  )

  tryPush(
    results,
    'quiz_validate_single_choice_invalid',
    'validateAnswers недопустимый single-choice',
    () => {
      const r = validateAnswers({
        email: TEST_EMAIL,
        answers: {
          platform: 'НетТакого',
          goal: ['Оплаты'],
          experience: 5
        }
      })
      return r.errors.some((e) => e.questionId === 'platform')
    }
  )

  tryPush(
    results,
    'quiz_validate_multiple_choice_filtered',
    'validateAnswers multiple-choice фильтрует мусор',
    () => {
      const r = validateAnswers({
        email: TEST_EMAIL,
        answers: {
          platform: 'GetCourse',
          goal: ['Оплаты', 'Несуществующее'],
          experience: 5
        }
      })
      const goal = r.normalized.find((n) => n.questionId === 'goal')
      return (
        r.errors.length === 0 &&
        Array.isArray(goal?.value) &&
        (goal!.value as string[]).length === 1
      )
    }
  )

  tryPush(
    results,
    'quiz_validate_scale_out_of_range',
    'validateAnswers scale вне диапазона',
    () => {
      const r = validateAnswers({
        email: TEST_EMAIL,
        answers: { platform: 'GetCourse', goal: ['Оплаты'], experience: 99 }
      })
      return r.errors.some((e) => e.questionId === 'experience')
    }
  )

  tryPush(results, 'quiz_validate_text_too_long', 'validateAnswers text > maxLength', () => {
    const r = validateAnswers({
      email: TEST_EMAIL,
      answers: {
        platform: 'GetCourse',
        goal: ['Оплаты'],
        experience: 5,
        use_case: 'x'.repeat(2000)
      }
    })
    return r.errors.some((e) => e.questionId === 'use_case')
  })

  tryPush(results, 'quiz_answersToCustomFields_basic', 'answersToCustomFields базовый', () => {
    const ans: NormalizedAnswer[] = [
      { questionId: 'platform', value: 'GetCourse' },
      { questionId: 'goal', value: ['Оплаты', 'Уведомления'] },
      { questionId: 'experience', value: 7 }
    ]
    const cf = answersToCustomFields(ans)
    return (
      cf.quiz_platform === 'GetCourse' &&
      cf.quiz_goal === 'Оплаты, Уведомления' &&
      cf.quiz_experience === '7'
    )
  })

  tryPush(results, 'quiz_buildArgs_shape', 'buildUpdateUserCustomFieldsArgs форма', () => {
    const args = buildUpdateUserCustomFieldsArgs(TEST_EMAIL, [
      { questionId: 'platform', value: 'GetCourse' }
    ]) as Record<string, unknown>
    const ui = args.UserIdentifier as Record<string, unknown> | undefined
    const cf = args.customFields as Record<string, unknown> | undefined
    return ui?.email === TEST_EMAIL && cf?.quiz_platform === 'GetCourse'
  })

  tryPush(results, 'quiz_id_const', 'QUIZ_ID === "main-quiz-v1"', () => {
    return QUIZ_ID === 'main-quiz-v1'
  })

  tryPush(results, 'quiz_questions_unique_ids', 'QUIZ_QUESTIONS уникальные id', () => {
    const ids = QUIZ_QUESTIONS.map((q) => q.id)
    return new Set(ids).size === ids.length
  })

  return results
}
