import { PROJECT_ROOT } from './routes'

// Селектор окружения — статический, из пути копии проекта (§3 «Окружения»).
// Копия в `p/` — prod, копия в `d/` (эта) — stage; ручного тумблера нет, ошибиться негде.
export const IS_PROD = PROJECT_ROOT.startsWith('p/')

// Префикс ключей замков брокера (§5.8 «Соглашение о ключах замков»). Замки́ глобальны
// на аккаунт — без сегмента окружения stage- и prod-дренеры делили бы один замок.
export const LOCK_NS = IS_PROD ? 'broker' : 'broker-stage'

/**
 * Ключ замка: первый элемент — `<LOCK_NS>-<назначение>` (УНИКАЛЕН на назначение),
 * дальше — переменные части. Наблюдение RV 22-07-2026: при общем первом элементе
 * (`['broker-stage', 'fanout', ...]` против держателя `['broker-stage', 'drainer']`)
 * захват деградирует до ~5с-поллов и чужие runWithExclusiveLock падают по таймауту;
 * форма с уникальным первым элементом (как в прототипе волны 1) захватывается
 * мгновенно. Поэтому назначение — в первом элементе, не отдельным (§5.8).
 */
export function lockKey(
  purpose: 'register' | 'dedup' | 'fanout' | 'drainer',
  ...parts: string[]
): string[] {
  return [`${LOCK_NS}-${purpose}`, ...parts]
}

// Имя WebSocket-канала живого монитора логов (§5.10.8) — фиксированная идентичность,
// стабильная между деплоями; сегмент окружения разводит stage/prod-мониторы.
export const LOG_SOCKET_CHANNEL = IS_PROD ? 'broker-logs-prod-j6n0ik' : 'broker-logs-stage-j6n0ik'

// Фильтр `workspace_path` для чтения логов (§5.10.7) — предположение (корень копии
// проекта); подтверждается лог-тестом log_two_phase (§9.5.2, синергия с §0.1).
export const WORKSPACE_PATH = PROJECT_ROOT
