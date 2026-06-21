// @shared
// Типы и константы для системы датасетов

/**
 * Период для анализа данных
 * Максимум: 180 дней (для предотвращения перегрузки системы)
 */
export const TIME_PERIODS = [
  { id: '1h', name: 'Последний час' },
  { id: '24h', name: 'Последние 24 часа' },
  { id: '7d', name: 'Последние 7 дней' },
  { id: '30d', name: 'Последние 30 дней' },
  { id: '90d', name: 'Последние 90 дней' },
  { id: '180d', name: 'Последние 180 дней' }
] as const

/**
 * Базовый интерфейс компонента датасета
 * Компонент датасета - точечный запрос по одному типу события, возвращающий показатель
 */
export interface DatasetComponent {
  id: string
  title: string
  eventType: string // ОДИН тип события из ClickHouse (например: 'user/created')
  settings: DatasetComponentSettings
}

/**
 * Группа URL фильтров (старый формат, для обратной совместимости)
 * Фильтры внутри группы объединяются через И (AND)
 * Группы объединяются через ИЛИ (OR)
 */
export interface UrlFilterGroup {
  urls: string[] // Массив URL фильтров (домен, путь или UTM параметры вида utm_source=google)
}

/**
 * Операторы для фильтров
 */
export type FilterOperator =
  | 'is'
  | 'isNot'
  | 'contains'
  | 'doesNotContain'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty'

/**
 * Свойства для фильтрации (для pageview событий)
 */
export type FilterProperty =
  | 'urlPath'
  | 'url'
  | 'utm_source'
  | 'utm_medium'
  | 'utm_campaign'
  | 'utm_term'
  | 'utm_content'

/**
 * Условие фильтра (правило)
 */
export interface FilterCondition {
  id: string // Уникальный ID условия
  property: FilterProperty // Свойство для фильтрации
  operator: FilterOperator // Оператор сравнения
  value?: string // Значение (опционально, не требуется для isEmpty/isNotEmpty)
}

/**
 * Группа фильтров (может содержать условия и вложенные группы)
 */
export interface FilterGroup {
  id: string // Уникальный ID группы
  operator: 'AND' | 'OR' // Оператор для объединения элементов группы
  conditions: Array<FilterCondition | FilterGroup> // Массив условий и/или вложенных групп
}

/**
 * Корневой фильтр (может быть массивом для обратной совместимости или объектом с оператором)
 */
export type FilterRoot =
  | Array<FilterCondition | FilterGroup>
  | {
      operator: 'AND' | 'OR' // Оператор между элементами на корневом уровне
      conditions: Array<FilterCondition | FilterGroup> // Массив условий и групп
    }

/**
 * Настройки компонента датасета
 */
export interface DatasetComponentSettings {
  description?: string // Описание компонента
  // Новый формат: иерархическая структура фильтров в стиле Notion
  filter?: FilterRoot // Корневой фильтр (массив условий и групп)
  // Старый формат (для обратной совместимости)
  urlGroups?: UrlFilterGroup[] // Группы URL фильтров (каждая группа - И, между группами - ИЛИ)
  urls?: string[] // Фильтр по URL (старый формат, для обратной совместимости)
  urlOperator?: 'AND' | 'OR' // Оператор для объединения URL фильтров (старый формат, для обратной совместимости)
  // В будущем: тип агрегации (count, sum, avg и т.д.)
}

/**
 * Интерфейс конфигурации датасета
 */
export interface DatasetConfig {
  components: DatasetComponent[]
}

/**
 * Интерфейс датасета из базы данных
 */
export interface Dataset {
  id: string
  name: string
  description: string
  config: string // JSON строка с DatasetConfig
  createdAt: Date
  updatedAt: Date
}
