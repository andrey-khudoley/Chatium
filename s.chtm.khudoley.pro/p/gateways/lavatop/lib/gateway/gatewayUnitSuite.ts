/**
 * Юнит-проверки контура gateway Lava.Top (без Heap и сети). Вызывается из `api/tests/unit`.
 * Покрывает: валидаторы каталога, маскирование секрета, сборку тела инвойса, семантику ответов,
 * дедуп-ключ вебхука, wire-форму каталога, маскирование секретов в redactRaw.
 */

import { findOperation, toOperationSummaries } from './operationsCatalog'
import { maskLavaApikey } from './lavaCredentials'
import { buildCreateInvoiceBody, isSafeForwardUrl } from './buildCreateInvoiceBody'
import type { CreateInvoiceArgs } from './buildCreateInvoiceBody'
import { classifyCreateInvoiceResponse, extractCreateInvoiceSuccess } from './invoicesV1Semantic'
import { buildDedupeKey } from '../webhook/webhookRelay.service'
import { redactRawDeep } from '../../shared/redactRaw'

export type GatewayUnitTestResult = { id: string; title: string; passed: boolean; error?: string }

function push(
  results: GatewayUnitTestResult[],
  id: string,
  title: string,
  passed: boolean,
  error?: string
): void {
  results.push({ id, title, passed, ...(error ? { error } : {}) })
}

function tryc(
  results: GatewayUnitTestResult[],
  id: string,
  title: string,
  fn: () => boolean
): void {
  try {
    push(results, id, title, fn())
  } catch (e) {
    push(results, id, title, false, (e as Error)?.message ?? String(e))
  }
}

function safeParseOp(op: string, data: unknown): boolean {
  const entry = findOperation(op)
  if (!entry) return false
  return entry.argsValidator.safeParse(data).success === true
}

