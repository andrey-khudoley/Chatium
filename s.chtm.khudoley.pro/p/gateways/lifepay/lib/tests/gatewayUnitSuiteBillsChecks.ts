/**
 * Проверки семантических классификаторов bills_v1 и сборки тела createBill
 * (часть юнит-набора `lib/gateway/`, см. gatewayUnitSuite.ts). Вынесены в отдельный
 * модуль ради лимита на размер файла; набор проверок и фикстуры не меняются.
 */

import {
  billStatusName,
  classifyCancelBillResponse,
  classifyCreateBillResponse,
  classifyGetBillStatusResponse,
  extractCancelBillSuccess,
  extractCreateBillSuccess,
  extractGetBillStatusSuccess,
  type BillsV1SemanticResult
} from '../gateway/billsV1Semantic'
import { buildCreateBillBody, redactCreateBillBodyForLog } from '../gateway/buildCreateBillBody'
import { redactRawDeep } from '../../shared/redactRaw'
import { type GatewayUnitTestResult, tryPush } from './gatewayUnitSuiteHelpers'

const LP_GET_BILL_STATUS_OK = {
  code: 0,
  message: '',
  data: {
    '10197087498032': { status: 15, msg: 'Ожидает подтверждения' }
  }
}

const LP_CREATE_BILL_OK = {
  code: 0,
  message: '',
  data: {
    status: 15,
    number: 18948962804043,
    created: 1476091037,
    interval: 5,
    paymentUrl: 'https://qr.nspk.ru/AS10000001',
    paymentUrlWeb: 'https://web.qr.nspk.ru/AS10000001'
  }
}

const LP_CANCEL_BILL_OK = { code: 0, message: '', data: {} }

const LP_CODE_ERROR = { code: 7, message: 'Bill not found', data: {} }

function ruleOf(r: BillsV1SemanticResult | null): string | null {
  return r ? r.rule : null
}

