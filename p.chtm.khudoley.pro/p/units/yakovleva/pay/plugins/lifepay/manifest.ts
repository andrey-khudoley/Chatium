import { SETTING_KEYS } from '../../lib/settings.lib'
import { INTERNAL_GATEWAY_PROJECT_ROOTS } from '../../config/gatewayUrls'
import type { PaymentPluginManifest } from '../../shared/pluginManifestTypes'

export const lifepayPluginManifest: PaymentPluginManifest = {
  id: 'lifepay',
  title: 'LifePay',
  description: 'Gateway settings for LifePay payments.',
  icon: 'fa-credit-card',
  fields: [
    {
      key: SETTING_KEYS.WIDGET_LIFEPAY_ENABLED,
      label: 'Метод оплаты',
      input: 'boolean',
      hint: 'Работает после заполнения обязательных настроек LifePay.'
    },
    {
      key: SETTING_KEYS.LP_APIKEY,
      label: 'API key',
      input: 'password',
      secret: true,
      required: true,
      placeholder: 'LifePay API key'
    },
    {
      key: SETTING_KEYS.LP_LOGIN,
      label: 'Login',
      input: 'text',
      required: true,
      placeholder: '+79991234567'
    },
    {
      key: SETTING_KEYS.LP_WEBHOOK_TOKEN,
      label: 'Webhook token',
      input: 'password',
      secret: true,
      required: true,
      generator: 'hex32'
    },
    {
      key: SETTING_KEYS.GATEWAY_BASE_URL,
      label: 'Gateway base URL',
      input: 'url',
      placeholder: `auto: /${INTERNAL_GATEWAY_PROJECT_ROOTS.lifepay}`,
      hint: 'Optional override for the server gateway URL. Leave empty for the current workspace gateway.'
    }
  ]
}
