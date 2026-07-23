import { request } from '@app/request'
import { DOMAIN, getFullUrl } from '../../config/routes'
import { BrokerDeliveries } from '../../tables/deliveries.table'
import { BrokerEvents } from '../../tables/events.table'
import { BrokerModules } from '../../tables/modules.table'
import { BrokerSettings } from '../../tables/settings.table'
import { brokerLogProbeRoute } from '../../api/tests/log-probe'
import { registerModuleCore, type RegisterModuleParams } from '../broker/register'
import { retryRead as coreRetryRead } from '../broker/retry-read'

let uniqCounter = 0

/** Уникальная метка прогона для неймспейса тестовых строк (§9.2). */
export function makeUniq(): string {
  uniqCounter += 1
  return `${Date.now().toString(36)}${uniqCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** Тестовый moduleKey вида 'test-<uniq>-<роль>' (§9.2). */
export function testModuleKey(uniq: string, role: string): string {
  return `test-${uniq}-${role}`
}

/**
 * Уникальный eventType/glob теста (фикс-раунда 1, п.13) — общий литерал вроде
 * 'tasks.created' между тестами гонялся с АСИНХРОННЫМ asap-дренером: publish
 * лишь планирует дренер (scheduleJobAsap), не ждёт его — фоновый проход мог
 * сработать позже, когда другой тест того же прогона уже зарегистрировал
 * другой модуль на тот же 'tasks.*', и получить лишнюю доставку, ломая счётчики
 * соседнего теста. Корень на базе uniq теста снимает пересечение.
 */
export function testEventType(uniq: string): string {
  return `t${uniq}.created`
}
export function testEventGlob(uniq: string): string {
  return `t${uniq}.*`
}
/** Заведомо непересекающийся с testEventType(uniq)/testEventGlob(uniq) корень — для негативных сценариев ("не должен матчить"). */
export function otherEventGlob(uniq: string): string {
  return `o${uniq}.*`
}

/**
 * Свип тестовых строк по префиксу 'test-' — начало и конец прогона (§9.2).
 * $ilike, а не $like — оператора $like в Heap нет. limit: null обязателен,
 * иначе дефолт deleteAll (1) уронит свип предохранителем.
 */
export async function sweep(ctx: RichUgcCtx): Promise<void> {
  await BrokerDeliveries.deleteAll(ctx, {
    where: { subscriberModuleKey: { $ilike: 'test-%' } },
    limit: null,
    hard: true
  })
  await BrokerEvents.deleteAll(ctx, {
    where: { producerModuleKey: { $ilike: 'test-%' } },
    limit: null,
    hard: true
  })
  await BrokerModules.deleteAll(ctx, {
    where: { moduleKey: { $ilike: 'test-%' } },
    limit: null,
    hard: true
  })
}

/**
 * Retry чтения после updateAll/update (ADR-0015) — реэкспорт единственной
 * реализации из lib/broker/retry-read (фикс-раунда 1, п.21): pull.ts и тесты
 * делят одну функцию, а не два независимых клона.
 */
export const retryRead = coreRetryRead

export type BrokerHttpResponse<T = any> = { statusCode: number; body: T }

/**
 * Реальный внешний HTTP-вызов роута брокера (О3 — настоящая параллельность в
 * concurrency-тестах достигается независимыми запросами, не двойным вызовом
 * логики в одном обработчике). path — путь роута (обычно `<routeObject>.url()`,
 * фикс-раунда 1, п.18 — не хардкод строки).
 */
export async function brokerHttp<T = any>(
  path: string,
  body: Record<string, unknown>
): Promise<BrokerHttpResponse<T>> {
  // `<routeObject>.url()` на платформе возвращает АБСОЛЮТНЫЙ URL (RV 22-07-2026) —
  // префиксовать его нельзя (получится d/system/broker/https://… → 404).
  // Относительный путь (запасная форма) префиксуем сами.
  const url = path.startsWith('http') ? path : `https://${DOMAIN}${getFullUrl(path)}`
  const response = await request({ url, method: 'post', json: body, throwHttpErrors: false })
  return { statusCode: response.statusCode, body: response.body as T }
}

