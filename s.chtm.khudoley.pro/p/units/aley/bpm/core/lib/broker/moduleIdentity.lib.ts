import * as modulesRepo from '../../repos/brokerModules.repo'
import * as settingsLib from '../settings.lib'
import { BrokerSemanticError } from './errorCodes.lib'
import { isAllowedByPatterns } from './patterns.lib'
import { asStringArray } from './types.lib'

export async function assertBrokerEnabled(ctx: app.Ctx): Promise<void> {
  const enabled = await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.BROKER_ENABLED)
  if (enabled === false) throw new BrokerSemanticError('broker_disabled', 'Broker is disabled')
}

export async function assertModuleRegistered(ctx: app.Ctx, moduleKey: string) {
  const row = await modulesRepo.findByModuleKey(ctx, moduleKey)
  if (!row) {
    throw new BrokerSemanticError('module_not_registered', 'Module is not registered', {
      moduleKey
    })
  }
  return row
}

export async function assertModuleEnabled(ctx: app.Ctx, moduleKey: string) {
  const row = await assertModuleRegistered(ctx, moduleKey)
  if (row.enabled !== true || row.adminDisabled === true) {
    throw new BrokerSemanticError('module_disabled', 'Module is disabled', { moduleKey })
  }
  return row
}

export function assertCanPublish(
  moduleRow: Awaited<ReturnType<typeof assertModuleEnabled>>,
  eventType: string
): void {
  const allowed = asStringArray(moduleRow.allowedPublishTypes)
  if (!isAllowedByPatterns(allowed, eventType)) {
    throw new BrokerSemanticError('forbidden_event_type', 'Module cannot publish this event type', {
      moduleKey: moduleRow.moduleKey,
      eventType
    })
  }
}

export function assertCanSubscribe(
  moduleRow: Awaited<ReturnType<typeof assertModuleRegistered>>,
  eventType: string
): void {
  const allowed = asStringArray(moduleRow.allowedSubscribeTypes)
  if (!isAllowedByPatterns(allowed, eventType)) {
    throw new BrokerSemanticError(
      'forbidden_event_type',
      'Module cannot subscribe to this event type',
      {
        moduleKey: moduleRow.moduleKey,
        eventType
      }
    )
  }
}