export function runGatewayUnitChecks(): GatewayUnitTestResult[] {
  const results: GatewayUnitTestResult[] = []

  // --- Каталог: валидаторы args ---
  tryc(results, 'gw_catalog_createInvoice_valid', 'createInvoice: валидные args', () =>
    safeParseOp('createInvoice', {
      email: 'a@b.com',
      offerId: 'off_1',
      currency: 'RUB'
    })
  )

  tryc(
    results,
    'gw_catalog_createInvoice_missing_offer',
    'createInvoice: без offerId → fail',
    () => safeParseOp('createInvoice', { email: 'a@b.com', currency: 'RUB' }) === false
  )

  tryc(
    results,
    'gw_catalog_createInvoice_with_callback',
    'createInvoice: callbackUrl допустим',
    () =>
      safeParseOp('createInvoice', {
        email: 'a@b.com',
        offerId: 'off_1',
        currency: 'RUB',
        callbackUrl: 'https://shop.example/hook?o=1'
      })
  )

  tryc(results, 'gw_catalog_getInvoiceStatus_valid', 'getInvoiceStatus: { id }', () =>
    safeParseOp('getInvoiceStatus', { id: 'c-123' })
  )

  tryc(
    results,
    'gw_catalog_getInvoiceStatus_missing',
    'getInvoiceStatus: пустой → fail',
    () => safeParseOp('getInvoiceStatus', {}) === false
  )

  tryc(results, 'gw_catalog_updateOfferPrice_valid', 'updateOfferPrice: offers[] структура', () =>
    safeParseOp('updateOfferPrice', {
      productId: 'p1',
      offers: [{ id: 'off_1', prices: [{ amount: 100, currency: 'RUB' }] }]
    })
  )

  tryc(
    results,
    'gw_catalog_updateOfferPrice_bad_offers',
    'updateOfferPrice: offers не массив → fail',
    () => safeParseOp('updateOfferPrice', { productId: 'p1', offers: 'nope' }) === false
  )

  tryc(
    results,
    'gw_catalog_listProducts_optional',
    'listProducts: nextPage опционален',
    () =>
      safeParseOp('listProducts', {}) &&
      safeParseOp('listProducts', { nextPage: 'https://gate.lava.top/x' })
  )

  // --- Маскирование секрета ---
  tryc(results, 'gw_mask_apikey_no_leak', 'maskLavaApikey не раскрывает ключ', () => {
    const masked = maskLavaApikey('super-secret-key-123')
    return !masked.includes('super-secret-key-123') && masked.startsWith('key_len:')
  })

  // --- buildCreateInvoiceBody ---
  tryc(
    results,
    'gw_build_body_excludes_callback',
    'тело Lava.Top без callbackUrl/clientOrderId',
    () => {
      const args: CreateInvoiceArgs = {
        email: 'a@b.com',
        offerId: 'off_1',
        currency: 'RUB',
        callbackUrl: 'https://shop.example/hook',
        clientOrderId: 'ord_1'
      }
      const body = buildCreateInvoiceBody(args) as Record<string, unknown>
      return (
        body.email === 'a@b.com' &&
        body.offerId === 'off_1' &&
        body.currency === 'RUB' &&
        !('callbackUrl' in body) &&
        !('clientOrderId' in body)
      )
    }
  )

  tryc(results, 'gw_build_body_optional_fields', 'опц. поля включаются только если заданы', () => {
    const minimal = buildCreateInvoiceBody({
      email: 'a@b.com',
      offerId: 'off_1',
      currency: 'EUR'
    }) as Record<string, unknown>
    const withProvider = buildCreateInvoiceBody({
      email: 'a@b.com',
      offerId: 'off_1',
      currency: 'EUR',
      paymentProvider: 'BANK131'
    }) as Record<string, unknown>
    return !('paymentProvider' in minimal) && withProvider.paymentProvider === 'BANK131'
  })

  // --- Семантика ответа createInvoice ---
  tryc(
    results,
    'gw_semantic_extract_contractId',
    'extractCreateInvoiceSuccess: id → contractId',
    () => {
      const success = extractCreateInvoiceSuccess({
        id: 'contract-9',
        paymentUrl: 'https://pay.lava.top/x',
        status: 'in-progress'
      })
      return (
        success?.contractId === 'contract-9' && success?.paymentUrl === 'https://pay.lava.top/x'
      )
    }
  )

  tryc(results, 'gw_semantic_missing_payment_url', 'нет paymentUrl → missing_payment_url', () => {
    const r = classifyCreateInvoiceResponse({ id: 'contract-9' })
    return r?.rule === 'invoices_v1_missing_payment_url'
  })

  tryc(results, 'gw_semantic_missing_contract_id', 'нет id → missing_contract_id', () => {
    const r = classifyCreateInvoiceResponse({ paymentUrl: 'https://pay.lava.top/x' })
    return r?.rule === 'invoices_v1_missing_contract_id'
  })

  tryc(results, 'gw_semantic_ok', 'полный ответ → null (успех)', () => {
    const r = classifyCreateInvoiceResponse({ id: 'c', paymentUrl: 'https://pay.lava.top/x' })
    return r === null
  })

  // --- Дедуп-ключ вебхука ---
  tryc(results, 'gw_webhook_dedupe_key', 'buildDedupeKey: eventType:contractId:status', () => {
    const key = buildDedupeKey({
      eventType: 'payment.success',
      contractId: 'c-1',
      status: 'completed'
    })
    return key === 'payment.success:c-1:completed'
  })

  tryc(results, 'gw_webhook_dedupe_key_no_status', 'buildDedupeKey без status → na', () => {
    const key = buildDedupeKey({ eventType: 'subscription.cancelled', contractId: 'c-2' })
    return key === 'subscription.cancelled:c-2:na'
  })

  // --- Wire-форма каталога ---
  tryc(results, 'gw_operations_summary', 'toOperationSummaries: 4 операции + argsTree', () => {
    const ops = toOperationSummaries()
    const createInvoice = ops.find((o) => o.op === 'createInvoice')
    return (
      ops.length === 4 &&
      createInvoice != null &&
      createInvoice.argsTree.kind === 'object' &&
      createInvoice.httpMethod === 'POST'
    )
  })

  tryc(results, 'gw_operations_updateOfferPrice_post', 'updateOfferPrice httpMethod = POST', () => {
    const ops = toOperationSummaries()
    return ops.find((o) => o.op === 'updateOfferPrice')?.httpMethod === 'POST'
  })

  // --- redactRaw маскирует секреты ---
  tryc(results, 'gw_redact_secrets', 'redactRawDeep удаляет x-lava-apikey/x-api-key', () => {
    const redacted = redactRawDeep({
      'x-lava-apikey': 'secret1',
      'x-api-key': 'secret2',
      offerId: 'off_1'
    }) as Record<string, unknown>
    return (
      !('x-lava-apikey' in redacted) && !('x-api-key' in redacted) && redacted.offerId === 'off_1'
    )
  })

  tryc(results, 'gw_redact_email', 'redactRawDeep маскирует email', () => {
    const redacted = redactRawDeep({ email: 'john@example.com' }) as Record<string, unknown>
    return typeof redacted.email === 'string' && redacted.email !== 'john@example.com'
  })

  // --- SSRF-защита callbackUrl ---
  tryc(
    results,
    'gw_forward_url_public_ok',
    'isSafeForwardUrl: публичный https → true',
    () =>
      isSafeForwardUrl('https://shop.example.com/hook?o=1') &&
      isSafeForwardUrl('http://hooks.example.org/lava')
  )

  tryc(
    results,
    'gw_forward_url_blocks_private',
    'isSafeForwardUrl: localhost/RFC1918/metadata → false',
    () => {
      const blocked = [
        'http://localhost/x',
        'http://127.0.0.1/x',
        'https://10.0.0.5/x',
        'https://192.168.1.1/x',
        'https://172.16.0.1/x',
        'http://169.254.169.254/latest/meta-data',
        'https://[::1]/x',
        'ftp://example.com/x',
        'not-a-url'
      ]
      return blocked.every((u) => isSafeForwardUrl(u) === false)
    }
  )

  return results
}
