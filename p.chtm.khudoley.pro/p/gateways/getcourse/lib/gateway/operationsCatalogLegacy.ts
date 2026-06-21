/**
 * Записи каталога операций gateway — контур legacy. Вынесено из operationsCatalog
 * ради лимита размера файла; собирается в общий каталог в operationsCatalog (порядок сохранён).
 */
// @ts-ignore  системный модуль Chatium, локальных типов нет
import { s } from '@app/schema'
import { type OperationEntry, EMPTY_SCHEMA, passthrough } from './operationsCatalogTypes'

export const operationsCatalogLegacy: OperationEntry[] = [
  {
    op: 'addUser',
    contour: 'legacy',
    httpMethod: 'POST',
    pathTemplate: '/users',
    availability: 'disabled',
    legacyImportAction: 'add',
    // Назначения полей — по официальной документации GetCourse (getcourse.ru/help/api, /pl/api/users).
    argsValidator: s.object(
      {
        params: s
          .object(
            {
              user: s
                .object(
                  {
                    email: s
                      .string()
                      .describe('Email пользователя — обязателен, ключ идентификации'),
                    phone: s.string().describe('Телефон пользователя').optional(),
                    first_name: s.string().describe('Имя пользователя').optional(),
                    last_name: s.string().describe('Фамилия пользователя').optional(),
                    city: s.string().describe('Город проживания').optional(),
                    country: s.string().describe('Страна').optional(),
                    group_name: s
                      .array(s.string())
                      .describe('Массив названий групп для добавления пользователя')
                      .optional(),
                    addfields: s
                      .any()
                      .describe('Дополнительные поля пользователя (произвольные)')
                      .optional()
                  },
                  passthrough
                )
                .describe('Данные пользователя'),
              system: s
                .any()
                .describe(
                  'Системные параметры импорта: refresh_if_exists, partner_email, user_status и др.'
                )
                .optional(),
              session: s
                .any()
                .describe('Данные сессии/источника (utm-метки, ip и т. п.)')
                .optional()
            },
            passthrough
          )
          .describe('Корневой объект импорта пользователя GetCourse (/pl/api/users)')
      },
      passthrough
    ),
    argsSchema: {
      fields: [
        {
          name: 'params',
          type: 'object',
          required: true,
          description: 'Корневой объект импорта пользователя: user / system / session'
        }
      ]
    }
  },
  {
    op: 'createDeal',
    contour: 'legacy',
    httpMethod: 'POST',
    pathTemplate: '/deals',
    availability: 'enabled',
    legacyImportAction: 'add',
    // Назначения полей — по официальной документации GetCourse (getcourse.ru/help/api, /pl/api/deals).
    argsValidator: s.object(
      {
        params: s
          .object(
            {
              user: s
                .object(
                  {
                    email: s
                      .string()
                      .describe('Email клиента — обязателен, ключ идентификации пользователя'),
                    phone: s.string().describe('Телефон клиента').optional(),
                    first_name: s.string().describe('Имя клиента').optional(),
                    last_name: s.string().describe('Фамилия клиента').optional()
                  },
                  passthrough
                )
                .describe('Данные покупателя (владельца заказа)'),
              deal: s
                .object(
                  {
                    offer_code: s
                      .string()
                      .describe('Символьный код предложения (offer); альтернатива offer_id')
                      .optional(),
                    offer_id: s.number().describe('ID предложения (offer) в GetCourse').optional(),
                    deal_number: s
                      .string()
                      .describe('Номер заказа — для привязки/редактирования существующей сделки')
                      .optional(),
                    deal_cost: s.number().describe('Сумма заказа').optional(),
                    deal_status: s
                      .string()
                      .describe('Статус сделки: new, payed, cancelled, in_work и др.')
                      .optional(),
                    deal_is_paid: s.string().describe('Признак оплаты заказа (да/нет)').optional(),
                    deal_currency: s
                      .string()
                      .describe('Код валюты заказа (RUB, USD, EUR…)')
                      .optional(),
                    funnel_id: s.number().describe('ID воронки (доски продаж)').optional(),
                    funnel_stage_id: s.number().describe('ID этапа воронки').optional()
                  },
                  passthrough
                )
                .describe('Данные заказа/сделки'),
              system: s
                .any()
                .describe(
                  'Системные параметры импорта: refresh_if_exists, multiple_offers, return_payment_link, partner_email и др.'
                )
                .optional()
            },
            passthrough
          )
          .describe('Корневой объект импорта сделки GetCourse (/pl/api/deals)')
      },
      passthrough
    ),
    argsSchema: {
      fields: [
        {
          name: 'params',
          type: 'object',
          required: true,
          description: 'Корневой объект импорта сделки: user / deal / system'
        }
      ]
    }
  },
  {
    op: 'exportUsers',
    contour: 'legacy',
    httpMethod: 'GET',
    pathTemplate: '/account/users',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object(
      {
        // bracket-ключи GC (created_at[from]/[to]) — невалидные имена Heap.Object,
        // проходят через passthrough; описаны в argsSchema для UI-формы.
        status: s.string().optional(),
        email: s.string().optional(),
        idgrouplist: s.string().optional()
      },
      passthrough
    ),
    argsSchema: {
      fields: [
        { name: 'created_at[from]', type: 'string', required: false },
        { name: 'created_at[to]', type: 'string', required: false },
        { name: 'status', type: 'string', required: false },
        { name: 'email', type: 'string', required: false },
        { name: 'idgrouplist', type: 'string', required: false }
      ]
    }
  },
  {
    op: 'exportGroupUsers',
    contour: 'legacy',
    httpMethod: 'GET',
    pathTemplate: '/account/groups/{groupId}/users',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object(
      {
        groupId: s.string(),
        // bracket-ключи GC (created_at[from]/[to], added_at[from]/[to]) — невалидные имена
        // Heap.Object, проходят через passthrough; описаны в argsSchema для UI-формы.
        status: s.string().optional()
      },
      passthrough
    ),
    argsSchema: {
      fields: [
        { name: 'groupId', type: 'string', required: true },
        { name: 'created_at[from]', type: 'string', required: false },
        { name: 'created_at[to]', type: 'string', required: false },
        { name: 'added_at[from]', type: 'string', required: false },
        { name: 'added_at[to]', type: 'string', required: false },
        { name: 'status', type: 'string', required: false }
      ]
    }
  },
  {
    op: 'exportDeals',
    contour: 'legacy',
    httpMethod: 'GET',
    pathTemplate: '/account/deals',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object(
      {
        // bracket-ключи GC (created_at[from]/[to], payed_at[from]/[to]) — невалидные имена
        // Heap.Object, проходят через passthrough; описаны в argsSchema для UI-формы.
        status: s.string().optional(),
        user_in_group: s.number().optional(),
        user_id: s.number().optional()
      },
      passthrough
    ),
    argsSchema: {
      fields: [
        { name: 'created_at[from]', type: 'string', required: false },
        { name: 'created_at[to]', type: 'string', required: false },
        { name: 'status', type: 'string', required: false },
        { name: 'payed_at[from]', type: 'string', required: false },
        { name: 'payed_at[to]', type: 'string', required: false },
        { name: 'user_in_group', type: 'number', required: false },
        { name: 'user_id', type: 'number', required: false }
      ]
    }
  },
  {
    op: 'exportPayments',
    contour: 'legacy',
    httpMethod: 'GET',
    pathTemplate: '/account/payments',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object(
      {
        // bracket-ключи GC (created_at[from]/[to], status_changed_at[from]/[to]) — невалидные
        // имена Heap.Object, проходят через passthrough; описаны в argsSchema для UI-формы.
        status: s.string().optional()
      },
      passthrough
    ),
    argsSchema: {
      fields: [
        { name: 'created_at[from]', type: 'string', required: false },
        { name: 'created_at[to]', type: 'string', required: false },
        { name: 'status', type: 'string', required: false },
        { name: 'status_changed_at[from]', type: 'string', required: false },
        { name: 'status_changed_at[to]', type: 'string', required: false }
      ]
    }
  },
  {
    op: 'getCustomFields',
    contour: 'legacy',
    httpMethod: 'GET',
    pathTemplate: '/account/fields',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({}, passthrough),
    argsSchema: EMPTY_SCHEMA
  },
  {
    op: 'getExportResult',
    contour: 'legacy',
    httpMethod: 'GET',
    pathTemplate: '/account/exports/{exportId}',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ exportId: s.string() }, passthrough),
    argsSchema: { fields: [{ name: 'exportId', type: 'string', required: true }] }
  }
]
