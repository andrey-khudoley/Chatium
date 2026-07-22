import { setLogLevel } from '../log/settings'
import { TEST_CATEGORIES } from '../../shared/tests/test-definitions'
import { sweep, fireLogProbe } from './helpers'
import { databaseTests } from './suites/database'
import { functionalTests } from './suites/functional'
import { apiTests } from './suites/api'
import { integrationTests } from './suites/integration'
import { concurrencyTests } from './suites/concurrency'
import { limitsTests } from './suites/limits'
import type { TestImpl, TestResult } from './types'

export type { TestResult }

/**
 * Реестр реализаций (ключ — category.name / test.name из TEST_CATEGORIES).
 * Разбит по файлам suites/* (фикс-раунда 1, п.7) — этот файл лишь собирает
 * реестр и раннер, сами тесты — в lib/tests/suites/{database,functional,api,
 * integration,concurrency,limits}.ts. Сигнатуры и структура реестра не менялись.
 */
const TEST_IMPLS: Record<string, Record<string, TestImpl>> = {
  database: databaseTests,
  functional: functionalTests,
  api: apiTests,
  integration: integrationTests,
  concurrency: concurrencyTests,
  limits: limitsTests
}

export async function runSingleTest(
  ctx: RichUgcCtx,
  category: string,
  name: string
): Promise<TestResult> {
  try {
    const fn = TEST_IMPLS[category]?.[name]
    if (!fn) {
      return { success: false, message: `Неизвестный тест: ${category}/${name}` }
    }
    const message = await fn(ctx)
    return { success: true, message }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    return { success: false, message: err.message, error: err.stack }
  }
}

export type RunAllTestsSummary = {
  total: number
  passed: number
  failed: number
  duration: number
  success: boolean
}

export type RunAllTestsResult = {
  summary: RunAllTestsSummary
  results: Array<{ category: string; test: string; success: boolean; message: string }>
}

export type RunAllTestsOptions = {
  /** Прогнать только одну категорию (фикс-раунда 1, п.16б — запасной ход при переросте бюджета). */
  category?: string
}

export async function runAllTests(
  ctx: RichUgcCtx,
  opts: RunAllTestsOptions = {}
): Promise<RunAllTestsResult> {
  const startedAt = Date.now()

  // Невалидная категория — ошибка, а не «зелёный прогон из нуля тестов»
  // (фикс-раунда 2): опечатка в ?category давала бы total=0, success=true.
  if (opts.category && !TEST_CATEGORIES.some((c) => c.name === opts.category)) {
    return {
      summary: { total: 0, passed: 0, failed: 1, duration: Date.now() - startedAt, success: false },
      results: [
        {
          category: opts.category,
          test: 'unknown_category',
          success: false,
          message: `Неизвестная категория "${opts.category}". Допустимые: ${TEST_CATEGORIES.map((c) => c.name).join(', ')}`
        }
      ]
    }
  }

  // Самовосстановление уровня логирования (фикс-раунда 1, п.12а) — убитая на
  // середине проба (api/tests/log-probe.ts) могла оставить log_level ниже
  // 'Info'; принудительный сброс в начале прогона не даёт этому маскировать
  // писанные ниже логи текущего прогона.
  await setLogLevel(ctx, 'Info')

  await sweep(ctx)

  const categories = opts.category
    ? TEST_CATEGORIES.filter((c) => c.name === opts.category)
    : TEST_CATEGORIES

  // Фаза «запись» двухфазного лог-теста — в начале прогона (фикс RV 22-07-2026):
  // CH-видимость записи занимает секунды, поллинг внутри теста не успевал; выстрел
  // здесь даёт записи всё время прогона на доезд до account_logs. Читает —
  // log_two_phase (в конце integration-категории) через takePendingLogProbe().
  if (categories.some((c) => c.name === 'integration')) {
    await fireLogProbe(ctx)
  }

  const results: Array<{ category: string; test: string; success: boolean; message: string }> = []
  for (const category of categories) {
    for (const test of category.tests) {
      const result = await runSingleTest(ctx, category.name, test.name)
      results.push({
        category: category.name,
        test: test.name,
        success: result.success,
        message: result.message
      })
    }
  }

  await sweep(ctx)

  const passed = results.filter((r) => r.success).length
  const failed = results.length - passed

  return {
    summary: {
      total: results.length,
      passed,
      failed,
      duration: Date.now() - startedAt,
      success: failed === 0
    },
    results
  }
}
