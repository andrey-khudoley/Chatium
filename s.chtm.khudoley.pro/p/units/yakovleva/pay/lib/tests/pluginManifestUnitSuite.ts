import { SETTING_KEYS } from '../settings.lib'
import {
  paymentPluginManifests,
  validatePaymentPluginManifests
} from '../plugins/pluginRegistry.lib'
import {
  revealPluginSetting,
  savePluginSetting,
  toPluginPublicFieldValue
} from '../plugins/pluginSettings.lib'
import { resolveWidgetMethodEnabled } from '../widget/widgetSettings.lib'
import { tryPush, tryPushAsync, type LifepayUnitTestResult } from './lifepayUnitHelpers'

const knownSettingKeys = new Set<string>(Object.values(SETTING_KEYS))
const pluginManagedWidgetKeys = new Set<string>([
  SETTING_KEYS.WIDGET_LIFEPAY_ENABLED,
  SETTING_KEYS.WIDGET_LAVATOP_ENABLED,
  SETTING_KEYS.WIDGET_LAVATOP_PRODUCT_ID,
  SETTING_KEYS.WIDGET_LAVATOP_OFFER_ID,
  SETTING_KEYS.WIDGET_LAVATOP_MANUAL_RATE_USD,
  SETTING_KEYS.WIDGET_LAVATOP_MANUAL_RATE_EUR
])

export async function runPluginManifestUnitChecks(): Promise<LifepayUnitTestResult[]> {
  const results: LifepayUnitTestResult[] = []

  tryPush(results, 'plugin_manifests_validate', 'payment plugin manifests validate', () => {
    validatePaymentPluginManifests()
    return true
  })

  tryPush(results, 'plugin_manifest_ids', 'plugin ids are lifepay/lavatop/getcourse', () => {
    const ids = paymentPluginManifests.map((manifest) => manifest.id).sort()
    return ids.join(',') === 'getcourse,lavatop,lifepay'
  })

  tryPush(
    results,
    'plugin_manifest_field_keys_unique',
    'plugin field keys are globally unique',
    () => {
      const keys = paymentPluginManifests.flatMap((manifest) =>
        manifest.fields.map((field) => field.key)
      )
      return new Set(keys).size === keys.length
    }
  )

  tryPush(results, 'plugin_manifest_keys_known', 'plugin field keys exist in SETTING_KEYS', () =>
    paymentPluginManifests.every((manifest) =>
      manifest.fields.every((field) => knownSettingKeys.has(field.key))
    )
  )

  tryPush(
    results,
    'plugin_manifest_widget_keys_limited',
    'payment plugins only use explicitly migrated widget_* keys',
    () =>
      paymentPluginManifests.every((manifest) =>
        manifest.fields.every(
          (field) => !field.key.startsWith('widget_') || pluginManagedWidgetKeys.has(field.key)
        )
      )
  )

  tryPush(
    results,
    'plugin_secret_public_value_write_only',
    'secret public DTO has no raw value',
    () => {
      const field = paymentPluginManifests
        .flatMap((manifest) => manifest.fields)
        .find((item) => item.key === SETTING_KEYS.LP_APIKEY)
      if (!field) return false
      const dto = toPluginPublicFieldValue(field, 'sk_test_secret_value')
      return (
        dto.hasValue === true &&
        dto.value === undefined &&
        dto.maskedValue !== 'sk_test_secret_value'
      )
    }
  )

  tryPush(results, 'plugin_login_public_value_masked', 'lp_login is masked in public DTO', () => {
    const field = paymentPluginManifests
      .flatMap((manifest) => manifest.fields)
      .find((item) => item.key === SETTING_KEYS.LP_LOGIN)
    if (!field) return false
    const dto = toPluginPublicFieldValue(field, '79991234567')
    return dto.hasValue === true && dto.value === undefined && dto.maskedValue === '+7999***4567'
  })

  tryPush(
    results,
    'plugin_boolean_public_value',
    'boolean public DTO returns boolean value',
    () => {
      const field = paymentPluginManifests
        .flatMap((manifest) => manifest.fields)
        .find((item) => item.key === SETTING_KEYS.GC_ENABLED)
      if (!field) return false
      const dto = toPluginPublicFieldValue(field, 'true')
      return dto.hasValue === true && dto.value === true
    }
  )

  tryPush(
    results,
    'plugin_widget_method_enabled_fallback',
    'configured plugin without stored widget toggle is enabled',
    () => resolveWidgetMethodEnabled(null, true) === true
  )

  tryPush(
    results,
    'plugin_widget_method_enabled_explicit_false',
    'explicit false widget toggle disables configured plugin',
    () => resolveWidgetMethodEnabled('false', true) === false
  )

  tryPush(
    results,
    'plugin_widget_method_enabled_requires_config',
    'widget method stays disabled while plugin is not configured',
    () => resolveWidgetMethodEnabled('true', false) === false
  )

  await tryPushAsync(
    results,
    'plugin_save_unknown_plugin_rejected',
    'unknown plugin is rejected before save',
    async () => {
      try {
        await savePluginSetting({} as app.Ctx, 'unknown', SETTING_KEYS.LP_APIKEY, 'x')
        return false
      } catch (e) {
        return String(e).includes('Unknown payment plugin')
      }
    }
  )

  await tryPushAsync(
    results,
    'plugin_save_unknown_key_rejected',
    'unknown plugin key is rejected before save',
    async () => {
      try {
        await savePluginSetting({} as app.Ctx, 'lifepay', 'widget_lifepay_min', '10')
        return false
      } catch (e) {
        return String(e).includes('Unknown plugin setting key')
      }
    }
  )

  await tryPushAsync(
    results,
    'plugin_save_object_value_rejected',
    'object plugin value is rejected before save',
    async () => {
      try {
        await savePluginSetting({} as app.Ctx, 'lifepay', SETTING_KEYS.GATEWAY_BASE_URL, {
          url: 'https://example.test'
        })
        return false
      } catch (e) {
        return String(e).includes('Plugin setting value must be a string')
      }
    }
  )

  await tryPushAsync(
    results,
    'plugin_reveal_non_secret_rejected',
    'non-secret plugin field cannot be revealed',
    async () => {
      try {
        await revealPluginSetting({} as app.Ctx, 'lifepay', SETTING_KEYS.GATEWAY_BASE_URL)
        return false
      } catch (e) {
        return String(e).includes('Plugin setting is not revealable')
      }
    }
  )

  return results
}
