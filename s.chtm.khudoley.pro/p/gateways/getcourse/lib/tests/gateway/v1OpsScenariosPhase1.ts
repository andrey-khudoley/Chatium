/**
 * Сценарии /v1/{op} — фаза 1 (каталоги/Heap). Вынесено из v1OpsScenarios ради лимита размера
 * файла; собирается в общий реестр в v1OpsScenarios (порядок сохранён).
 */
import { V1_OPS_HEAP_KEYS } from './v1OpsRunContext'
import { type V1OpScenario, pickPath, asNumberLike, firstItem } from './v1OpsScenarioHelpers'

export const v1OpsScenariosPhase1: V1OpScenario[] = [
  {
    op: 'getCustomFields',
    phase: 1,
    hint: 'Legacy export: список кастомных полей школы. Без аргументов.',
    build: () => ({ args: {} })
  },
  {
    op: 'getAllGroups',
    phase: 1,
    hint: 'Каталог групп аккаунта; запоминает первый groupId для exportGroupUsers/setUserGroups.',
    build: () => ({ args: {} }),
    capture: (parsed, runCtx) => {
      const groups =
        (pickPath(parsed, 'data.result') as unknown) ??
        (pickPath(parsed, 'data.groups') as unknown) ??
        (pickPath(parsed, 'result') as unknown) ??
        (pickPath(parsed, 'groups') as unknown)
      const first = firstItem(groups)
      if (first) {
        const id = asNumberLike(first.id ?? first.groupId ?? first.group_id)
        if (id !== undefined) runCtx.groupId = id
      }
    }
  },
  {
    op: 'getAllPersonalManagers',
    phase: 1,
    hint: 'Каталог персональных менеджеров; запоминает первый managerId.',
    build: () => ({ args: {} }),
    capture: (parsed, runCtx) => {
      const list =
        (pickPath(parsed, 'data.result') as unknown) ??
        (pickPath(parsed, 'data.managers') as unknown) ??
        (pickPath(parsed, 'result') as unknown)
      const first = firstItem(list)
      if (first) {
        const id = asNumberLike(first.id ?? first.userId ?? first.user_id ?? first.managerId)
        if (id !== undefined) {
          runCtx.managerId = id
          if (runCtx.moderatorId === undefined) runCtx.moderatorId = id
        }
      }
    }
  },
  {
    op: 'getTrainings',
    phase: 1,
    hint: 'Каталог тренингов школы.',
    build: () => ({ args: {} })
  },
  {
    op: 'getOffers',
    phase: 1,
    hint: 'Каталог предложений школы.',
    build: () => ({ args: {} })
  },
  {
    op: 'getOffersTags',
    phase: 1,
    hint: 'Каталог тегов предложений (с пагинацией).',
    build: () => ({ args: { limit: 10, offset: 0 } })
  },
  {
    op: 'getDealCancelReasons',
    phase: 1,
    hint: 'Справочник причин отмены сделок.',
    build: () => ({ args: {} })
  },
  {
    op: 'getDealsTags',
    phase: 1,
    hint: 'Справочник тегов сделок (с пагинацией).',
    build: () => ({ args: { limit: 10, offset: 0 } })
  },
  {
    op: 'getAllWebinars',
    phase: 1,
    hint: 'Каталог вебинаров; запоминает webinarId и список webinarIds для getWebinarsByIds.',
    build: () => ({ args: {} }),
    capture: (parsed, runCtx) => {
      const list =
        (pickPath(parsed, 'data.result') as unknown) ??
        (pickPath(parsed, 'data.webinars') as unknown) ??
        (pickPath(parsed, 'result') as unknown)
      if (Array.isArray(list)) {
        const ids = list
          .map((w) => {
            if (w && typeof w === 'object') {
              const o = w as Record<string, unknown>
              return asNumberLike(o.id ?? o.webinarId)
            }
            return undefined
          })
          .filter((x): x is number | string => x !== undefined)
        if (ids.length > 0) {
          runCtx.webinarId = ids[0]
          runCtx.webinarIds = ids.slice(0, 5)
        }
      }
    }
  },
  {
    op: 'getOfferById',
    phase: 1,
    heapKeys: [V1_OPS_HEAP_KEYS.OFFER_ID],
    hint: 'Чтение конкретного предложения. offerId берётся из Heap gc_itest_offer_id.',
    build: ({ heap }) => {
      const offerId = heap.offerId
      if (offerId === undefined) {
        return { skip: `Не задан Heap-ключ ${V1_OPS_HEAP_KEYS.OFFER_ID}` }
      }
      return { args: { offerId } }
    }
  },
  {
    op: 'getDialogHistory',
    phase: 1,
    heapKeys: [V1_OPS_HEAP_KEYS.DIALOG_ID],
    hint: 'История диалога: dialogId — из Heap gc_itest_dialog_id.',
    build: ({ heap }) => {
      if (heap.dialogId === undefined) {
        return { skip: `Не задан Heap-ключ ${V1_OPS_HEAP_KEYS.DIALOG_ID}` }
      }
      return { args: { dialogId: heap.dialogId, limit: 10 } }
    }
  },
  {
    op: 'getUserByTelegramChatId',
    phase: 1,
    heapKeys: [V1_OPS_HEAP_KEYS.TELEGRAM_CHAT_ID],
    hint: 'Поиск пользователя по chatId Telegram (Heap gc_itest_telegram_chat_id).',
    build: ({ heap }) => {
      if (heap.telegramChatId === undefined) {
        return { skip: `Не задан Heap-ключ ${V1_OPS_HEAP_KEYS.TELEGRAM_CHAT_ID}` }
      }
      return { args: { chatId: heap.telegramChatId } }
    }
  },
  {
    op: 'getLessonAnswers',
    phase: 1,
    heapKeys: [V1_OPS_HEAP_KEYS.LESSON_ID],
    hint: 'Ответы на урок: lessonId из Heap gc_itest_lesson_id; запоминает lessonAnswerId.',
    build: ({ heap }) => {
      if (heap.lessonId === undefined) {
        return { skip: `Не задан Heap-ключ ${V1_OPS_HEAP_KEYS.LESSON_ID}` }
      }
      return { args: { lessonId: heap.lessonId } }
    },
    capture: (parsed, runCtx) => {
      const list =
        (pickPath(parsed, 'data.result') as unknown) ??
        (pickPath(parsed, 'data.answers') as unknown) ??
        (pickPath(parsed, 'result') as unknown)
      const first = firstItem(list)
      if (first) {
        const id = asNumberLike(first.id ?? first.lessonAnswerId ?? first.answerId)
        if (id !== undefined) runCtx.lessonAnswerId = id
      }
    }
  },
  {
    op: 'setUri',
    phase: 1,
    heapKeys: [
      V1_OPS_HEAP_KEYS.WEBHOOK_EVENT_ID,
      V1_OPS_HEAP_KEYS.WEBHOOK_EVENT_OBJECT_ID,
      V1_OPS_HEAP_KEYS.WEBHOOK_URI
    ],
    hint: 'Регистрация вебхука: event_id/event_object_id/uri из Heap.',
    build: ({ heap }) => {
      if (
        heap.webhookEventId === undefined ||
        heap.webhookEventObjectId === undefined ||
        heap.webhookUri === undefined
      ) {
        return { skip: 'Нужны Heap-ключи gc_itest_webhook_event_id, _event_object_id и _uri' }
      }
      return {
        args: {
          event_id: Number(heap.webhookEventId),
          event_object_id: Number(heap.webhookEventObjectId),
          uri: heap.webhookUri
        }
      }
    }
  }
]
