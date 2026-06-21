/**
 * Юнит-набор клиентской панели LifePay
 * (implementation-plan §1.8.2, §1.8.3; критерий приёмки №8).
 *
 * Не требует Heap и сети: проверяет чистые функции сборки URL, маскировки,
 * парсинга webhook, валидаций настроек. Покрытие веток §10:
 *   - сборка URL для POST/GET;
 *   - args без секретов;
 *   - редакция email/phone;
 *   - валидация login/токена;
 *   - парсинг webhook + извлечение order.number;
 *   - проверка токена webhook.
 *
 * Тонкий оркестратор: типы и помощники — в lifepayUnitHelpers,
 * сами проверки разнесены по фазам в lifepayUnitPhase<N><Name>
 * ради лимита размера файла. Здесь — публичная runLifepayUnitChecks.
 */

import { type LifepayUnitTestResult } from './lifepayUnitHelpers'
import { runCatalogChecks, runUrlBuildChecks } from './lifepayUnitPhase1Catalog'
import { runRedactionChecks, runRedactRawDeepChecks } from './lifepayUnitPhase2Redaction'
import { runSettingsValidationChecks, runDateFilterChecks } from './lifepayUnitPhase3Settings'
import {
  runWebhookParseChecks,
  runWebhookReadChecks,
  runWebhookTokenChecks,
  runGcDealUpdateChecks
} from './lifepayUnitPhase4Webhook'
import { runCorrelationChecks, runAccessChecks } from './lifepayUnitPhase5Correlation'

export type { LifepayUnitTestResult } from './lifepayUnitHelpers'

export async function runLifepayUnitChecks(): Promise<{
  success: boolean
  results: LifepayUnitTestResult[]
  summary: { total: number; passed: number; failed: number }
}> {
  const results: LifepayUnitTestResult[] = []

  runCatalogChecks(results)
  runUrlBuildChecks(results)
  runRedactionChecks(results)
  runRedactRawDeepChecks(results)
  runSettingsValidationChecks(results)
  runDateFilterChecks(results)
  runWebhookParseChecks(results)
  await runWebhookReadChecks(results)
  runWebhookTokenChecks(results)
  runGcDealUpdateChecks(results)
  runCorrelationChecks(results)
  runAccessChecks(results)

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  return {
    success: failed === 0,
    results,
    summary: { total: results.length, passed, failed }
  }
}
