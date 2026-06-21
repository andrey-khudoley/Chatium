import { SETTING_KEYS } from '../../lib/settings.lib'
import { INTERNAL_GATEWAY_PROJECT_ROOTS } from '../../config/gatewayUrls'
import type { PaymentPluginManifest } from '../../shared/pluginManifestTypes'

export const getcoursePluginManifest: PaymentPluginManifest = {
  id: 'getcourse',
  title: 'GetCourse',
  description: 'Integration settings for GetCourse offers and payment requests.',
  icon: 'fa-graduation-cap',
  fields: [
    {
      key: SETTING_KEYS.GC_BASE_URL,
      label: 'Gateway base URL',
      input: 'url',
      placeholder: `auto: /${INTERNAL_GATEWAY_PROJECT_ROOTS.gc}`,
      hint: 'Optional override for the server gateway URL. Leave empty for the current workspace gateway.'
    },
    {
      key: SETTING_KEYS.GC_TEST_SCHOOL_API_KEY,
      label: 'School API key',
      input: 'password',
      secret: true,
      required: true
    },
    {
      key: SETTING_KEYS.GC_TEST_SCHOOL_HOST,
      label: 'School host',
      input: 'text',
      required: true,
      placeholder: 'example.getcourse.ru'
    },
    {
      key: SETTING_KEYS.GC_ENABLED,
      label: 'Enabled',
      input: 'boolean'
    },
    {
      key: SETTING_KEYS.GC_CREATE_PAYMENT,
      label: 'Create payment in GetCourse',
      input: 'boolean'
    },
    {
      key: SETTING_KEYS.GC_DEAL_STATUS,
      label: 'Order status after payment webhook',
      input: 'select',
      hint: 'Status passed to GetCourse createDeal when a payment webhook is received.',
      options: [
        { label: 'Новый', value: 'new' },
        { label: 'В работе', value: 'in_work' },
        { label: 'Не подтверждён', value: 'not_confirmed' },
        { label: 'Ожидает оплаты', value: 'payment_waiting' },
        { label: 'Ожидает возврата', value: 'waiting_for_return' },
        { label: 'Частично оплачен', value: 'part_payed' },
        { label: 'Завершён', value: 'payed' },
        { label: 'Отменён', value: 'cancelled' },
        { label: 'Ложный', value: 'false' }
      ]
    }
  ]
}
