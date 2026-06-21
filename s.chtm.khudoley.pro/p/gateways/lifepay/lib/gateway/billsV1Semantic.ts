/**
 * Классификация ответов LifePay для контура `bills_v1` (operation-manual §2.8.2, правила B1-B4)
 * и извлечение успешных payload'ов. Возвращает `null` для классификаторов, если тело — успех.
 *
 * Структура ответа LifePay (apidoc.life-pay.ru/bill/index):
 *   { code: number, message: string, data: ... }
 *
 * Признак ошибки — `code !== 0` в корне (B2, `bills_v1_code_error`). Поле `data` отличается
 * между операциями:
 *   - `createBill`   → плоский объект `{ status: number, number: number, paymentUrl, paymentUrlWeb, ... }`.
 *   - `getBillStatus`→ словарь `{ [billNumber: string]: { status: number, msg: string } }`.
 *   - `cancelBill`   → пустой объект `{}` при успехе.
 *
 * Поле `status` в ответе — **код состояния счёта** (0 = initiated, 10 = success, 15 = pending,
 * 20 = failed, 30 = cancelled), а не маркер ошибки операции. Поэтому правило B1 (`status === 'error'`),
 * исторически описанное в §2.8.2, фактически не применяется к этому контуру — оставлено в типе
 * `BillsV1SemanticRule` как резерв канона §10 для других контуров / будущих операций.
 *
 * Поле `error` (строка) в успешных ответах LifePay не встречается; правило B4 сохранено как
 * защитная классификация на случай нестандартного ответа upstream'а.
 */

export type BillsV1SemanticRule =
  | 'bills_v1_status_error'
  | 'bills_v1_code_error'
  | 'bills_v1_missing_payment_url'
  | 'bills_v1_error_string'

export type BillsV1SemanticResult = {
  rule: BillsV1SemanticRule
  lpNumericCode?: number
}

/**
 * Имя состояния счёта по числовому коду LifePay (apidoc.life-pay.ru/bill/index).
 * Возвращает строковое представление цифры, если код не известен — упрощает потребление,
 * сохраняя совместимость с расширением справочника.
 */
export function billStatusName(code: number): string {
  switch (code) {
    case 0:
      return 'initiated'
    case 10:
      return 'success'
    case 15:
      return 'pending'
    case 20:
      return 'failed'
    case 30:
      return 'cancelled'
    default:
      return String(code)
  }
}

type LpObject = Record<string, unknown>

function isObject(v: unknown): v is LpObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function readObject(obj: LpObject | null, key: string): LpObject | null {
  if (!obj) return null
  const v = obj[key]
  return isObject(v) ? v : null
}

