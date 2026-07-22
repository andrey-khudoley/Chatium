// Дефолт таймаута «взятой» доставки (§3.1/§5.9.2, О2) — 1 минута.
export const DEFAULT_CLAIM_TIMEOUT_MS = 60_000

// Пределы fetchDeliveries (§5.9.2): дефолт и потолок (усечение, не отказ).
export const FETCH_LIMIT_DEFAULT = 50
export const FETCH_LIMIT_MAX = 200

// Размер батча одного прохода fan-out-дренера (§5.8/§5-jobs). ≤1000 — предел
// страницы Heap; 200 выбрано под бюджет джоба 60 с: ~4-5 мс/Heap-операция ×
// (перепроверка подписчика + findOneBy + create + update) × число подписчиков —
// консервативный запас (гейт платформы; перепроверка добавлена фикс-раундом 1, п.2б).
export const DRAIN_BATCH = 200

// Потолок payload события — жёсткий, наш (не платформенный), §3.2/§5.8.
// Измеряется как JSON.stringify(payload).length — символы, не байты.
export const PAYLOAD_MAX_CHARS = 8 * 1024

// Максимальная длина lastError доставки (§3.3/О7) — превышение обрезает, не отклоняет.
export const LAST_ERROR_MAX = 1000

// Зарезервированный moduleKey брокера-хозяина (§3.2) — не запись в BrokerModules.
export const BROKER_SENTINEL = 'broker'

// Зарезервированный namespace системных событий (§3.2) — публикация обычным
// модулем отклоняется независимо от allowedPublishTypes; подписка разрешена.
export const RESERVED_EVENT_PREFIX = 'broker.'

// Зарезервированный префикс moduleKey (фикс-раунда 1, п.3) — свип персистентного
// тестового набора (§9.2) hard-удаляет по $ilike 'test-%' на боевых таблицах;
// без резерва легитимный модуль с таким именем был бы уничтожен ближайшим
// прогоном тестов. Обход — только доверенный in-process код теста
// (см. registerModuleCore.testOpts, lib/tests/helpers.ts registerTestModule).
export const RESERVED_MODULE_KEY_TEST_PREFIX = 'test-'
