/**
 * Реестр per-op handler-ов `/v1/{op}` — единый путь исполнения (manual §3.5).
 *
 * И файловые роуты `api/v1/{op}.ts`, и тест-раннер (`handleV1OpRouteWithGcDiagnostic`)
 * исполняют одни и те же per-op хендлеры — этот модуль связывает `op → handler`.
 *
 * ВАЖНО (против циклов импорта): этот файл импортирует `api/v1/{op}.ts`, которые, в свою
 * очередь, импортируют только `lib/gateway/handleV1Op.ts` (и клиентов GC). Сам `handleV1Op.ts`
 * этот реестр НЕ импортирует. `handleV1OpRoute.ts` (урезанный shim) импортирует ТОЛЬКО реестр.
 */

import { type V1GcHandler } from './handleV1Op'

import { setUriHandler } from '../../api/v1/setUri'
import { getAllGroupsHandler } from '../../api/v1/getAllGroups'
import { getAllPersonalManagersHandler } from '../../api/v1/getAllPersonalManagers'
import { getTrainingsHandler } from '../../api/v1/getTrainings'
import { addCommentToDealHandler } from '../../api/v1/addCommentToDeal'
import { addDealPositionsHandler } from '../../api/v1/addDealPositions'
import { getDealCallsHandler } from '../../api/v1/getDealCalls'
import { getDealCancelReasonsHandler } from '../../api/v1/getDealCancelReasons'
import { getDealCommentsHandler } from '../../api/v1/getDealComments'
import { getDealCustomFieldsHandler } from '../../api/v1/getDealCustomFields'
import { getDealsTagsHandler } from '../../api/v1/getDealsTags'
import { getDealFieldsHandler } from '../../api/v1/getDealFields'
import { removeDealPositionsHandler } from '../../api/v1/removeDealPositions'
import { updateDealFieldsHandler } from '../../api/v1/updateDealFields'
import { addCommentToDialogHandler } from '../../api/v1/addCommentToDialog'
import { changeDepartmentHandler } from '../../api/v1/changeDepartment'
import { closeDialogHandler } from '../../api/v1/closeDialog'
import { getDialogHistoryHandler } from '../../api/v1/getDialogHistory'
import { addCommentToLessonAnswerHandler } from '../../api/v1/addCommentToLessonAnswer'
import { changeStatusAnswersHandler } from '../../api/v1/changeStatusAnswers'
import { getLessonAnswersHandler } from '../../api/v1/getLessonAnswers'
import { addNoteHandler } from '../../api/v1/addNote'
import { getOfferByIdHandler } from '../../api/v1/getOfferById'
import { getOffersHandler } from '../../api/v1/getOffers'
import { getOffersTagsHandler } from '../../api/v1/getOffersTags'
import { addUserBalanceHandler } from '../../api/v1/addUserBalance'
import { addUserGroupsHandler } from '../../api/v1/addUserGroups'
import { createDiplomaHandler } from '../../api/v1/createDiploma'
import { getUserAnswersHandler } from '../../api/v1/getUserAnswers'
import { getUserBalanceHandler } from '../../api/v1/getUserBalance'
import { getUserCustomFieldsHandler } from '../../api/v1/getUserCustomFields'
import { getUserDealsHandler } from '../../api/v1/getUserDeals'
import { getUserDiplomasHandler } from '../../api/v1/getUserDiplomas'
import { getUserFieldsHandler } from '../../api/v1/getUserFields'
import { getUserGoalRecordsHandler } from '../../api/v1/getUserGoalRecords'
import { getUserGroupsHandler } from '../../api/v1/getUserGroups'
import { getUserLessonAnswersHandler } from '../../api/v1/getUserLessonAnswers'
import { getUserPurchasesHandler } from '../../api/v1/getUserPurchases'
import { getUserScheduleHandler } from '../../api/v1/getUserSchedule'
import { getUserTrainingsHandler } from '../../api/v1/getUserTrainings'
import { getUserByTelegramChatIdHandler } from '../../api/v1/getUserByTelegramChatId'
import { removeUserGroupsHandler } from '../../api/v1/removeUserGroups'
import { setUserGroupsHandler } from '../../api/v1/setUserGroups'
import { setPersonalManagerHandler } from '../../api/v1/setPersonalManager'
import { updateUserCustomFieldsHandler } from '../../api/v1/updateUserCustomFields'
import { updateUserFieldsHandler } from '../../api/v1/updateUserFields'
import { addCommentToWebinarHandler } from '../../api/v1/addCommentToWebinar'
import { getAllWebinarsHandler } from '../../api/v1/getAllWebinars'
import { getWebinarsByIdsHandler } from '../../api/v1/getWebinarsByIds'
import { moderateWebinarCommentHandler } from '../../api/v1/moderateWebinarComment'
import { moderateWebinarUserHandler } from '../../api/v1/moderateWebinarUser'
import { addUserHandler } from '../../api/v1/addUser'
import { createDealHandler } from '../../api/v1/createDeal'
import { exportUsersHandler } from '../../api/v1/exportUsers'
import { exportGroupUsersHandler } from '../../api/v1/exportGroupUsers'
import { exportDealsHandler } from '../../api/v1/exportDeals'
import { exportPaymentsHandler } from '../../api/v1/exportPayments'
import { getCustomFieldsHandler } from '../../api/v1/getCustomFields'
import { getExportResultHandler } from '../../api/v1/getExportResult'

