import { AccessDeniedError } from '@app/errors'
import { BrokerSettings } from '../../tables/settings.table'
import { getLogLevel, setLogLevel } from '../../lib/log/settings'
import { writeServerLog } from '../../lib/log/logger'

/**
 * Проба двухфазного лог-теста (§9.5.2, log_two_phase). Гейт — одноразовый
 * probeKey в BrokerSettings (раннер пишет его перед вызовом, удаляет после).
 * Протокол целиком в try, восстановление уровня и удаление ключа — в finally:
 * упавшая проба не должна оставлять окружение на изменённом уровне с валидным
 * ключом (гейт платформы).
 */
export const brokerLogProbeRoute = app
  .post('/')
  .body((s) => ({
    mark: s.string(),
    probeKey: s.string()
  }))
  .handle(async (ctx, req) => {
    const { mark, probeKey } = req.body

    const setting = await BrokerSettings.findOneBy(ctx, { key: 'test_probe_key' })
    if (!setting || setting.value !== probeKey) {
      throw new AccessDeniedError('broker: invalid probe key')
    }

    const savedLevel = await getLogLevel(ctx)
    try {
      // below <mark> — на уровне Warn, info должен отсечься и не дойти до ClickHouse
      await setLogLevel(ctx, 'Warn')
      await writeServerLog(ctx, { level: 'info', message: `brokertest below ${mark}` })

      // above <mark> — на уровне Info, проходит отсечку И несёт payload/marks в CH
      // (доказывает «payload в json_str всегда», §5.10.5, независимо от live-монитора)
      await setLogLevel(ctx, 'Info')
      await writeServerLog(ctx, {
        level: 'info',
        message: `brokertest above ${mark}`,
        payload: { mark },
        marks: { mark }
      })

      return { ok: true }
    } finally {
      // Восстановление уровня и удаление ключа — НЕЗАВИСИМО друг от друга
      // (фикс-раунда 1, п.12): сбой одного не должен блокировать другое, иначе
      // упавшая проба оставляет окружение либо на изменённом уровне, либо с
      // валидным ключом навсегда.
      try {
        await setLogLevel(ctx, savedLevel)
      } catch {
        // best-effort — следующий runAllTests самовосстановит уровень (п.12а)
      }
      try {
        // limit: null (не 1) — деструктивный предохранитель deleteAll не должен
        // бросить исключение из finally и замаскировать восстановление уровня.
        await BrokerSettings.deleteAll(ctx, {
          where: { key: 'test_probe_key' },
          limit: null,
          hard: true
        })
      } catch {
        // best-effort
      }
    }
  })
