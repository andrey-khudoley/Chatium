import * as settingsLib from '../settings.lib'
import { getFullUrl, ROUTE_PATHS } from '../../config/routes'
import {
  getPaymentPluginField,
  getPaymentPluginManifest,
  paymentPluginManifests
} from './pluginRegistry.lib'
import type {
  PaymentPluginId,
  PaymentPluginManifest,
  PluginPublicFieldValue,
  PluginRuntimeConfig,
  PluginWebhookEndpoint,
  PluginSettingField
} from '../../shared/pluginManifestTypes'

const confidentialSettingKeys = new Set<string>([
  settingsLib.SETTING_KEYS.LP_APIKEY,
  settingsLib.SETTING_KEYS.LP_LOGIN,
  settingsLib.SETTING_KEYS.LP_WEBHOOK_TOKEN,
  settingsLib.SETTING_KEYS.LAVA_TEST_APIKEY,
  settingsLib.SETTING_KEYS.LAVA_WEBHOOK_SECRET,
  settingsLib.SETTING_KEYS.GC_TEST_SCHOOL_API_KEY
])

function asPluginId(value: unknown): PaymentPluginId {
  if (value === 'lifepay' || value === 'lavatop' || value === 'getcourse') return value
  throw new Error('Unknown payment plugin')
}

function asSettingKey(value: unknown): string {
  const key = typeof value === 'string' ? value.trim() : ''
  if (!key) throw new Error('Plugin setting key is required')
  return key
}

function normalizeBooleanValue(value: unknown): string {
  if (value === true || value === 'true' || value === '1' || value === 1) return 'true'
  if (value === false || value === 'false' || value === '0' || value === 0) return 'false'
  throw new Error('Boolean plugin setting must be true or false')
}

function normalizeStringValue(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Plugin setting value must be a string')
  return value.trim()
}

function normalizeValue(field: PluginSettingField, value: unknown): string {
  if (field.readonly) throw new Error('Readonly plugin setting cannot be changed')
  if (field.input === 'boolean') return normalizeBooleanValue(value)

  const normalized = normalizeStringValue(value)
  if ((field.secret || confidentialSettingKeys.has(field.key)) && !normalized) {
    throw new Error('Secret plugin setting cannot be saved empty')
  }
  if (field.required && !field.hidden && !normalized) {
    throw new Error('Required plugin setting cannot be empty')
  }
  return normalized
}

function maskValue(key: string, value: string): string {
  if (!value) return ''
  if (key === settingsLib.SETTING_KEYS.LP_LOGIN && value.length === 11) {
    return `+${value.slice(0, 4)}***${value.slice(-4)}`
  }
  if (value.length <= 8) return '***'
  return `${value.slice(0, 3)}***${value.slice(-4)}`
}

function isWidgetMethodEnabledKey(key: string): boolean {
  return (
    key === settingsLib.SETTING_KEYS.WIDGET_LIFEPAY_ENABLED ||
    key === settingsLib.SETTING_KEYS.WIDGET_LAVATOP_ENABLED
  )
}

function buildAbsoluteRouteUrl(ctx: app.Ctx, routePath: string): string {
  return `https://${ctx.account.host}${getFullUrl(routePath)}`
}

async function getPluginWebhookEndpoints(
  ctx: app.Ctx,
  manifest: PaymentPluginManifest
): Promise<PluginWebhookEndpoint[]> {
  if (manifest.id === 'lifepay') {
    const token = await settingsLib.getLpWebhookToken(ctx)
    const url = new URL(buildAbsoluteRouteUrl(ctx, ROUTE_PATHS.webhook))
    url.searchParams.set('token', token || '<webhook_token>')
    return [
      {
        key: 'lifepay_webhook_url',
        label: 'Webhook URL',
        url: url.toString(),
        hint: 'Use this URL as the LifePay callback endpoint.'
      }
    ]
  }

  if (manifest.id === 'lavatop') {
    return [
      {
        key: 'lavatop_webhook_url',
        label: 'Webhook URL',
        url: buildAbsoluteRouteUrl(ctx, ROUTE_PATHS.webhookLavatop),
        hint: 'Use this URL in Lava.Top; the secret is sent in the request header.'
      }
    ]
  }

  return []
}