/** Утверждение для тестов — узнаёт cond по ссылке, не оборачивайте в !!. */
export function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg)
  }
}

/**
 * Двухфазный лог-тест, фаза «запись» (§9.5.2 / фикс RV 22-07-2026): проба
 * выстреливается В НАЧАЛЕ прогона (runAllTests), а читается тестом log_two_phase
 * В КОНЦЕ — окно CH-видимости записи становится равным длительности прогона
 * (~10с) вместо секунд поллинга. Метка передаётся module-level холдером —
 * прогон последовательный, в одном запросе.
 */
export type LogProbeFired = { mark: string; failure: string | null }
let pendingLogProbe: LogProbeFired | null = null

export function takePendingLogProbe(): LogProbeFired | null {
  const p = pendingLogProbe
  pendingLogProbe = null
  return p
}

/**
 * Не потребляющее чтение пробы (в отличие от takePendingLogProbe) — нужна
 * тестам, которые НЕ должны съедать метку до log_two_phase (§9.5.2, конец
 * integration-категории): admin_logs_search/admin_log_payload (api) и
 * readlogs_history (functional) читают одну и ту же выстреленную пробу через
 * peek, а потребляет её последней только log_two_phase через take.
 */
export function peekPendingLogProbe(): LogProbeFired | null {
  return pendingLogProbe
}

export async function fireLogProbe(ctx: RichUgcCtx): Promise<LogProbeFired> {
  const mark = `logprobe-${makeUniq()}`
  const probeKey = `probe-${makeUniq()}`
  let failure: string | null = null
  try {
    await BrokerSettings.createOrUpdateBy(ctx, 'key', { key: 'test_probe_key', value: probeKey })
    const resp = await brokerHttp(brokerLogProbeRoute.url(), { mark, probeKey })
    if (resp.statusCode !== 200 || !resp.body?.ok) {
      failure = `log-probe не прошла: ${resp.statusCode} ${JSON.stringify(resp.body).slice(0, 200)}`
    }
  } catch (e) {
    failure = `log-probe бросила: ${e instanceof Error ? e.message : String(e)}`
  }
  pendingLogProbe = { mark, failure }
  return pendingLogProbe
}

/**
 * Обёртка над registerModuleCore для фикстур персистентного набора (channel
 * 'internal' по умолчанию) — единственный легитимный вызывающий, которому
 * разрешён зарезервированный префикс 'test-' у moduleKey (registerModuleCore,
 * testOpts; фикс-раунда 1, п.3). Структурно недостижимо ни с одной транспортной
 * поверхности (ни body внешнего HTTP, ни params internal app.function не могут
 * передать четвёртый позиционный аргумент функции) — используется только здесь,
 * в доверенном in-process коде теста. Для тестов, которые обязаны реально идти
 * через транспорт (register-операция, §9.3 матрица), см. transportModuleKey.
 */
export async function registerTestModule(
  ctx: RichUgcCtx,
  params: RegisterModuleParams,
  channel: 'internal' | 'external' = 'internal'
) {
  return registerModuleCore(ctx, params, channel, { allowReservedTestPrefix: true })
}

/**
 * moduleKey для тестов, обязанных идти через РЕАЛЬНЫЙ транспорт (внешний HTTP
 * либо internal app.function .run()) — не может нести testOpts-бэкдор
 * registerModuleCore (см. registerTestModule), поэтому не занимает
 * зарезервированный префикс 'test-' и требует явной уборки через
 * cleanupTransportModule (общий sweep() его не увидит).
 */
export function transportModuleKey(uniq: string, role: string): string {
  return `brokertest-${uniq}-${role}`
}

/** Явная уборка модуля, зарегистрированного через реальный транспорт (см. transportModuleKey). */
export async function cleanupTransportModule(ctx: RichUgcCtx, moduleKey: string): Promise<void> {
  await BrokerDeliveries.deleteAll(ctx, {
    where: { subscriberModuleKey: moduleKey },
    limit: null,
    hard: true
  })
  await BrokerEvents.deleteAll(ctx, {
    where: { producerModuleKey: moduleKey },
    limit: null,
    hard: true
  })
  await BrokerModules.deleteAll(ctx, { where: { moduleKey }, limit: null, hard: true })
}
