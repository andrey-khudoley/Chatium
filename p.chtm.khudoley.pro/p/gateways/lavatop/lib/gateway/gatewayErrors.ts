/**
 * Каталог кодов ошибок публичного API Lava.Top-gateway. Структура и подход — как в
 * `p/gateways/lifepay/lib/gateway/gatewayErrors.ts`, адаптировано под Lava.Top:
 *   - авторизация клиента — один заголовок `X-Lava-Apikey` (нет логина);
 *   - добавлен `INVOKE_LAVA_RATE_LIMITED` (HTTP 429 от Lava.Top, лимит 50 req/s).
 */

export type GatewayErrorCode =
  | 'INVOKE_LAVA_APIKEY_MISSING'
  | 'INVOKE_LAVA_APIKEY_INVALID'
  | 'INVOKE_LAVA_RATE_LIMITED'
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
  INVOKE_LAVA_APIKEY_MISSING: {
    statusCode: 401,
    message: 'Отсутствует заголовок X-Lava-Apikey (API-ключ магазина Lava.Top).'
  },
  INVOKE_LAVA_APIKEY_INVALID: {
    statusCode: 400,
    message: 'Заголовок X-Lava-Apikey не может быть пустым.'
  },
  INVOKE_LAVA_RATE_LIMITED: {
    statusCode: 429,
    message: 'Lava.Top вернул HTTP 429: превышен лимит запросов (50 req/s). Повторите запрос позже.'
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
      'HTTP-метод запроса не соответствует данной операции. Сверьтесь с каталогом GET /v1/operations.'
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
    message: 'Этот метод не поддерживается контуром Lava.Top в конфигурации gateway.'
  },
  INVOKE_ARGS_SCHEMA_VIOLATION: {
    statusCode: 400,
    message:
      'Аргументы операции не соответствуют схеме в каталоге (query для GET или тело для POST).'
  },
  INVOKE_LP_UPSTREAM_ERROR: {
    statusCode: 502,
    message:
      'Lava.Top вернул ответ с HTTP вне диапазона 200-299, либо при ожидаемом JSON произошла ошибка разбора тела.'
  },
  INVOKE_LP_SEMANTIC_ERROR: {
    statusCode: 502,
    message: 'Lava.Top вернул успешный HTTP-статус, но в теле ответа отсутствуют ожидаемые поля.'
  },
  INVOKE_LP_TIMEOUT: {
    statusCode: 504,
    message: 'Превышено время ожидания ответа от Lava.Top.'
  },
  INVOKE_LP_NETWORK_ERROR: {
    statusCode: 502,
    message: 'Не удалось установить соединение с Lava.Top или запрос был оборван.'
  },
  INVOKE_INTERNAL_ERROR: {
    statusCode: 500,
    message: 'Внутренняя ошибка gateway. Повторите запрос позже или обратитесь к администратору.'
  }
}

export function getErrorMeta(code: GatewayErrorCode): ErrorMeta {
  return GATEWAY_ERRORS[code]
}
