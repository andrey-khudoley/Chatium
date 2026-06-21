/**
 * Конфигурация квиза App B (демо-каркас, прототип): 4 вопроса, ID `main-quiz-v1`.
 * SSOT для серверной валидации и (опц.) клиентской отрисовки.
 */

export type QuizQuestionType = 'single-choice' | 'multiple-choice' | 'text' | 'scale'

export type QuizQuestion = {
  id: string
  type: QuizQuestionType
  text: string
  options?: string[]
  required: boolean
  /** Минимум для scale (включительно). */
  scaleMin?: number
  /** Максимум для scale (включительно). */
  scaleMax?: number
  /** Максимум символов для text. */
  maxLength?: number
}

export const QUIZ_ID = 'main-quiz-v1'

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'platform',
    type: 'single-choice',
    text: 'Какую платформу для онлайн-школы вы используете?',
    options: ['GetCourse', 'Другая', 'Пока не определился'],
    required: true
  },
  {
    id: 'goal',
    type: 'multiple-choice',
    text: 'Что хотите автоматизировать в первую очередь?',
    options: ['Регистрацию пользователей', 'Оплаты', 'Уведомления', 'Аналитику'],
    required: true
  },
  {
    id: 'experience',
    type: 'scale',
    text: 'Ваш уровень технической экспертизы (1 — начинающий, 10 — разработчик)',
    required: true,
    scaleMin: 1,
    scaleMax: 10
  },
  {
    id: 'use_case',
    type: 'text',
    text: 'Опишите кейс, который хотите решить',
    required: false,
    maxLength: 1000
  }
]

const QUESTIONS_BY_ID: Record<string, QuizQuestion> = (() => {
  const out: Record<string, QuizQuestion> = {}
  for (const q of QUIZ_QUESTIONS) {
    out[q.id] = q
  }
  return out
})()

export function findQuizQuestion(id: string): QuizQuestion | undefined {
  return QUESTIONS_BY_ID[id]
}