export function runBillsV1SemanticChecks(results: GatewayUnitTestResult[]): void {
  tryPush(
    results,
    'gw_get_bill_status_success',
    'classifyGetBillStatusResponse: канонический ответ LifePay → null',
    () => {
      if (classifyGetBillStatusResponse(LP_GET_BILL_STATUS_OK) !== null) return false
      const ex = extractGetBillStatusSuccess(LP_GET_BILL_STATUS_OK)
      if (!ex) return false
      if (ex.billNumber !== '10197087498032') return false
      if (ex.status !== 'pending') return false
      if (ex.msg !== 'Ожидает подтверждения') return false
      return true
    }
  )

  tryPush(
    results,
    'gw_get_bill_status_empty_data',
    'classifyGetBillStatusResponse: code=0 + пустой словарь data → bills_v1_code_error',
    () => {
      if (
        ruleOf(classifyGetBillStatusResponse({ code: 0, message: '', data: {} })) !==
        'bills_v1_code_error'
      )
        return false
      if (
        ruleOf(classifyGetBillStatusResponse({ code: 0, data: { '10197087498032': {} } })) !==
        'bills_v1_code_error'
      )
        return false
      return true
    }
  )

  tryPush(
    results,
    'gw_get_bill_status_code_error',
    'classifyGetBillStatusResponse: code≠0 → bills_v1_code_error с lpNumericCode',
    () => {
      const r = classifyGetBillStatusResponse(LP_CODE_ERROR)
      if (!r) return false
      if (r.rule !== 'bills_v1_code_error') return false
      if (r.lpNumericCode !== 7) return false
      return true
    }
  )

  tryPush(
    results,
    'gw_cancel_bill_success',
    'classifyCancelBillResponse: code=0 + пустой data → null; success: { status: cancelled }',
    () => {
      if (classifyCancelBillResponse(LP_CANCEL_BILL_OK) !== null) return false
      const ex = extractCancelBillSuccess(LP_CANCEL_BILL_OK)
      if (ex.status !== 'cancelled') return false
      return true
    }
  )

  tryPush(
    results,
    'gw_cancel_bill_code_error',
    'classifyCancelBillResponse: code≠0 → bills_v1_code_error',
    () => {
      const r = classifyCancelBillResponse(LP_CODE_ERROR)
      if (!r) return false
      if (r.rule !== 'bills_v1_code_error') return false
      if (r.lpNumericCode !== 7) return false
      return true
    }
  )

  tryPush(
    results,
    'gw_create_bill_success',
    'classifyCreateBillResponse + extract: каноничный успех',
    () => {
      if (classifyCreateBillResponse(LP_CREATE_BILL_OK) !== null) return false
      const ex = extractCreateBillSuccess(LP_CREATE_BILL_OK)
      if (!ex) return false
      if (ex.billNumber !== '18948962804043') return false
      if (ex.paymentUrl !== 'https://qr.nspk.ru/AS10000001') return false
      if (ex.paymentUrlWeb !== 'https://web.qr.nspk.ru/AS10000001') return false
      return true
    }
  )

  tryPush(
    results,
    'gw_create_bill_missing_payment_url',
    'classifyCreateBillResponse: нет paymentUrl при code=0 → bills_v1_missing_payment_url',
    () => {
      const noUrl = { code: 0, data: { status: 15, number: 1, paymentUrlWeb: 'x' } }
      return ruleOf(classifyCreateBillResponse(noUrl)) === 'bills_v1_missing_payment_url'
    }
  )

  tryPush(
    results,
    'gw_bill_status_name_mapping',
    'billStatusName: 0/10/15/20/30 → initiated/success/pending/failed/cancelled',
    () => {
      if (billStatusName(0) !== 'initiated') return false
      if (billStatusName(10) !== 'success') return false
      if (billStatusName(15) !== 'pending') return false
      if (billStatusName(20) !== 'failed') return false
      if (billStatusName(30) !== 'cancelled') return false
      if (billStatusName(99) !== '99') return false
      return true
    }
  )

  tryPush(
    results,
    'gw_bills_v1_semantic_rule_type',
    'BillsV1SemanticRule: возвращаемые правила входят в канон §10',
    () => {
      const canon = new Set([
        'bills_v1_status_error',
        'bills_v1_code_error',
        'bills_v1_missing_payment_url',
        'bills_v1_error_string'
      ])
      const samples: unknown[] = [
        {},
        { code: 7 },
        { error: 'boom' },
        { code: 0, data: {} },
        { code: 0, data: { '1': {} } },
        LP_CODE_ERROR
      ]
      for (const s of samples) {
        const g = classifyGetBillStatusResponse(s)
        if (g && !canon.has(g.rule)) return false
        const c = classifyCancelBillResponse(s)
        if (c && !canon.has(c.rule)) return false
        const cr = classifyCreateBillResponse(s)
        if (cr && !canon.has(cr.rule)) return false
      }
      return true
    }
  )

  tryPush(
    results,
    'gw_get_bill_status_query_fields',
    'getBillStatus: конвенция query.number = args.billNumber (документационный)',
    () => {
      const args = { billNumber: 'BILL-42' }
      const query: Record<string, string> = { number: args.billNumber }
      if (query.number !== 'BILL-42') return false
      if ('billNumber' in query) return false
      return true
    }
  )

  tryPush(
    results,
    'gw_create_bill_body_amount_string',
    'buildCreateBillBody: amount передаётся в LifePay строкой "X.XX" (LifePay code 6020 при числе)',
    () => {
      const body = buildCreateBillBody(
        { apikey: 'a', login: '79161234567' },
        {
          amount: 1,
          customerEmail: 't@example.com',
          orderNumber: 'ORD-1',
          callbackUrl: 'https://cb',
          description: 'Test'
        }
      )
      if (typeof body.amount !== 'string') return false
      if (body.amount !== '1.00') return false
      const body2 = buildCreateBillBody(
        { apikey: 'a', login: '79161234567' },
        {
          amount: 199.5,
          customerEmail: 't@example.com',
          orderNumber: 'ORD-2',
          callbackUrl: 'https://cb',
          description: 'Test'
        }
      )
      if (body2.amount !== '199.50') return false
      if (body.method !== 'sbp') return false
      if (body.description !== 'Test') return false
      if (body.order.number !== 'ORD-1') return false
      return true
    }
  )

  tryPush(
    results,
    'gw_create_bill_body_phone_normalized',
    'buildCreateBillBody: customer_phone приводится к формату 7xxxxxxxxxx (apidoc.life-pay.ru)',
    () => {
      const make = (phone: string) =>
        buildCreateBillBody(
          { apikey: 'a', login: '79161234567' },
          {
            amount: 1,
            customerEmail: 't@example.com',
            orderNumber: 'ORD',
            callbackUrl: 'https://cb',
            description: 'X',
            customerPhone: phone
          }
        ).customer_phone
      if (make('+71234567890') !== '71234567890') return false
      if (make('7 (123) 456-78-90') !== '71234567890') return false
      if (make('79161234567') !== '79161234567') return false
      const noPhone = buildCreateBillBody(
        { apikey: 'a', login: '79161234567' },
        {
          amount: 1,
          customerEmail: 't@example.com',
          orderNumber: 'O',
          callbackUrl: 'https://cb',
          description: 'X'
        }
      ).customer_phone
      if (noPhone !== null) return false
      return true
    }
  )

  tryPush(
    results,
    'gw_create_bill_body_redact_secrets',
    'redactCreateBillBodyForLog: apikey/login убраны, остальные поля сохранены',
    () => {
      const body = buildCreateBillBody(
        { apikey: 'SECRET_AK', login: '79161234567' },
        {
          amount: 1,
          customerEmail: 't@example.com',
          orderNumber: 'ORD-3',
          callbackUrl: 'https://cb',
          description: 'Test'
        }
      )
      const redacted = redactCreateBillBodyForLog(body)
      const serialized = JSON.stringify(redacted)
      if (serialized.includes('SECRET_AK')) return false
      if (serialized.includes('79161234567')) return false
      if ('apikey' in redacted) return false
      if ('login' in redacted) return false
      if (redacted.amount !== '1.00') return false
      if (redacted.order.number !== 'ORD-3') return false
      return true
    }
  )
}
