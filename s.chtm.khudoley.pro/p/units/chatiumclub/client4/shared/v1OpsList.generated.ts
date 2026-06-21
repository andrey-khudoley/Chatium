// @shared
/**
 * Локальный снимок каталога публичных операций gateway (`p/saas/gw/gc`).
 *
 * SSOT — `p/saas/gw/gc/shared/v1OpsList.generated.ts` (генерируется из
 * `config/gc-op-http-mapping.json` скриптом `scripts/gen-gc-op-http-mapping.cjs`
 * в репозитории gateway). Этот файл — **зеркальная копия** на стороне тонкого
 * клиента: нужен только чтобы SDK мог локально определить `httpMethod`
 * (`GET` или `POST`) для конкретного `op` без обращения к gateway за каталогом
 * перед каждым вызовом.
 *
 * Если запись `op` в этом снимке отсутствует — `gatewayClient.invoke()` примет
 * метод из аргументов вызова или (при отсутствии и параметра) выполнит запрос
 * к `/v1/operations` для подгрузки актуального каталога. После любого
 * расширения списка операций gateway достаточно обновить этот файл, чтобы
 * SDK снова выбирал метод без сетевого хопа.
 */
export type V1OpListEntry = {
  op: string
  contour: 'new' | 'legacy'
  httpMethod: 'GET' | 'POST'
  availability: 'enabled' | 'beta' | 'disabled' | 'unsupported'
}

export const V1_OPS_LIST: readonly V1OpListEntry[] = [
  { op: 'setUri', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'getAllGroups', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getAllPersonalManagers', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getTrainings', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'addCommentToDeal', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'addDealPositions', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'getDealCalls', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getDealCancelReasons', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getDealComments', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getDealCustomFields', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getDealsTags', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getDealFields', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'removeDealPositions', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'updateDealFields', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'addCommentToDialog', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'changeDepartment', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'closeDialog', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'getDialogHistory', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'addCommentToLessonAnswer', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'changeStatusAnswers', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'getLessonAnswers', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'addNote', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'getOfferById', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getOffers', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getOffersTags', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'addUserBalance', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'addUserGroups', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'createDiploma', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'getUserAnswers', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getUserBalance', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getUserCustomFields', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getUserDeals', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getUserDiplomas', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getUserFields', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getUserGoalRecords', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getUserGroups', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getUserLessonAnswers', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getUserPurchases', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getUserSchedule', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getUserTrainings', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getUserByTelegramChatId', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'removeUserGroups', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'setUserGroups', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'setPersonalManager', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'updateUserCustomFields', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'updateUserFields', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'addCommentToWebinar', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'getAllWebinars', contour: 'new', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getWebinarsByIds', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'moderateWebinarComment', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'moderateWebinarUser', contour: 'new', httpMethod: 'POST', availability: 'enabled' },
  { op: 'addUser', contour: 'legacy', httpMethod: 'POST', availability: 'enabled' },
  { op: 'createDeal', contour: 'legacy', httpMethod: 'POST', availability: 'enabled' },
  { op: 'exportUsers', contour: 'legacy', httpMethod: 'GET', availability: 'enabled' },
  { op: 'exportGroupUsers', contour: 'legacy', httpMethod: 'GET', availability: 'enabled' },
  { op: 'exportDeals', contour: 'legacy', httpMethod: 'GET', availability: 'enabled' },
  { op: 'exportPayments', contour: 'legacy', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getCustomFields', contour: 'legacy', httpMethod: 'GET', availability: 'enabled' },
  { op: 'getExportResult', contour: 'legacy', httpMethod: 'GET', availability: 'enabled' }
] as const

const V1_OPS_BY_NAME: Record<string, V1OpListEntry> = (() => {
  const map: Record<string, V1OpListEntry> = {}
  for (const entry of V1_OPS_LIST) {
    map[entry.op] = entry
  }
  return map
})()

/** Возвращает запись локального снимка каталога по имени `op` или `undefined`, если такой строки нет. */
export function findV1OpsListEntry(op: string): V1OpListEntry | undefined {
  return V1_OPS_BY_NAME[op]
}
