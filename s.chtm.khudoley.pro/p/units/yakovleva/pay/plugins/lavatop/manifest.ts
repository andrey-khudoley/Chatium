import { SETTING_KEYS } from '../../lib/settings.lib'
import { INTERNAL_GATEWAY_PROJECT_ROOTS } from '../../config/gatewayUrls'
import type { PaymentPluginManifest } from '../../shared/pluginManifestTypes'

export const lavatopPluginManifest: PaymentPluginManifest = {
  id: 'lavatop',
  title: 'Lava.Top',
  description: 'Gateway settings for Lava.Top payments.',
  icon: 'fa-fire',
  fields: [
    {
      key: SETTING_KEYS.WIDGET_LAVATOP_ENABLED,
      label: 'Метод оплаты',
      input: 'boolean',
      hint: 'Работает после выбора продукта, оффера и заполнения обязательных настроек Lava.Top.'
    },
    {
      key: SETTING_KEYS.LAVA_TEST_APIKEY,
      label: 'API key',
      input: 'password',
      secret: true,
      required: true,
      placeholder: 'Lava.Top API key'
    },
    {
      key: SETTING_KEYS.LAVA_BASE_URL,
      label: 'Gateway base URL',
      input: 'url',
      placeholder: `auto: /${INTERNAL_GATEWAY_PROJECT_ROOTS.lavatop}`,
      hint: 'Optional override for the server gateway URL. Leave empty for the current workspace gateway.'
    },
    {
      key: SETTING_KEYS.LAVA_WEBHOOK_SECRET,
      label: 'Webhook secret',
      input: 'password',
      secret: true,
      required: true,
      generator: 'hex64'
    },
    {
      key: SETTING_KEYS.WIDGET_LAVATOP_MANUAL_RATE_USD,
      label: 'Курс USD к RUB',
      input: 'text',
      placeholder: 'например 95.50',
      hint: 'Опционально. Рублей за 1 USD; если пусто или невалидно, используется курс ЦБ.'
    },
    {
      key: SETTING_KEYS.WIDGET_LAVATOP_MANUAL_RATE_EUR,
      label: 'Курс EUR к RUB',
      input: 'text',
      placeholder: 'например 103.20',
      hint: 'Опционально. Рублей за 1 EUR; если пусто или невалидно, используется курс ЦБ.'
    },
    {
      key: SETTING_KEYS.WIDGET_LAVATOP_PRODUCT_ID,
      label: 'Lava.Top product',
      input: 'text',
      required: true,
      hidden: true
    },
    {
      key: SETTING_KEYS.WIDGET_LAVATOP_OFFER_ID,
      label: 'Lava.Top offer',
      input: 'text',
      required: true,
      hidden: true
    }
  ]
}
