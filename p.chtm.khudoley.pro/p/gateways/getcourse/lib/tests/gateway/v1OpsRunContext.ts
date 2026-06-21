/**
 * Контекст прогона интеграционного сьюита /v1/{op} (gateway-testing-strategy.md §2, §3).
 *
 * В одном прогоне держится в памяти и наследуется между сценариями: производители
 * (createDeal → dealId, addUser → userId, getAllGroups → groupId и т.п.) заполняют
 * соответствующие поля, потребители читают их при сборке `args`. См. §3.4 стратегии.
 */
export type V1OpsRunContext = {
  /** Хост тестовой школы для X-Gc-School-Host (берётся из Heap GC_TEST_SCHOOL_HOST, §5.8 manual). */
  schoolHost: string
  /** API-ключ тестовой школы для X-Gc-School-Api-Key (Heap GC_TEST_SCHOOL_API_KEY, §5.5 manual). */
  schoolApiKey: string
  /** Тестовый email пользователя (gateway-testing-strategy.md §2.5, §5). */
  testerEmail: string

  /** userId пользователя `tester@khudoley.pro` (заполняется `addUser`). */
  userId?: string | number
  /** dealId сделки сьюита (заполняется `createDeal`). */
  dealId?: string | number

  /** offerId/код предложения (Heap `gc_itest_offer_id`, §2 стратегии). */
  offerId?: string | number
  /** id одной из групп аккаунта (заполняется `getAllGroups`). */
  groupId?: string | number
  /** id одного вебинара (заполняется `getAllWebinars`). */
  webinarId?: string | number
  /** список id вебинаров (заполняется `getAllWebinars`, для `getWebinarsByIds`). */
  webinarIds?: Array<string | number>
  /** id персонального менеджера (заполняется `getAllPersonalManagers`). */
  managerId?: string | number
  /** id урока (Heap `gc_itest_lesson_id`). */
  lessonId?: string | number
  /** id ответа на урок (заполняется `getLessonAnswers`). */
  lessonAnswerId?: string | number
  /** id экспорта (заполняется `exportUsers`/`exportDeals`/`exportPayments`). */
  exportId?: string | number

  /** id диалога (Heap `gc_itest_dialog_id`). */
  dialogId?: string | number
  /** id telegram-чата (Heap `gc_itest_telegram_chat_id`). */
  telegramChatId?: string
  /** id отдела для changeDepartment (Heap `gc_itest_department_id`). */
  departmentId?: string | number
  /** id шаблона диплома для createDiploma (Heap `gc_itest_diploma_template_id`). */
  diplomaTemplateId?: string | number
  /** id модератора вебинара (Heap `gc_itest_moderator_id`, иначе из getAllPersonalManagers). */
  moderatorId?: string | number
  /** id комментария вебинара (Heap `gc_itest_webinar_comment_id`). */
  webinarCommentId?: string | number

  /** event_id для setUri (Heap `gc_itest_webhook_event_id`). */
  webhookEventId?: string | number
  /** event_object_id для setUri (Heap `gc_itest_webhook_event_object_id`). */
  webhookEventObjectId?: string | number
  /** uri для setUri (Heap `gc_itest_webhook_uri`). */
  webhookUri?: string

  /** Реестр успешно выполненных op (для проверки зависимостей в потребителях). */
  completedOps: Set<string>
  /** Реестр пропущенных op (для пропуска зависимых). */
  skippedOps: Set<string>
}

/** Heap-ключи интеграционных тестов /v1/{op} (gateway-testing-strategy.md §2, §5.8 manual). */
export const V1_OPS_HEAP_KEYS = {
  OFFER_ID: 'gc_itest_offer_id',
  LESSON_ID: 'gc_itest_lesson_id',
  DIALOG_ID: 'gc_itest_dialog_id',
  TELEGRAM_CHAT_ID: 'gc_itest_telegram_chat_id',
  DEPARTMENT_ID: 'gc_itest_department_id',
  DIPLOMA_TEMPLATE_ID: 'gc_itest_diploma_template_id',
  MODERATOR_ID: 'gc_itest_moderator_id',
  WEBINAR_COMMENT_ID: 'gc_itest_webinar_comment_id',
  WEBHOOK_EVENT_ID: 'gc_itest_webhook_event_id',
  WEBHOOK_EVENT_OBJECT_ID: 'gc_itest_webhook_event_object_id',
  WEBHOOK_URI: 'gc_itest_webhook_uri'
} as const

export type V1OpsHeapKey = (typeof V1_OPS_HEAP_KEYS)[keyof typeof V1_OPS_HEAP_KEYS]

/** Email тестового пользователя (gateway-testing-strategy.md §2.5). */
export const V1_OPS_TESTER_EMAIL = 'tester@khudoley.pro' as const

/** Префикс комментариев артефактов для ручной чистки школы (§5 стратегии). */
export const V1_OPS_ARTIFACT_PREFIX = '[gateway-itest]' as const
