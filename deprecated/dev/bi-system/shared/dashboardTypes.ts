// @shared
// Типы и константы для конфигурации дашбордов

export type DashboardViewType = 'counter' | 'simple-table' | 'pivot-table'

export interface PivotAttributionField {
  id: string
  label: string
  description: string
  clickhouseColumn: string
}

/**
 * Доступные атрибуции для сводной таблицы.
 * Порядок в массиве используется как порядок по умолчанию при добавлении.
 */
export const PIVOT_ATTRIBUTION_FIELDS: PivotAttributionField[] = [
  {
    id: 'utm_source',
    label: 'utm_source — источник трафика',
    description: 'Например: google, yandex, vk, facebook',
    clickhouseColumn: 'utm_source'
  },
  {
    id: 'utm_medium',
    label: 'utm_medium — тип канала',
    description: 'Например: cpc, email, referral',
    clickhouseColumn: 'utm_medium'
  },
  {
    id: 'utm_campaign',
    label: 'utm_campaign — кампания',
    description: 'Название кампании или промо-акции',
    clickhouseColumn: 'utm_campaign'
  },
  {
    id: 'utm_term',
    label: 'utm_term — ключевое слово',
    description: 'Ключевое слово для рекламных кампаний',
    clickhouseColumn: 'utm_term'
  },
  {
    id: 'utm_content',
    label: 'utm_content — вариант объявления',
    description: 'Текст/баннер, версия объявления или сплит-тест',
    clickhouseColumn: 'utm_content'
  }
]