export function toPluginPublicFieldValue(
  field: PluginSettingField,
  raw: unknown
): PluginPublicFieldValue {
  if (field.input === 'boolean') {
    const value = raw === true || raw === 'true'
    return { key: field.key, hasValue: value, value }
  }

  const value = typeof raw === 'string' ? raw.trim() : ''
  const hasValue = value.length > 0
  if (field.secret || confidentialSettingKeys.has(field.key)) {
    return {
      key: field.key,
      hasValue,
      maskedValue: hasValue ? maskValue(field.key, value) : ''
    }
  }
  return { key: field.key, hasValue, value }
}

async function getPluginRuntimeConfig(
  ctx: app.Ctx,
  manifest: PaymentPluginManifest
): Promise<PluginRuntimeConfig> {
  const rawValues: Record<string, unknown> = {}
  const values: Record<string, PluginPublicFieldValue> = {}
  const missingRequired: string[] = []

  for (const field of manifest.fields) {
    rawValues[field.key] = await settingsLib.getSetting(ctx, field.key)
  }

  for (const field of manifest.fields) {
    const publicValue = toPluginPublicFieldValue(field, rawValues[field.key])
    values[field.key] = publicValue
    if (field.required && !publicValue.hasValue) missingRequired.push(field.key)
  }

  const configured = missingRequired.length === 0

  for (const field of manifest.fields) {
    if (!isWidgetMethodEnabledKey(field.key)) continue
    const storedRaw = await settingsLib.getStoredSetting(ctx, field.key)
    if (storedRaw === null) {
      values[field.key] = toPluginPublicFieldValue(field, configured ? 'true' : 'false')
    }
  }

  return {
    manifest,
    values,
    webhookEndpoints: await getPluginWebhookEndpoints(ctx, manifest),
    configured,
    missingRequired
  }
}

export async function getPluginSettingsPublicDto(ctx: app.Ctx): Promise<PluginRuntimeConfig[]> {
  const result: PluginRuntimeConfig[] = []
  for (const manifest of paymentPluginManifests) {
    result.push(await getPluginRuntimeConfig(ctx, manifest))
  }
  return result
}

export async function getPluginSettingPublicDto(
  ctx: app.Ctx,
  pluginId: PaymentPluginId
): Promise<PluginRuntimeConfig> {
  const manifest = getPaymentPluginManifest(pluginId)
  if (!manifest) throw new Error('Unknown payment plugin')
  return getPluginRuntimeConfig(ctx, manifest)
}

export async function savePluginSetting(
  ctx: app.Ctx,
  pluginIdRaw: unknown,
  keyRaw: unknown,
  value: unknown
): Promise<PluginRuntimeConfig> {
  const pluginId = asPluginId(pluginIdRaw)
  const key = asSettingKey(keyRaw)
  const field = getPaymentPluginField(pluginId, key)
  if (!field) throw new Error('Unknown plugin setting key')

  await settingsLib.setSetting(ctx, key, normalizeValue(field, value))
  return getPluginSettingPublicDto(ctx, pluginId)
}

export async function revealPluginSetting(
  ctx: app.Ctx,
  pluginIdRaw: unknown,
  keyRaw: unknown
): Promise<{ key: string; value: string }> {
  const pluginId = asPluginId(pluginIdRaw)
  const key = asSettingKey(keyRaw)
  const field = getPaymentPluginField(pluginId, key)
  if (!field) throw new Error('Unknown plugin setting key')
  if (!field.secret && !confidentialSettingKeys.has(field.key)) {
    throw new Error('Plugin setting is not revealable')
  }

  const raw = await settingsLib.getSetting(ctx, key)
  return { key, value: typeof raw === 'string' ? raw : '' }
}