export const V1_OP_HANDLERS: Record<string, V1GcHandler> = {
  setUri: setUriHandler,
  getAllGroups: getAllGroupsHandler,
  getAllPersonalManagers: getAllPersonalManagersHandler,
  getTrainings: getTrainingsHandler,
  addCommentToDeal: addCommentToDealHandler,
  addDealPositions: addDealPositionsHandler,
  getDealCalls: getDealCallsHandler,
  getDealCancelReasons: getDealCancelReasonsHandler,
  getDealComments: getDealCommentsHandler,
  getDealCustomFields: getDealCustomFieldsHandler,
  getDealsTags: getDealsTagsHandler,
  getDealFields: getDealFieldsHandler,
  removeDealPositions: removeDealPositionsHandler,
  updateDealFields: updateDealFieldsHandler,
  addCommentToDialog: addCommentToDialogHandler,
  changeDepartment: changeDepartmentHandler,
  closeDialog: closeDialogHandler,
  getDialogHistory: getDialogHistoryHandler,
  addCommentToLessonAnswer: addCommentToLessonAnswerHandler,
  changeStatusAnswers: changeStatusAnswersHandler,
  getLessonAnswers: getLessonAnswersHandler,
  addNote: addNoteHandler,
  getOfferById: getOfferByIdHandler,
  getOffers: getOffersHandler,
  getOffersTags: getOffersTagsHandler,
  addUserBalance: addUserBalanceHandler,
  addUserGroups: addUserGroupsHandler,
  createDiploma: createDiplomaHandler,
  getUserAnswers: getUserAnswersHandler,
  getUserBalance: getUserBalanceHandler,
  getUserCustomFields: getUserCustomFieldsHandler,
  getUserDeals: getUserDealsHandler,
  getUserDiplomas: getUserDiplomasHandler,
  getUserFields: getUserFieldsHandler,
  getUserGoalRecords: getUserGoalRecordsHandler,
  getUserGroups: getUserGroupsHandler,
  getUserLessonAnswers: getUserLessonAnswersHandler,
  getUserPurchases: getUserPurchasesHandler,
  getUserSchedule: getUserScheduleHandler,
  getUserTrainings: getUserTrainingsHandler,
  getUserByTelegramChatId: getUserByTelegramChatIdHandler,
  removeUserGroups: removeUserGroupsHandler,
  setUserGroups: setUserGroupsHandler,
  setPersonalManager: setPersonalManagerHandler,
  updateUserCustomFields: updateUserCustomFieldsHandler,
  updateUserFields: updateUserFieldsHandler,
  addCommentToWebinar: addCommentToWebinarHandler,
  getAllWebinars: getAllWebinarsHandler,
  getWebinarsByIds: getWebinarsByIdsHandler,
  moderateWebinarComment: moderateWebinarCommentHandler,
  moderateWebinarUser: moderateWebinarUserHandler,
  addUser: addUserHandler,
  createDeal: createDealHandler,
  exportUsers: exportUsersHandler,
  exportGroupUsers: exportGroupUsersHandler,
  exportDeals: exportDealsHandler,
  exportPayments: exportPaymentsHandler,
  getCustomFields: getCustomFieldsHandler,
  getExportResult: getExportResultHandler
}

export function findV1OpHandler(op: string): V1GcHandler | undefined {
  return V1_OP_HANDLERS[op]
}
