/**
 * Пишет в серверный лог каждый проваленный тест (видно в админке / Heap при типичных уровнях логирования).
 * Severity 3 — сообщение не отфильтровывается при log_level = Error (в отличие от 4–7).
 */
import * as loggerLib from '../logger.lib'

export type TestRunRow = {
  id: string
  title: string
  passed: boolean
  error?: string
}

export async function logTestRunFailures(
  ctx: app.Ctx,
  logPath: string,
  results: ReadonlyArray<TestRunRow>
): Promise<void> {
  for (const r of results) {
    if (r.passed) continue
    const errText = (r.error && String(r.error).trim()) || 'passed: false (подробности в payload)'
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${logPath}] FAIL ${r.id}: ${r.title} — ${errText}`,
      payload: { testId: r.id, title: r.title, error: errText }
    })
  }
}
