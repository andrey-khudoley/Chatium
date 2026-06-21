/**
 * Сборка тела JSON для исходящего `POST /v1/bill` к LifePay (operation-manual §4.5; см.
 * lifepay/api-contracts.md «Создание счёта»). Метод фиксирован `"sbp"` (§1.3 implementation-plan).
 * Поля `apikey` / `login` берутся из заголовков gateway (§4.5, §5.2), а не из `args`.
 */

import type { LpCredentials } from './lpCredentials'

export type CreateBillArgs = {
  amount: number
  customerEmail: string
  orderNumber: string
  callbackUrl: string
  description: string
  customerPhone?: string
}

export type CreateBillLpBody = {
  apikey: string
  login: string
  amount: string
  customer_email: string
  customer_phone: string | null
  method: 'sbp'
  description: string
  callback_url: string
  order: { number: string }
}

/**
 * По контракту LifePay (apidoc.life-pay.ru/bill/index «Описание полей»: `amount` - string, required)
 * сумма отправляется как строка с двумя знаками после запятой - формат, который LifePay показывает
 * в примерах ответов (`"amount": "1.00"`). Передача `amount` числом ведёт к code 6020
 * («Переданы некорректные данные»).
 */
function formatAmount(amount: number): string {
  return amount.toFixed(2)
}

/**
 * Нормализация телефона под формат LifePay `customer_phone` (apidoc.life-pay.ru/bill/index:
 * «Номер телефона клиента ... в формате `7xxxxxxxxxx`»). Убираем `+`, пробелы, скобки, дефисы;
 * на не-валидном вводе возвращаем как было, чтобы LifePay сам отверг с понятным кодом.
 */
function normalizeCustomerPhone(raw: string): string {
  const digits = raw.replace(/\D+/g, '')
  return digits
}

export function buildCreateBillBody(
  credentials: LpCredentials,
  args: CreateBillArgs
): CreateBillLpBody {
  return {
    apikey: credentials.apikey,
    login: credentials.login,
    amount: formatAmount(args.amount),
    customer_email: args.customerEmail,
    customer_phone:
      typeof args.customerPhone === 'string' && args.customerPhone.length > 0
        ? normalizeCustomerPhone(args.customerPhone)
        : null,
    method: 'sbp',
    description: args.description,
    callback_url: args.callbackUrl,
    order: { number: args.orderNumber }
  }
}

/**
 * Возвращает копию тела без секретов (`apikey`, `login`) - для безопасного логирования.
 */
export function redactCreateBillBodyForLog(
  body: CreateBillLpBody
): Omit<CreateBillLpBody, 'apikey' | 'login'> {
  const { apikey: _a, login: _l, ...rest } = body
  return rest
}
