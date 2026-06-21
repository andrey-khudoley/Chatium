/**
 * Юнит-набор `lib/gateway/` (синхронные проверки без Heap). Покрывает классификаторы и
 * extract'ы по реальному контракту LifePay (apidoc.life-pay.ru/bill/index), отсутствие
 * неканонических значений `lpRule`, сборку query исходящего вызова и маскировку секретов в логах.
 *
 * Группы проверок и фикстуры вынесены в `gatewayUnitSuiteChecks.ts`; здесь — публичный раннер.
 */

import { toOperationSummaries } from '../gateway/operationsCatalog'
import { type GatewayUnitTestResult, tryPush } from './gatewayUnitSuiteHelpers'
import { runBillsV1SemanticChecks } from './gatewayUnitSuiteBillsChecks'
import {
  runCredentialsMaskingChecks,
  runRedactRawDeepChecks,
  runGatewayCatalogSyncCheck
} from './gatewayUnitSuiteChecks'

export type { GatewayUnitTestResult } from './gatewayUnitSuiteHelpers'

export function runGatewayUnitChecks(): GatewayUnitTestResult[] {
  const results: GatewayUnitTestResult[] = []

  runBillsV1SemanticChecks(results)
  runCredentialsMaskingChecks(results)
  runRedactRawDeepChecks(results)

  // Smoke: обход рантайм-валидатора (`@app/schema`) в argsTree не деградировал в 'any'.
  // Ловит тихий слом интроспекции (`as RawSchema`) при смене внутренней структуры схемы.
  tryPush(
    results,
    'gw_catalog_argsTree_resolved',
    'toOperationSummaries: argsTree createBill раскрыт (amount, customerEmail)',
    () => {
      const createBill = toOperationSummaries().find((s) => s.op === 'createBill')
      if (!createBill || createBill.argsTree.kind !== 'object') return false
      const amount = createBill.argsTree.fields.find((f) => f.name === 'amount')
      const email = createBill.argsTree.fields.find((f) => f.name === 'customerEmail')
      return (
        !!amount &&
        amount.node.kind === 'scalar' &&
        amount.node.type === 'number' &&
        !!email &&
        email.node.kind === 'scalar'
      )
    }
  )

  const idsBeforeSyncCheck = results.map((r) => r.id)
  runGatewayCatalogSyncCheck(results, idsBeforeSyncCheck)

  return results
}
