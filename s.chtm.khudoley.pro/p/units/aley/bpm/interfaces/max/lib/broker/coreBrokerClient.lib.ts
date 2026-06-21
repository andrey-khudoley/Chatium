import { runAppFunction } from '@app/app'
import { PROJECT_ROOT as MODULE_KEY } from '../../config/routes'
import {
  BROKER_EVENT_CONTRACTS,
  buildMaxUpdateEventContract,
  buildMiniappEventContract
} from '../../contracts/brokerEvents'
import * as settingsLib from '../settings.lib'

const CORE_BROKER_TARGET_APP = 'p/units/aley/bpm/core'

export type CoreBrokerResult = { success: boolean; [key: string]: unknown }

async function getBrokerModuleAuthToken(ctx: app.Ctx): Promise<string> {
  const token = await settingsLib.getRawSecretSettingString(
    ctx,
    settingsLib.SETTING_KEYS.CORE_BROKER_MODULE_TOKEN
  )
  if (!token) throw new Error('core_broker_module_token is not configured')
  return token
}

export async function registerMaxBrokerModule(
  ctx: app.Ctx,
  eventTypes: string[] = []
): Promise<CoreBrokerResult> {
  const authToken = await getBrokerModuleAuthToken(ctx)
  const contracts = [
    ...BROKER_EVENT_CONTRACTS,
    ...eventTypes
      .filter(
        (eventType) => eventType.startsWith('max.') && eventType !== 'max.miniapp.root.bootstrap'
      )
      .map((eventType) =>
        eventType.startsWith('max.miniapp.')
          ? buildMiniappEventContract(eventType)
          : buildMaxUpdateEventContract(eventType)
      )
  ]
  return runAppFunction(ctx, CORE_BROKER_TARGET_APP, '/broker/modules/register', {
    moduleKey: MODULE_KEY,
    authToken,
    request: {
      module: {
        moduleKey: MODULE_KEY,
        displayName: 'BPM Interfaces Max',
        kind: 'interface',
        enabled: true,
        allowedPublishTypes: ['max.*'],
        allowedSubscribeTypes: []
      },
      eventContracts: contracts.map((contract) => ({
        ...contract,
        sourceRef: { ...contract.sourceRef },
        display: contract.display ? { ...contract.display } : undefined,
        examples: contract.examples ? [...contract.examples] : []
      }))
    }
  })
}

export async function publishCoreBrokerEvent(
  ctx: app.Ctx,
  request: {
    eventType: string
    eventVersion: number
    occurredAt?: number
    targetModules?: string[]
    aggregateType?: string
    aggregateId?: string
    correlationId?: string
    causationId?: string
    idempotencyKey?: string
    payload: unknown
    metadata?: Record<string, unknown>
  }
): Promise<CoreBrokerResult> {
  const authToken = await getBrokerModuleAuthToken(ctx)
  await registerMaxBrokerModule(ctx, [request.eventType])
  return runAppFunction(ctx, CORE_BROKER_TARGET_APP, '/broker/publish', {
    producerModule: MODULE_KEY,
    authToken,
    request
  })
}
