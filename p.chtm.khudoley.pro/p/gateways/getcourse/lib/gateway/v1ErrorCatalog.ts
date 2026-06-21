/**
 * Канонические тексты ошибок публичного /v1/* (manual §10).
 * Ключ — error.code; значение — error.message (русский, дословно из таблицы §10).
 */
export const V1_ERROR_MESSAGES: Record<string, string> = {
  GATEWAY_DEV_KEY_NOT_CONFIGURED:
    'На gateway не настроен ключ разработчика GetCourse (настройка gc_developer_api_key). Обратитесь к администратору приложения gateway.',
  INVOKE_SCHOOL_KEY_MISSING:
    'Отсутствует или некорректен заголовок X-Gc-School-Api-Key (ключ API школы GetCourse).',
  INVOKE_SCHOOL_KEY_INVALID: 'Заголовок X-Gc-School-Api-Key не может быть пустым.',
  INVOKE_SCHOOL_HOST_MISSING:
    'Отсутствует или некорректен заголовок X-Gc-School-Host (хост школы для URL GetCourse).',
  INVOKE_SCHOOL_HOST_INVALID:
    'Заголовок X-Gc-School-Host не является допустимым именем хоста школы для подстановки в URL GetCourse.',
  INVOKE_CONTENT_TYPE_UNSUPPORTED:
    'Для POST ожидается заголовок Content-Type: application/json с кодировкой UTF-8.',
  INVOKE_BODY_INVALID_JSON:
    'Тело запроса не является корректным JSON-объектом аргументов операции.',
  INVOKE_BODY_TOO_LARGE:
    'Размер тела запроса превышает допустимый лимит gateway. Сократите объём аргументов или используйте отдельный сценарий для крупных импортов.',
  INVOKE_HTTP_METHOD_NOT_ALLOWED:
    'HTTP-метод запроса не соответствует данной операции. Сверьтесь с каталогом GET /v1/operations и с документацией SDK.',
  INVOKE_OP_UNKNOWN:
    'Операция не найдена или не опубликована по указанному пути. Сверьтесь с каталогом GET /v1/operations.',
  INVOKE_OP_DISABLED: 'Этот метод временно отключён и в данный момент не поддерживается gateway.',
  INVOKE_OP_UNSUPPORTED_BY_GC: 'Этот метод не поддерживается GetCourse в конфигурации gateway.',
  INVOKE_ARGS_SCHEMA_VIOLATION:
    'Аргументы операции не соответствуют схеме в каталоге (query для GET или тело для POST).',
  INVOKE_GC_UPSTREAM_ERROR:
    'GetCourse вернул ответ с HTTP вне диапазона 200–299, либо при ожидаемом JSON произошла ошибка разбора тела.',
  INVOKE_GC_SEMANTIC_ERROR:
    'GetCourse вернул HTTP 200–299, но в JSON ответа признаки ошибки платформы (§2.8.2): контур Legacy (success/result) или контур new (status/code, либо data.result при успешной обёртке).',
  INVOKE_GC_LIMIT_ERROR:
    'GetCourse вернул HTTP 200–299, но в JSON ответа сообщение о достижении лимита создания объектов через API.',
  INVOKE_GC_TIMEOUT: 'Превышено время ожидания ответа от GetCourse.',
  INVOKE_GC_NETWORK_ERROR: 'Не удалось установить соединение с GetCourse или запрос был оборван.',
  INVOKE_INTERNAL_ERROR:
    'Внутренняя ошибка gateway. Повторите запрос позже или обратитесь к администратору.',
  OPERATIONS_INTERNAL_ERROR: 'Не удалось сформировать каталог операций.'
}

/** HTTP status по error.code для /v1/{op} (manual §9.2, §10). */
export const V1_ERROR_HTTP_STATUS: Record<string, number> = {
  GATEWAY_DEV_KEY_NOT_CONFIGURED: 503,
  INVOKE_SCHOOL_KEY_MISSING: 400,
  INVOKE_SCHOOL_KEY_INVALID: 400,
  INVOKE_SCHOOL_HOST_MISSING: 400,
  INVOKE_SCHOOL_HOST_INVALID: 400,
  INVOKE_CONTENT_TYPE_UNSUPPORTED: 415,
  INVOKE_BODY_INVALID_JSON: 400,
  INVOKE_BODY_TOO_LARGE: 413,
  INVOKE_HTTP_METHOD_NOT_ALLOWED: 405,
  INVOKE_OP_UNKNOWN: 404,
  INVOKE_OP_DISABLED: 503,
  INVOKE_OP_UNSUPPORTED_BY_GC: 501,
  INVOKE_ARGS_SCHEMA_VIOLATION: 400,
  INVOKE_GC_UPSTREAM_ERROR: 502,
  INVOKE_GC_SEMANTIC_ERROR: 502,
  INVOKE_GC_LIMIT_ERROR: 502,
  INVOKE_GC_TIMEOUT: 504,
  INVOKE_GC_NETWORK_ERROR: 502,
  INVOKE_INTERNAL_ERROR: 500,
  OPERATIONS_INTERNAL_ERROR: 500
}
