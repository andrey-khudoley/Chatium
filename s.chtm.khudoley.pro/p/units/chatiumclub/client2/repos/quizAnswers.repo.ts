import QuizAnswers, { type QuizAnswersRow } from '../tables/quizAnswers.table'
import * as loggerLib from '../lib/logger.lib'

const LOG_MODULE = 'repos/quizAnswers.repo'

export type QuizAnswerCreateData = {
  quizId: string
  email: string
  name: string
  answers: Array<{ questionId: string; value: string | string[] | number }>
  gcSyncOk: boolean
  gcSyncErrorCode?: string
  gatewayRequestId?: string
}

export async function create(ctx: app.Ctx, data: QuizAnswerCreateData): Promise<QuizAnswersRow> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create entry`,
    payload: {
      quizId: data.quizId,
      email: data.email,
      answersCount: data.answers.length,
      gcSyncOk: data.gcSyncOk
    }
  })
  const row = await QuizAnswers.create(ctx, {
    quizId: data.quizId,
    email: data.email,
    name: data.name,
    answers: data.answers,
    gcSyncOk: data.gcSyncOk,
    gcSyncErrorCode: data.gcSyncErrorCode ?? '',
    gatewayRequestId: data.gatewayRequestId ?? '',
    completedAt: Date.now()
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create exit`,
    payload: { id: row.id }
  })
  return row
}

export async function findRecent(ctx: app.Ctx, limit: number = 50): Promise<QuizAnswersRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findRecent entry`,
    payload: { limit }
  })
  const rows = await QuizAnswers.findAll(ctx, {
    order: [{ completedAt: 'desc' }],
    limit
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findRecent exit`,
    payload: { count: rows.length }
  })
  return rows
}

export async function countAll(ctx: app.Ctx): Promise<number> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] countAll entry`,
    payload: {}
  })
  const count = await QuizAnswers.countBy(ctx, {})
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] countAll exit`,
    payload: { count }
  })
  return count
}
