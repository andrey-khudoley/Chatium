/**
 * Каталог кодов ошибок публичного API gateway (operation-manual §10). Канонические тексты
 * `error.message` — строго те, что в таблице §10; перевод/перефраз запрещён.
 */

export type GatewayErrorCode =
  | 'INVOKE_LP_APIKEY_MISSING'
  | 'INVOKE_LP_APIKEY_INVALID'
  | 'INVOKE_LP_LOGIN_MISSING'
  | 'INVOKE_LP_LOGIN_INVALID'
  | 'INVOKE_CONTENT_TYPE_UNSUPPORTED'
  | 'INVOKE_BODY_INVALID_JSON'
  | 'INVOKE_BODY_TOO_LARGE'
  | 'INVOKE_HTTP_METHOD_NOT_ALLOWED'
  | 'INVOKE_OP_UNKNOWN'
  | 'INVOKE_OP_DISABLED'
  | 'INVOKE_OP_UNSUPPORTED_BY_LP'
  | 'INVOKE_ARGS_SCHEMA_VIOLATION'
  | 'INVOKE_LP_UPSTREAM_ERROR'
  | 'INVOKE_LP_SEMANTIC_ERROR'
  | 'INVOKE_LP_TIMEOUT'
  | 'INVOKE_LP_NETWORK_ERROR'
  | 'INVOKE_INTERNAL_ERROR'

type ErrorMeta = { statusCode: number; message: string }

export const GATEWAY_ERRORS: Record<GatewayErrorCode, ErrorMeta> = {
  INVOKE_LP_APIKEY_MISSING: {
    statusCode: 400,
    message: 'Отсутствует или некорректен заголовок X-Lp-Apikey (API-ключ магазина LifePay).'
  },
  INVOKE_LP_APIKEY_INVALID: {
    statusCode: 400,
    message: 'Заголовок X-Lp-Apikey не может быть пустым.'
  },
  INVOKE_LP_LOGIN_MISSING: {
    statusCode: 400,
    message: 'Отсутствует или некорректен заголовок X-Lp-Login (логин владельца магазина LifePay).'
  },
  INVOKE_LP_LOGIN_INVALID: {
    statusCode: 400,
    message:
      'Заголовок X-Lp-Login должен быть номером телефона в формате 7XXXXXXXXXX (11 цифр, начинается с 7, без префикса +).'
  },
  INVOKE_CONTENT_TYPE_UNSUPPORTED: {
    statusCode: 415,
    message: 'Для POST ожидается заголовок Content-Type: application/json с кодировкой UTF-8.'
  },
  INVOKE_BODY_INVALID_JSON: {
    statusCode: 400,
    message: 'Тело запроса не является корректным JSON-объектом аргументов операции.'
  },
  INVOKE_BODY_TOO_LARGE: {
    statusCode: 413,
    message: 'Размер тела запроса превышает допустимый лимит gateway. Сократите объём аргументов.'
  },
  INVOKE_HTTP_METHOD_NOT_ALLOWED: {
    statusCode: 405,
    message:
      'HTTP-метод запроса не соответствует данной операции. Сверьтесь с каталогом GET /v1/operations и с документацией SDK.'
  },
  INVOKE_OP_UNKNOWN: {
    statusCode: 404,
    message:
      'Операция не найдена или не опубликована по указанному пути. Сверьтесь с каталогом GET /v1/operations.'
  },
  INVOKE_OP_DISABLED: {
    statusCode: 503,
    message: 'Этот метод временно отключён и в данный момент не поддерживается gateway.'
  },
  INVOKE_OP_UNSUPPORTED_BY_LP: {
    statusCode: 501,
    message: 'Этот метод не поддерживается контуром LifePay в конфигурации gateway.'
  },
  INVOKE_ARGS_SCHEMA_VIOLATION: {
    statusCode: 400,
    message:
      'Аргументы операции не соответствуют схеме в каталоге (query для GET или тело для POST).'
  },
  INVOKE_LP_UPSTREAM_ERROR: {
    statusCode: 502,
    message:
      'LifePay вернул ответ с HTTP вне диапазона 200-299, либо при ожидаемом JSON произошла ошибка разбора тела.'
  },
  INVOKE_LP_SEMANTIC_ERROR: {
    statusCode: 502,
    message: 'LifePay вернул HTTP 200-299, но в JSON ответа признаки ошибки провайдера (§2.8.2).'
  },
  INVOKE_LP_TIMEOUT: {
    statusCode: 504,
    message: 'Превышено время ожидания ответа от LifePay.'
  },
  INVOKE_LP_NETWORK_ERROR: {
    statusCode: 502,
    message: 'Не удалось установить соединение с LifePay или запрос был оборван.'
  },
  INVOKE_INTERNAL_ERROR: {
    statusCode: 500,
    message: 'Внутренняя ошибка gateway. Повторите запрос позже или обратитесь к администратору.'
  }
}

export function getErrorMeta(code: GatewayErrorCode): ErrorMeta {
  return GATEWAY_ERRORS[code]
}
