/**
 * Сценарии /v1/{op} — фаза 3 (потребители, часть 1). Вынесено из v1OpsScenarios ради лимита размера
 * файла; собирается в общий реестр в v1OpsScenarios (порядок сохранён).
 */
import { V1_OPS_HEAP_KEYS, V1_OPS_ARTIFACT_PREFIX } from './v1OpsRunContext'
import { type V1OpScenario } from './v1OpsScenarioHelpers'

export const v1OpsScenariosPhase3a: V1OpScenario[] = [
  {
    op: 'getExportResult',
    phase: 3,
    dependsOn: ['exportUsers'],
    hint: 'Получение готового файла экспорта по exportId.',
    build: ({ runCtx }) => {
      if (runCtx.exportId === undefined) {
        return { skip: 'Нет exportId — exportUsers/exportDeals/exportPayments не отработали' }
      }
      return { args: { exportId: Number(runCtx.exportId) } }
    }
  },
  {
    op: 'exportGroupUsers',
    phase: 3,
    dependsOn: ['getAllGroups'],
    hint: 'Экспорт пользователей группы; groupId из getAllGroups.',
    build: ({ runCtx }) => {
      if (runCtx.groupId === undefined) {
        return { skip: 'Нет groupId — getAllGroups не отработал' }
      }
      return { args: { groupId: Number(runCtx.groupId) } }
    }
  },
  {
    op: 'getDealCalls',
    phase: 3,
    dependsOn: ['createDeal'],
    hint: 'История звонков по сделке; dealId из createDeal.',
    build: ({ runCtx }) => {
      if (runCtx.dealId === undefined) return { skip: 'Нет dealId — createDeal не отработал' }
      return { args: { dealId: Number(runCtx.dealId) } }
    }
  },
  {
    op: 'getDealComments',
    phase: 3,
    dependsOn: ['createDeal'],
    hint: 'Комментарии сделки; dealId из createDeal.',
    build: ({ runCtx }) => {
      if (runCtx.dealId === undefined) return { skip: 'Нет dealId — createDeal не отработал' }
      return { args: { dealId: Number(runCtx.dealId) } }
    }
  },
  {
    op: 'getDealCustomFields',
    phase: 3,
    dependsOn: ['createDeal'],
    hint: 'Кастомные поля сделки; dealId из createDeal.',
    build: ({ runCtx }) => {
      if (runCtx.dealId === undefined) return { skip: 'Нет dealId — createDeal не отработал' }
      return { args: { dealId: Number(runCtx.dealId) } }
    }
  },
  {
    op: 'getDealFields',
    phase: 3,
    dependsOn: ['createDeal'],
    hint: 'Поля сделки; dealId из createDeal.',
    build: ({ runCtx }) => {
      if (runCtx.dealId === undefined) return { skip: 'Нет dealId — createDeal не отработал' }
      return { args: { dealId: Number(runCtx.dealId) } }
    }
  },
  {
    op: 'addCommentToDeal',
    phase: 3,
    dependsOn: ['createDeal', 'addUser'],
    hint: 'Комментарий к сделке (артефакт помечается префиксом).',
    build: ({ runCtx }) => {
      if (runCtx.dealId === undefined) return { skip: 'Нет dealId — createDeal не отработал' }
      if (runCtx.userId === undefined) return { skip: 'Нет userId — addUser не отработал' }
      return {
        args: {
          dealId: Number(runCtx.dealId),
          userId: Number(runCtx.userId),
          text: `${V1_OPS_ARTIFACT_PREFIX} test comment from gateway integration suite`
        }
      }
    }
  },
  {
    op: 'addDealPositions',
    phase: 3,
    dependsOn: ['createDeal'],
    heapKeys: [V1_OPS_HEAP_KEYS.OFFER_ID],
    hint: 'Добавление позиции в сделку: использует offerId из Heap.',
    build: ({ runCtx, heap }) => {
      if (runCtx.dealId === undefined) return { skip: 'Нет dealId — createDeal не отработал' }
      const offerNum = Number(heap.offerId)
      if (!Number.isFinite(offerNum)) {
        return { skip: `${V1_OPS_HEAP_KEYS.OFFER_ID} не приводится к числу` }
      }
      return {
        args: {
          dealId: Number(runCtx.dealId),
          positions: [{ offerId: offerNum, price: 0, quantity: 1 }]
        }
      }
    }
  },
  {
    op: 'removeDealPositions',
    phase: 3,
    dependsOn: ['createDeal'],
    hint: 'Удаление позиций сделки. Без реальных positionIds — отправляется пустой массив (ожидаем 4xx).',
    build: ({ runCtx }) => {
      if (runCtx.dealId === undefined) return { skip: 'Нет dealId — createDeal не отработал' }
      return { args: { dealId: Number(runCtx.dealId), positionIds: [] } }
    }
  },
  {
    op: 'addCommentToDialog',
    phase: 3,
    dependsOn: ['addUser'],
    heapKeys: [V1_OPS_HEAP_KEYS.DIALOG_ID],
    hint: 'Комментарий в диалоге; dialogId — Heap, userId — addUser.',
    build: ({ runCtx, heap }) => {
      if (heap.dialogId === undefined)
        return { skip: `Не задан Heap-ключ ${V1_OPS_HEAP_KEYS.DIALOG_ID}` }
      if (runCtx.userId === undefined) return { skip: 'Нет userId — addUser не отработал' }
      return {
        args: {
          dialogId: Number(heap.dialogId),
          commentText: `${V1_OPS_ARTIFACT_PREFIX} dialog comment`,
          transport: [],
          userId: Number(runCtx.userId)
        }
      }
    }
  },
  {
    op: 'changeDepartment',
    phase: 3,
    heapKeys: [V1_OPS_HEAP_KEYS.DIALOG_ID, V1_OPS_HEAP_KEYS.DEPARTMENT_ID],
    hint: 'Смена отдела диалога; dialogId и newDepartmentId из Heap.',
    build: ({ heap }) => {
      if (heap.dialogId === undefined)
        return { skip: `Не задан Heap-ключ ${V1_OPS_HEAP_KEYS.DIALOG_ID}` }
      if (heap.departmentId === undefined)
        return { skip: `Не задан Heap-ключ ${V1_OPS_HEAP_KEYS.DEPARTMENT_ID}` }
      return {
        args: { dialogId: Number(heap.dialogId), newDepartmentId: Number(heap.departmentId) }
      }
    }
  },
  {
    op: 'closeDialog',
    phase: 3,
    heapKeys: [V1_OPS_HEAP_KEYS.DIALOG_ID],
    hint: 'Закрытие диалога; dialogId из Heap.',
    build: ({ heap }) => {
      if (heap.dialogId === undefined)
        return { skip: `Не задан Heap-ключ ${V1_OPS_HEAP_KEYS.DIALOG_ID}` }
      return { args: { dialogId: Number(heap.dialogId) } }
    }
  },
  {
    op: 'addNote',
    phase: 3,
    heapKeys: [V1_OPS_HEAP_KEYS.DIALOG_ID],
    hint: 'Заметка в диалоге; артефакт помечается префиксом.',
    build: ({ heap }) => {
      if (heap.dialogId === undefined)
        return { skip: `Не задан Heap-ключ ${V1_OPS_HEAP_KEYS.DIALOG_ID}` }
      return { args: { dialogId: Number(heap.dialogId), text: `${V1_OPS_ARTIFACT_PREFIX} note` } }
    }
  },
  {
    op: 'addCommentToLessonAnswer',
    phase: 3,
    dependsOn: ['addUser', 'getLessonAnswers'],
    hint: 'Комментарий к ответу на урок; lessonAnswerId — из getLessonAnswers.',
    build: ({ runCtx }) => {
      if (runCtx.lessonAnswerId === undefined) {
        return { skip: 'Нет lessonAnswerId — getLessonAnswers не отработал' }
      }
      if (runCtx.userId === undefined) return { skip: 'Нет userId — addUser не отработал' }
      return {
        args: {
          lessonAnswerId: Number(runCtx.lessonAnswerId),
          text: `${V1_OPS_ARTIFACT_PREFIX} lesson comment`,
          userId: Number(runCtx.userId)
        }
      }
    }
  },
  {
    op: 'changeStatusAnswers',
    phase: 3,
    dependsOn: ['getLessonAnswers'],
    hint: 'Смена статуса ответа; lessonAnswerId — из getLessonAnswers.',
    build: ({ runCtx }) => {
      if (runCtx.lessonAnswerId === undefined) {
        return { skip: 'Нет lessonAnswerId — getLessonAnswers не отработал' }
      }
      return { args: { lessonAnswerId: Number(runCtx.lessonAnswerId), status: 'in_progress' } }
    }
  },
  {
    op: 'addUserBalance',
    phase: 3,
    dependsOn: ['addUser'],
    hint: 'Изменение баланса пользователя на тестовую сумму 0 (нейтрально).',
    build: ({ runCtx }) => {
      if (runCtx.userId === undefined) return { skip: 'Нет userId — addUser не отработал' }
      return {
        args: {
          value: 0,
          type: 1,
          comment: `${V1_OPS_ARTIFACT_PREFIX} balance probe`,
          email: runCtx.testerEmail
        }
      }
    }
  },
  {
    op: 'addUserGroups',
    phase: 3,
    dependsOn: ['addUser', 'getAllGroups'],
    hint: 'Добавить пользователя в первую группу из getAllGroups.',
    build: ({ runCtx }) => {
      if (runCtx.groupId === undefined) return { skip: 'Нет groupId — getAllGroups не отработал' }
      if (runCtx.userId === undefined) return { skip: 'Нет userId — addUser не отработал' }
      return { args: { groups: [Number(runCtx.groupId)], email: runCtx.testerEmail } }
    }
  },
  {
    op: 'removeUserGroups',
    phase: 3,
    dependsOn: ['addUserGroups'],
    hint: 'Зеркало addUserGroups: удаление пользователя из той же группы.',
    build: ({ runCtx }) => {
      if (runCtx.groupId === undefined) return { skip: 'Нет groupId — getAllGroups не отработал' }
      if (runCtx.userId === undefined) return { skip: 'Нет userId — addUser не отработал' }
      return { args: { groups: [Number(runCtx.groupId)], email: runCtx.testerEmail } }
    }
  },
  {
    op: 'setUserGroups',
    phase: 3,
    dependsOn: ['addUser', 'getAllGroups'],
    hint: 'Заменить набор групп пользователя на одну группу из getAllGroups.',
    build: ({ runCtx }) => {
      if (runCtx.groupId === undefined) return { skip: 'Нет groupId — getAllGroups не отработал' }
      if (runCtx.userId === undefined) return { skip: 'Нет userId — addUser не отработал' }
      return { args: { groups: [Number(runCtx.groupId)], email: runCtx.testerEmail } }
    }
  }
]
