/**
 * Записи каталога операций gateway — контур new (часть 1). Вынесено из operationsCatalog
 * ради лимита размера файла; собирается в общий каталог в operationsCatalog (порядок сохранён).
 */
// @ts-ignore  системный модуль Chatium, локальных типов нет
import { s } from '@app/schema'
import { type OperationEntry, EMPTY_SCHEMA } from './operationsCatalogTypes'

export const operationsCatalogNew1: OperationEntry[] = [
  {
    op: 'setUri',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/set-uri',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ uri: s.string(), event_id: s.number(), event_object_id: s.number() }),
    argsSchema: {
      fields: [
        { name: 'uri', type: 'string', required: true },
        { name: 'event_id', type: 'number', required: true },
        { name: 'event_object_id', type: 'number', required: true }
      ]
    }
  },
  {
    op: 'getAllGroups',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/common/get-groups',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({}),
    argsSchema: EMPTY_SCHEMA
  },
  {
    op: 'getAllPersonalManagers',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/common/get-personal-managers',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({}),
    argsSchema: EMPTY_SCHEMA
  },
  {
    op: 'getTrainings',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/common/get-trainings',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({}),
    argsSchema: EMPTY_SCHEMA
  },
  {
    op: 'addCommentToDeal',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/deal/add-comment',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ dealId: s.number(), userId: s.number(), text: s.string() }),
    argsSchema: {
      fields: [
        { name: 'dealId', type: 'number', required: true },
        { name: 'userId', type: 'number', required: true },
        { name: 'text', type: 'string', required: true }
      ]
    }
  },
  {
    op: 'addDealPositions',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/deal/add-positions',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({
      dealId: s.number(),
      positions: s.array(
        s.object({
          offerId: s.number().optional(),
          price: s.number().optional(),
          quantity: s.number().optional()
        })
      )
    }),
    argsSchema: {
      fields: [
        { name: 'dealId', type: 'number', required: true },
        {
          name: 'positions',
          type: 'array',
          required: true,
          items: { name: 'item', type: 'object', required: true }
        }
      ]
    }
  },
  {
    op: 'getDealCalls',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/deal/get-calls',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ dealId: s.number() }),
    argsSchema: { fields: [{ name: 'dealId', type: 'number', required: true }] }
  },
  {
    op: 'getDealCancelReasons',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/deal/get-cancel-reasons',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({}),
    argsSchema: EMPTY_SCHEMA
  },
  {
    op: 'getDealComments',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/deal/get-comments',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ dealId: s.number() }),
    argsSchema: { fields: [{ name: 'dealId', type: 'number', required: true }] }
  },
  {
    op: 'getDealCustomFields',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/deal/get-custom-fields',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ dealId: s.number() }),
    argsSchema: { fields: [{ name: 'dealId', type: 'number', required: true }] }
  },
  {
    op: 'getDealsTags',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/deal/get-deals-tags',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ limit: s.number().optional(), offset: s.number().optional() }),
    argsSchema: {
      fields: [
        { name: 'limit', type: 'number', required: false },
        { name: 'offset', type: 'number', required: false }
      ]
    }
  },
  {
    op: 'getDealFields',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/deal/get-fields',
    availability: 'enabled',
    legacyImportAction: null,
    argsValidator: s.object({ dealId: s.number() }),
    argsSchema: { fields: [{ name: 'dealId', type: 'number', required: true }] }
  },
  {
    op: 'removeDealPositions',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/deal/remove-positions',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ dealId: s.number(), positionIds: s.array(s.number()) }),
    argsSchema: {
      fields: [
        { name: 'dealId', type: 'number', required: true },
        {
          name: 'positionIds',
          type: 'array',
          required: true,
          items: { name: 'item', type: 'number', required: true }
        }
      ]
    }
  },
  {
    op: 'updateDealFields',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/deal/update-fields',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({
      dealId: s.number(),
      manager_user_id: s.number().optional(),
      status: s.string().optional(),
      cancel_reason_comment: s.number().optional(),
      tags: s.array(s.string()).optional()
    }),
    argsSchema: {
      fields: [
        { name: 'dealId', type: 'number', required: true },
        { name: 'manager_user_id', type: 'number', required: false },
        { name: 'status', type: 'string', required: false },
        { name: 'cancel_reason_comment', type: 'number', required: false },
        {
          name: 'tags',
          type: 'array',
          required: false,
          items: { name: 'item', type: 'string', required: true }
        }
      ]
    }
  },
  {
    op: 'addCommentToDialog',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/dialog/add-comment',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({
      dialogId: s.number(),
      commentText: s.string(),
      transport: s.array(s.number()),
      userId: s.number()
    }),
    argsSchema: {
      fields: [
        { name: 'dialogId', type: 'number', required: true },
        { name: 'commentText', type: 'string', required: true },
        {
          name: 'transport',
          type: 'array',
          required: true,
          items: { name: 'item', type: 'number', required: true }
        },
        { name: 'userId', type: 'number', required: true }
      ]
    }
  },
  {
    op: 'changeDepartment',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/dialog/change-department',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ dialogId: s.number(), newDepartmentId: s.number() }),
    argsSchema: {
      fields: [
        { name: 'dialogId', type: 'number', required: true },
        { name: 'newDepartmentId', type: 'number', required: true }
      ]
    }
  },
  {
    op: 'closeDialog',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/dialog/close',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ dialogId: s.number() }),
    argsSchema: { fields: [{ name: 'dialogId', type: 'number', required: true }] }
  },
  {
    op: 'getDialogHistory',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/dialog/get-history',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ dialogId: s.number(), limit: s.number().optional() }),
    argsSchema: {
      fields: [
        { name: 'dialogId', type: 'number', required: true },
        { name: 'limit', type: 'number', required: false }
      ]
    }
  },
  {
    op: 'addCommentToLessonAnswer',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/lesson/add-comment-to-lesson-answer',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ lessonAnswerId: s.number(), text: s.string(), userId: s.number() }),
    argsSchema: {
      fields: [
        { name: 'lessonAnswerId', type: 'number', required: true },
        { name: 'text', type: 'string', required: true },
        { name: 'userId', type: 'number', required: true }
      ]
    }
  },
  {
    op: 'changeStatusAnswers',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/lesson/change-status-answers',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ lessonAnswerId: s.number(), status: s.string() }),
    argsSchema: {
      fields: [
        { name: 'lessonAnswerId', type: 'number', required: true },
        { name: 'status', type: 'string', required: true }
      ]
    }
  },
  {
    op: 'getLessonAnswers',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/lesson/get-answers',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ lessonId: s.number() }),
    argsSchema: { fields: [{ name: 'lessonId', type: 'number', required: true }] }
  },
  {
    op: 'addNote',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/note/add',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ dialogId: s.number(), text: s.string() }),
    argsSchema: {
      fields: [
        { name: 'dialogId', type: 'number', required: true },
        { name: 'text', type: 'string', required: true }
      ]
    }
  },
  {
    op: 'getOfferById',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/offer/get-offer-by-id',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ offerId: s.number() }),
    argsSchema: { fields: [{ name: 'offerId', type: 'number', required: true }] }
  },
  {
    op: 'getOffers',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/offer/get-offers',
    availability: 'enabled',
    legacyImportAction: null,
    argsValidator: s.object({}),
    argsSchema: EMPTY_SCHEMA
  },
  {
    op: 'getOffersTags',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/offer/get-offers-tags',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ limit: s.number().optional(), offset: s.number().optional() }),
    argsSchema: {
      fields: [
        { name: 'limit', type: 'number', required: false },
        { name: 'offset', type: 'number', required: false }
      ]
    }
  },
  {
    op: 'addUserBalance',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/user/add-balance',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ value: s.number(), type: s.number(), comment: s.string() }),
    argsSchema: {
      fields: [
        { name: 'value', type: 'number', required: true },
        { name: 'type', type: 'number', required: true },
        { name: 'comment', type: 'string', required: true }
      ]
    }
  }
]
