import { SETTING_KEYS } from '../settings.lib'
import { getcoursePluginManifest } from '../../plugins/getcourse/manifest'
import { lavatopPluginManifest } from '../../plugins/lavatop/manifest'
import { lifepayPluginManifest } from '../../plugins/lifepay/manifest'
import type {
  PaymentPluginId,
  PaymentPluginManifest,
  PluginSettingField
} from '../../shared/pluginManifestTypes'

export const paymentPluginManifests: PaymentPluginManifest[] = [
  lifepayPluginManifest,
  lavatopPluginManifest,
  getcoursePluginManifest
]

const knownSettingKeys = new Set<string>(Object.values(SETTING_KEYS))
const allowedPluginWidgetKeys = new Set<string>([
  SETTING_KEYS.WIDGET_LIFEPAY_ENABLED,
  SETTING_KEYS.WIDGET_LAVATOP_ENABLED,
  SETTING_KEYS.WIDGET_LAVATOP_PRODUCT_ID,
  SETTING_KEYS.WIDGET_LAVATOP_OFFER_ID,
  SETTING_KEYS.WIDGET_LAVATOP_MANUAL_RATE_USD,
  SETTING_KEYS.WIDGET_LAVATOP_MANUAL_RATE_EUR
])

export function validatePaymentPluginManifests(manifests = paymentPluginManifests): void {
  const pluginIds = new Set<string>()
  const settingKeys = new Set<string>()

  for (const manifest of manifests) {
    if (pluginIds.has(manifest.id)) {
      throw new Error(`Duplicate payment plugin id: ${manifest.id}`)
    }
    pluginIds.add(manifest.id)

    const fieldKeys = new Set<string>()
    for (const field of manifest.fields) {
      if (fieldKeys.has(field.key)) {
        throw new Error(`Duplicate field key in plugin ${manifest.id}: ${field.key}`)
      }
      fieldKeys.add(field.key)

      if (settingKeys.has(field.key)) {
        throw new Error(`Payment plugin setting key is used twice: ${field.key}`)
      }
      settingKeys.add(field.key)

      if (!knownSettingKeys.has(field.key)) {
        throw new Error(`Unknown setting key in plugin ${manifest.id}: ${field.key}`)
      }
      if (field.key.startsWith('widget_') && !allowedPluginWidgetKeys.has(field.key)) {
        throw new Error(
          `Legacy widget key cannot be used by payment plugin ${manifest.id}: ${field.key}`
        )
      }
    }
  }
}

export function getPaymentPluginManifest(
  pluginId: PaymentPluginId
): PaymentPluginManifest | undefined {
  return paymentPluginManifests.find((manifest) => manifest.id === pluginId)
}

export function getPaymentPluginField(
  pluginId: PaymentPluginId,
  key: string
): PluginSettingField | undefined {
  return getPaymentPluginManifest(pluginId)?.fields.find((field) => field.key === key)
}

validatePaymentPluginManifests()
