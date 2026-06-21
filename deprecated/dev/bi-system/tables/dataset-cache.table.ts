import { Heap } from '@app/heap'
import { AnalyticsDatasets } from './datasets.table'

/**
 * Таблица для кэширования событий датасетов
 * Хранит все события, относящиеся к компонентам датасетов, для быстрого доступа
 *
 * Поля событий соответствуют структуре таблицы chatium_ai.access_log в ClickHouse
 */
export const AnalyticsDatasetCache = Heap.Table('analytics_dataset_cache_a7b3c9d2', {
  // Связь с датасетом и компонентом
  dataset_id: Heap.RefLink(AnalyticsDatasets, {
    customMeta: { title: 'ID датасета' }
  }),
  component_id: Heap.String({
    customMeta: { title: 'ID компонента датасета' }
  }),

  // Сегмент для батчевого удаления (каждые 1000 записей = один сегмент)
  segment: Heap.String({
    customMeta: { title: 'Сегмент записи (для батчевого удаления)' }
  }),

  // Основные поля события
  ts: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Timestamp события' }
    })
  ),
  dt: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Дата события' }
    })
  ),
  url: Heap.Optional(
    Heap.String({
      customMeta: { title: 'URL события' }
    })
  ),
  urlPath: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Путь URL события' }
    })
  ),
  action: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Действие события' }
    })
  ),

  // Параметры действия
  action_param1: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Параметр действия 1' }
    })
  ),
  action_param2: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Параметр действия 2' }
    })
  ),
  action_param3: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Параметр действия 3' }
    })
  ),
  action_param1_float: Heap.Optional(
    Heap.Number({
      customMeta: { title: 'Параметр действия 1 (float)' }
    })
  ),
  action_param1_int: Heap.Optional(
    Heap.Number({
      customMeta: { title: 'Параметр действия 1 (int)' }
    })
  ),

  // Идентификаторы пользователя
  uid: Heap.Optional(
    Heap.String({
      customMeta: { title: 'UID пользователя' }
    })
  ),
  user_id: Heap.Optional(
    Heap.String({
      customMeta: { title: 'User ID' }
    })
  ),
  session_id: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Session ID' }
    })
  ),

  // Информация о пользователе
  user_first_name: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Имя пользователя' }
    })
  ),
  user_last_name: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Фамилия пользователя' }
    })
  ),
  user_email: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Email пользователя' }
    })
  ),
  user_phone: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Телефон пользователя' }
    })
  ),
  user_account_role: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Роль аккаунта пользователя' }
    })
  ),

  // Метаданные события
  title: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Заголовок события' }
    })
  ),
  referer: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Referer' }
    })
  ),
  user_agent: Heap.Optional(
    Heap.String({
      customMeta: { title: 'User Agent' }
    })
  ),

  // Локация
  ip: Heap.Optional(
    Heap.String({
      customMeta: { title: 'IP адрес' }
    })
  ),
  location_country: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Страна' }
    })
  ),
  location_city: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Город' }
    })
  ),

  // GetCourse идентификаторы
  gc_visitor_id: Heap.Optional(
    Heap.String({
      customMeta: { title: 'GetCourse Visitor ID' }
    })
  ),

  // User Agent детали
  ua_os_name: Heap.Optional(
    Heap.String({
      customMeta: { title: 'ОС' }
    })
  ),
  ua_device_type: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Тип устройства' }
    })
  ),
  ua_client_name: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Клиент' }
    })
  ),
  ua_client_version: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Версия клиента' }
    })
  ),

  // Параметры URL (включая UTM-метки и другие параметры)
  params: Heap.Optional(
    Heap.Any({
      customMeta: { title: 'Параметры URL' }
    })
  )
})