function readNumber(obj: LpObject | null, key: string): number | undefined {
  if (!obj) return undefined
  const v = obj[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function readString(obj: LpObject | null, key: string): string | undefined {
  if (!obj) return undefined
  const v = obj[key]
  return typeof v === 'string' ? v : undefined
}

/**
 * Читает поле как идентификатор счёта: LifePay возвращает `number` числом, но для нашего
 * контракта gateway это строковый ID. Принимает оба варианта, возвращает непустую строку.
 */
function readBillNumber(obj: LpObject | null, key: string): string | undefined {
  if (!obj) return undefined
  const v = obj[key]
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v === 'string' && v.trim() !== '') return v
  return undefined
}

/**
 * Общая ветвь правил B2/B4 для всех операций контура `bills_v1`. Проверяет:
 *   - `code` в корне ≠ 0 → `bills_v1_code_error` (с `lpNumericCode`)
 *   - наличие непустого поля `error` → `bills_v1_error_string` (защитное правило)
 * Поле `data.code` дополнительно проверяется на случай нетипичной обёртки.
 */
function classifyCommonBillsV1Errors(lpJson: unknown): BillsV1SemanticResult | null {
  const root = isObject(lpJson) ? lpJson : null
  const data = readObject(root, 'data')

  const rootCode = readNumber(root, 'code')
  const dataCode = readNumber(data, 'code')
  const numericCode = rootCode ?? dataCode
  if (typeof numericCode === 'number' && numericCode !== 0) {
    return { rule: 'bills_v1_code_error', lpNumericCode: numericCode }
  }

  if (
    typeof readString(root, 'error') === 'string' ||
    typeof readString(data, 'error') === 'string'
  ) {
    return { rule: 'bills_v1_error_string' }
  }

  return null
}

/**
 * Семантика `createBill` (apidoc.life-pay.ru/bill/index — Выставить счет).
 * При `code === 0` ожидается `data.paymentUrl`; его отсутствие → B3 (`bills_v1_missing_payment_url`).
 */
export function classifyCreateBillResponse(lpJson: unknown): BillsV1SemanticResult | null {
  const common = classifyCommonBillsV1Errors(lpJson)
  if (common) return common

  const root = isObject(lpJson) ? lpJson : null
  const data = readObject(root, 'data')
  const paymentUrl = readString(data, 'paymentUrl') ?? readString(root, 'paymentUrl')
  if (!paymentUrl || paymentUrl.trim() === '') {
    return { rule: 'bills_v1_missing_payment_url' }
  }
  return null
}

/**
 * Извлекает успешный payload `createBill`. LifePay возвращает `data.number` числом —
 * приводим к строке для единообразия публичного контракта gateway.
 */
export function extractCreateBillSuccess(
  lpJson: unknown
): { billNumber: string; paymentUrl: string; paymentUrlWeb: string } | null {
  const root = isObject(lpJson) ? lpJson : null
  const data = readObject(root, 'data')

  const billNumber = readBillNumber(data, 'number') ?? readBillNumber(root, 'number')
  const paymentUrl = readString(data, 'paymentUrl') ?? readString(root, 'paymentUrl')
  const paymentUrlWeb = readString(data, 'paymentUrlWeb') ?? readString(root, 'paymentUrlWeb')

  if (!billNumber || !paymentUrl || !paymentUrlWeb) return null
  return { billNumber, paymentUrl, paymentUrlWeb }
}

/**
 * Достаёт первую (и в типичном кейсе единственную) запись из словаря `data` ответа
 * `getBillStatus`: `data = { [billNumber]: { status, msg } }`. Возвращает `null`, если
 * `data` отсутствует, не объект, пустой словарь или значение записи не объект.
 */
function readBillStatusEntry(lpJson: unknown): { billNumber: string; inner: LpObject } | null {
  const root = isObject(lpJson) ? lpJson : null
  const data = readObject(root, 'data')
  if (!data) return null
  const keys = Object.keys(data)
  if (keys.length === 0) return null
  const billNumber = keys[0]
  if (billNumber === undefined) return null
  const inner = data[billNumber]
  if (!isObject(inner)) return null
  return { billNumber, inner }
}

/**
 * Семантика `getBillStatus` (apidoc.life-pay.ru/bill/index — Проверить статус счета).
 * B3-аналог: при `code === 0` пустой словарь `data` или отсутствие поля `status` внутри
 * записи → `bills_v1_code_error` с признаком отсутствия данных. Канон §10 не содержит
 * отдельного кода для «пустой ответ», поэтому используется `bills_v1_code_error` без
 * `lpNumericCode` (LifePay не вернул код ошибки, но и не вернул ожидаемые данные).
 */
export function classifyGetBillStatusResponse(lpJson: unknown): BillsV1SemanticResult | null {
  const common = classifyCommonBillsV1Errors(lpJson)
  if (common) return common

  const entry = readBillStatusEntry(lpJson)
  if (!entry) {
    return { rule: 'bills_v1_code_error' }
  }
  if (readNumber(entry.inner, 'status') === undefined) {
    return { rule: 'bills_v1_code_error' }
  }
  return null
}

/**
 * Извлекает успешный payload `getBillStatus`. `billNumber` — ключ словаря `data`,
 * `status` — имя по справочнику `billStatusName`, `msg` — сопровождающее сообщение.
 */
export function extractGetBillStatusSuccess(
  lpJson: unknown
): { billNumber: string; status: string; msg?: string } | null {
  const entry = readBillStatusEntry(lpJson)
  if (!entry) return null
  const statusCode = readNumber(entry.inner, 'status')
  if (statusCode === undefined) return null
  const msg = readString(entry.inner, 'msg')
  const status = billStatusName(statusCode)
  return msg !== undefined
    ? { billNumber: entry.billNumber, status, msg }
    : { billNumber: entry.billNumber, status }
}

/**
 * Семантика `cancelBill` (apidoc.life-pay.ru/bill/index — Отменить счет). При успехе LifePay
 * возвращает пустой `data: {}` — отдельных полей в payload'е нет. Единственное правило —
 * общая ветвь `code !== 0` / `error`.
 */
export function classifyCancelBillResponse(lpJson: unknown): BillsV1SemanticResult | null {
  return classifyCommonBillsV1Errors(lpJson)
}

/**
 * Извлекает успешный payload `cancelBill`. LifePay не возвращает в ответе ни номер, ни статус,
 * поэтому отдаём синтетический `status: 'cancelled'` — потребителю gateway достаточно факта,
 * что запрос на отмену принят upstream'ом без ошибки.
 */
export function extractCancelBillSuccess(_lpJson: unknown): { status: 'cancelled' } {
  return { status: 'cancelled' }
}
