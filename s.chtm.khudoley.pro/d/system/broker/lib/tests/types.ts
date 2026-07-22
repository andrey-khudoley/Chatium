/** Общие типы персистентного тестового набора (§9) — используются run-tests.ts и suites/*. */

export type TestResult = { success: boolean; message: string; error?: string }

export type TestImpl = (ctx: RichUgcCtx) => Promise<string>
