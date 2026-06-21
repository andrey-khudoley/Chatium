/**
 * Сценарии /v1/{op} — фаза 3 (потребители, часть 2). Вынесено из v1OpsScenarios ради лимита размера
 * файла; собирается в общий реестр в v1OpsScenarios (порядок сохранён).
 */
import { V1_OPS_HEAP_KEYS, V1_OPS_ARTIFACT_PREFIX } from './v1OpsRunContext'
import { type V1OpScenario, pickPath, asNumberLike } from './v1OpsScenarioHelpers'

export const v1OpsScenariosPhase3b: V1OpScenario[] = [
  {
    op: 'setPersonalManager',
    phase: 3,
    dependsOn: ['addUser', 'getAllPersonalManagers'],
    hint: 'Назначить персонального менеджера тестовому пользователю.',
    build: ({ runCtx }) => {
      if (runCtx.managerId === undefined) {
        return { skip: 'Нет managerId — getAllPersonalManagers не отработал' }
      }
      if (runCtx.userId === undefined) return { skip: 'Нет userId — addUser не отработал' }
      return { args: { managerId: Number(runCtx.managerId), email: runCtx.testerEmail } }
    }
  },
  {
    op: 'createDiploma',
    phase: 3,
    dependsOn: ['addUser'],
    heapKeys: [V1_OPS_HEAP_KEYS.DIPLOMA_TEMPLATE_ID],
    hint: 'Создать диплом по шаблону Heap gc_itest_diploma_template_id.',
    build: ({ runCtx, heap }) => {
      if (heap.diplomaTemplateId === undefined) {
        return { skip: `Не задан Heap-ключ ${V1_OPS_HEAP_KEYS.DIPLOMA_TEMPLATE_ID}` }
      }
      if (runCtx.userId === undefined) return { skip: 'Нет userId — addUser не отработал' }
      return {
        args: {
          templateId: Number(heap.diplomaTemplateId),
          allowDuplicates: true,
          email: runCtx.testerEmail
        }
      }
    }
  },
  {
    op: 'getUserAnswers',
    phase: 3,
    dependsOn: ['addUser'],
    hint: 'Все ответы тестового пользователя (по email).',
    build: ({ runCtx }) => ({ args: { email: runCtx.testerEmail } })
  },
  {
    op: 'getUserBalance',
    phase: 3,
    dependsOn: ['addUser'],
    hint: 'Баланс тестового пользователя (по email).',
    build: ({ runCtx }) => ({ args: { email: runCtx.testerEmail } })
  },
  {
    op: 'getUserCustomFields',
    phase: 3,
    dependsOn: ['addUser'],
    hint: 'Кастомные поля тестового пользователя.',
    build: ({ runCtx }) => ({ args: { email: runCtx.testerEmail } })
  },
  {
    op: 'getUserDeals',
    phase: 3,
    dependsOn: ['addUser'],
    hint: 'Сделки тестового пользователя.',
    build: ({ runCtx }) => ({ args: { email: runCtx.testerEmail } })
  },
  {
    op: 'getUserDiplomas',
    phase: 3,
    dependsOn: ['addUser'],
    hint: 'Дипломы тестового пользователя.',
    build: ({ runCtx }) => ({ args: { email: runCtx.testerEmail } })
  },
  {
    op: 'getUserFields',
    phase: 3,
    dependsOn: ['addUser'],
    hint: 'Поля профиля тестового пользователя; уточняет userId, если он ещё не зафиксирован.',
    build: ({ runCtx }) => ({ args: { email: runCtx.testerEmail } }),
    capture: (parsed, runCtx) => {
      if (runCtx.userId !== undefined) return
      const id =
        asNumberLike(pickPath(parsed, 'data.result.user.id')) ??
        asNumberLike(pickPath(parsed, 'data.user.id')) ??
        asNumberLike(pickPath(parsed, 'data.id'))
      if (id !== undefined) runCtx.userId = id
    }
  },
  {
    op: 'getUserGoalRecords',
    phase: 3,
    dependsOn: ['addUser'],
    hint: 'Цели тестового пользователя.',
    build: ({ runCtx }) => ({ args: { email: runCtx.testerEmail } })
  },
  {
    op: 'getUserGroups',
    phase: 3,
    dependsOn: ['addUser'],
    hint: 'Группы, в которых состоит тестовый пользователь.',
    build: ({ runCtx }) => ({ args: { email: runCtx.testerEmail } })
  },
  {
    op: 'getUserLessonAnswers',
    phase: 3,
    dependsOn: ['addUser'],
    hint: 'Ответы пользователя на уроки.',
    build: ({ runCtx }) => ({ args: { email: runCtx.testerEmail } })
  },
  {
    op: 'getUserPurchases',
    phase: 3,
    dependsOn: ['addUser'],
    hint: 'Покупки тестового пользователя.',
    build: ({ runCtx }) => ({ args: { email: runCtx.testerEmail } })
  },
  {
    op: 'getUserSchedule',
    phase: 3,
    dependsOn: ['addUser'],
    hint: 'Расписание тестового пользователя.',
    build: ({ runCtx }) => ({ args: { email: runCtx.testerEmail } })
  },
  {
    op: 'getUserTrainings',
    phase: 3,
    dependsOn: ['addUser'],
    hint: 'Тренинги тестового пользователя.',
    build: ({ runCtx }) => ({ args: { email: runCtx.testerEmail } })
  },
  {
    op: 'updateUserCustomFields',
    phase: 3,
    dependsOn: ['addUser'],
    hint: 'Обновление кастомных полей пустым объектом (нейтрально).',
    build: ({ runCtx }) => ({ args: { customFields: {}, email: runCtx.testerEmail } })
  },
  {
    op: 'updateUserFields',
    phase: 3,
    dependsOn: ['addUser'],
    hint: 'Обновление поля comment у тестового пользователя (помечается префиксом).',
    build: ({ runCtx }) => ({
      args: { comment: `${V1_OPS_ARTIFACT_PREFIX} update probe`, email: runCtx.testerEmail }
    })
  },
  {
    op: 'addCommentToWebinar',
    phase: 3,
    dependsOn: ['getAllWebinars'],
    hint: 'Комментарий на вебинаре; moderatorId — Heap или getAllPersonalManagers.',
    build: ({ runCtx, heap }) => {
      if (runCtx.webinarId === undefined) {
        return { skip: 'Нет webinarId — getAllWebinars не отработал' }
      }
      const moderator = heap.moderatorId ?? runCtx.moderatorId
      if (moderator === undefined) {
        return {
          skip: `Нет moderatorId (${V1_OPS_HEAP_KEYS.MODERATOR_ID} или getAllPersonalManagers)`
        }
      }
      return {
        args: {
          moderatorId: Number(moderator),
          webinarId: Number(runCtx.webinarId),
          text: `${V1_OPS_ARTIFACT_PREFIX} webinar comment`
        }
      }
    }
  },
  {
    op: 'getWebinarsByIds',
    phase: 3,
    dependsOn: ['getAllWebinars'],
    hint: 'Подробные данные по списку вебинаров.',
    build: ({ runCtx }) => {
      if (!runCtx.webinarIds || runCtx.webinarIds.length === 0) {
        return { skip: 'Нет webinarIds — getAllWebinars не отработал' }
      }
      return { args: { ids: runCtx.webinarIds.map((x) => Number(x)) } }
    }
  },
  {
    op: 'moderateWebinarComment',
    phase: 3,
    dependsOn: ['getAllWebinars'],
    heapKeys: [V1_OPS_HEAP_KEYS.WEBINAR_COMMENT_ID],
    hint: 'Модерация комментария вебинара (commentId — Heap).',
    build: ({ runCtx, heap }) => {
      if (runCtx.webinarId === undefined) {
        return { skip: 'Нет webinarId — getAllWebinars не отработал' }
      }
      if (heap.webinarCommentId === undefined) {
        return { skip: `Не задан Heap-ключ ${V1_OPS_HEAP_KEYS.WEBINAR_COMMENT_ID}` }
      }
      return {
        args: {
          webinarId: Number(runCtx.webinarId),
          commentId: Number(heap.webinarCommentId),
          action: 'delete'
        }
      }
    }
  },
  {
    op: 'moderateWebinarUser',
    phase: 3,
    dependsOn: ['getAllWebinars', 'addUser'],
    hint: 'Модерация пользователя вебинара (userType=1 — обычный пользователь).',
    build: ({ runCtx }) => {
      if (runCtx.webinarId === undefined) {
        return { skip: 'Нет webinarId — getAllWebinars не отработал' }
      }
      if (runCtx.userId === undefined) return { skip: 'Нет userId — addUser не отработал' }
      return {
        args: {
          webinarId: Number(runCtx.webinarId),
          userId: Number(runCtx.userId),
          userType: 1,
          action: 'kick'
        }
      }
    }
  }
]
