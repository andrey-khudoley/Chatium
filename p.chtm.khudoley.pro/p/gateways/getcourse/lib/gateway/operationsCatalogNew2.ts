/**
 * Записи каталога операций gateway — контур new (часть 2). Вынесено из operationsCatalog
 * ради лимита размера файла; собирается в общий каталог в operationsCatalog (порядок сохранён).
 */
// @ts-ignore  системный модуль Chatium, локальных типов нет
import { s } from '@app/schema'
import { type OperationEntry, EMPTY_SCHEMA } from './operationsCatalogTypes'

export const operationsCatalogNew2: OperationEntry[] = [
  {
    op: 'addUserGroups',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/user/add-groups',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ groups: s.array(s.number()) }),
    argsSchema: {
      fields: [
        {
          name: 'groups',
          type: 'array',
          required: true,
          items: { name: 'item', type: 'number', required: true }
        }
      ]
    }
  },
  {
    op: 'createDiploma',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/user/create-diploma',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({
      templateId: s.number(),
      number: s.string().optional(),
      trainingName: s.string().optional(),
      userName: s.string().optional(),
      allowDuplicates: s.boolean().optional()
    }),
    argsSchema: {
      fields: [
        { name: 'templateId', type: 'number', required: true },
        { name: 'number', type: 'string', required: false },
        { name: 'trainingName', type: 'string', required: false },
        { name: 'userName', type: 'string', required: false },
        { name: 'allowDuplicates', type: 'boolean', required: false }
      ]
    }
  },
  {
    op: 'getUserAnswers',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/user/get-answers',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({}),
    argsSchema: EMPTY_SCHEMA
  },
  {
    op: 'getUserBalance',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/user/get-balance',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({}),
    argsSchema: EMPTY_SCHEMA
  },
  {
    op: 'getUserCustomFields',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/user/get-custom-fields',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({}),
    argsSchema: EMPTY_SCHEMA
  },
  {
    op: 'getUserDeals',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/user/get-deals',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({}),
    argsSchema: EMPTY_SCHEMA
  },
  {
    op: 'getUserDiplomas',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/user/get-diplomas',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({}),
    argsSchema: EMPTY_SCHEMA
  },
  {
    op: 'getUserFields',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/user/get-fields',
    availability: 'enabled',
    legacyImportAction: null,
    argsValidator: s.object({ userId: s.number().optional(), email: s.string().optional() }),
    argsSchema: {
      fields: [
        { name: 'userId', type: 'number', required: false },
        { name: 'email', type: 'string', required: false }
      ]
    }
  },
  {
    op: 'getUserGoalRecords',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/user/get-goal-records',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({}),
    argsSchema: EMPTY_SCHEMA
  },
  {
    op: 'getUserGroups',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/user/get-groups',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({}),
    argsSchema: EMPTY_SCHEMA
  },
  {
    op: 'getUserLessonAnswers',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/user/get-lesson-answers',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({}),
    argsSchema: EMPTY_SCHEMA
  },
  {
    op: 'getUserPurchases',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/user/get-purchases',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ productId: s.string().optional() }),
    argsSchema: { fields: [{ name: 'productId', type: 'string', required: false }] }
  },
  {
    op: 'getUserSchedule',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/user/get-schedule',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({}),
    argsSchema: EMPTY_SCHEMA
  },
  {
    op: 'getUserTrainings',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/user/get-trainings',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({}),
    argsSchema: EMPTY_SCHEMA
  },
  {
    op: 'getUserByTelegramChatId',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/user/get-user-by-telegram-chat-id',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ chatId: s.number() }),
    argsSchema: { fields: [{ name: 'chatId', type: 'number', required: true }] }
  },
  {
    op: 'removeUserGroups',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/user/remove-groups',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ groups: s.array(s.number()) }),
    argsSchema: {
      fields: [
        {
          name: 'groups',
          type: 'array',
          required: true,
          items: { name: 'item', type: 'number', required: true }
        }
      ]
    }
  },
  {
    op: 'setUserGroups',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/user/set-groups',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ groups: s.array(s.number()) }),
    argsSchema: {
      fields: [
        {
          name: 'groups',
          type: 'array',
          required: true,
          items: { name: 'item', type: 'number', required: true }
        }
      ]
    }
  },
  {
    op: 'setPersonalManager',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/user/set-personal-manager',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ managerId: s.number() }),
    argsSchema: { fields: [{ name: 'managerId', type: 'number', required: true }] }
  },
  {
    op: 'updateUserCustomFields',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/user/update-custom-fields',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ customFields: s.any() }),
    argsSchema: {
      fields: [
        {
          name: 'customFields',
          type: 'object',
          required: true,
          description: 'произвольная структура'
        }
      ]
    }
  },
  {
    op: 'updateUserFields',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/user/update-fields',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({
      gender: s.string().optional(),
      country: s.string().optional(),
      city: s.string().optional(),
      first_name: s.string().optional(),
      last_name: s.string().optional(),
      birthday: s.string().optional(),
      comment: s.string().optional(),
      phone: s.string().optional()
    }),
    argsSchema: {
      fields: [
        { name: 'gender', type: 'string', required: false },
        { name: 'country', type: 'string', required: false },
        { name: 'city', type: 'string', required: false },
        { name: 'first_name', type: 'string', required: false },
        { name: 'last_name', type: 'string', required: false },
        { name: 'birthday', type: 'string', required: false },
        { name: 'comment', type: 'string', required: false },
        { name: 'phone', type: 'string', required: false }
      ]
    }
  },
  {
    op: 'addCommentToWebinar',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/webinar/add-comment',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({
      moderatorId: s.number(),
      webinarId: s.number(),
      webinarLaunchNumber: s.number().optional(),
      text: s.string(),
      isPrivateReply: s.boolean().optional(),
      replyToUserId: s.number().optional(),
      replyToUserType: s.number().optional()
    }),
    argsSchema: {
      fields: [
        { name: 'moderatorId', type: 'number', required: true },
        { name: 'webinarId', type: 'number', required: true },
        { name: 'webinarLaunchNumber', type: 'number', required: false },
        { name: 'text', type: 'string', required: true },
        { name: 'isPrivateReply', type: 'boolean', required: false },
        { name: 'replyToUserId', type: 'number', required: false },
        { name: 'replyToUserType', type: 'number', required: false }
      ]
    }
  },
  {
    op: 'getAllWebinars',
    contour: 'new',
    httpMethod: 'GET',
    pathTemplate: '/webinar/get-all-webinars',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({}),
    argsSchema: EMPTY_SCHEMA
  },
  {
    op: 'getWebinarsByIds',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/webinar/get-webinars-by-ids',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({ ids: s.array(s.number()) }),
    argsSchema: {
      fields: [
        {
          name: 'ids',
          type: 'array',
          required: true,
          items: { name: 'item', type: 'number', required: true }
        }
      ]
    }
  },
  {
    op: 'moderateWebinarComment',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/webinar/moderation-comment',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({
      webinarId: s.number(),
      moderatorId: s.number().optional(),
      commentId: s.number(),
      action: s.string()
    }),
    argsSchema: {
      fields: [
        { name: 'webinarId', type: 'number', required: true },
        { name: 'moderatorId', type: 'number', required: false },
        { name: 'commentId', type: 'number', required: true },
        { name: 'action', type: 'string', required: true }
      ]
    }
  },
  {
    op: 'moderateWebinarUser',
    contour: 'new',
    httpMethod: 'POST',
    pathTemplate: '/webinar/moderation-user',
    availability: 'disabled',
    legacyImportAction: null,
    argsValidator: s.object({
      webinarId: s.number(),
      webinarLaunchNumber: s.number().optional(),
      moderatorId: s.number().optional(),
      userId: s.number(),
      userType: s.number(),
      action: s.string()
    }),
    argsSchema: {
      fields: [
        { name: 'webinarId', type: 'number', required: true },
        { name: 'webinarLaunchNumber', type: 'number', required: false },
        { name: 'moderatorId', type: 'number', required: false },
        { name: 'userId', type: 'number', required: true },
        { name: 'userType', type: 'number', required: true },
        { name: 'action', type: 'string', required: true }
      ]
    }
  }
]
