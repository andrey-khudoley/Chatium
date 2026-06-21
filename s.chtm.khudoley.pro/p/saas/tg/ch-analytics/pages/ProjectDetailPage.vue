<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import Header from '../shared/Header.vue'
import AlertModal from '../shared/AlertModal.vue'
import ConfirmModal from '../shared/ConfirmModal.vue'
import {
  apiGetProjectRoute,
  apiGetProjectRequestsRoute,
  apiApproveProjectRequestRoute,
  apiRejectProjectRequestRoute,
  apiRemoveProjectMemberRoute,
  apiUpdateProjectRoute,
  apiTransferOwnershipRoute,
  apiDeleteProjectRoute
} from '../api/projects'
import {
  apiGetBotsListRoute,
  apiValidateTokenRoute,
  apiAddBotRoute,
  apiReregisterWebhookRoute
} from '../api/bots'
import { apiGetChannelsListRoute } from '../api/channels'
import { apiCreateLinkRoute, apiGetLinksListRoute, apiDeleteLinkRoute } from '../api/links'
import { apiCheckWebhookRoute, apiWebhookRoute } from '../api/webhook'
import { publicLinkRoute } from '../index'
import { webhooksPageRoute } from '../webhooks'
import { userIdsMatch } from '../shared/user-utils'

declare const ctx: any

declare global {
  interface Window {
    hideAppLoader?: () => void
  }
}

const props = defineProps<{
  projectTitle: string
  indexUrl: string
  profileUrl: string
  loginUrl: string
  isAuthenticated: boolean
  projectsPageUrl?: string
  botsPageUrl?: string
  channelsPageUrl?: string
  projectId: string
  target?: string // Параметр target из query параметров (links, channels, bots)
}>()

const project = ref<{
  id: string
  name: string
  description?: string
  membersCount: number
  members?: Array<{ userId: string; role: string }>
} | null>(null)

const requests = ref<
  Array<{
    id: string
    userId: string
    requestedAt: Date | string
  }>
>([])

const loading = ref(true)
const error = ref<string | null>(null)
const activeTab = ref<'info' | 'bots' | 'channels' | 'links' | 'members' | 'requests'>('info')
const loadingRequests = ref(false)
const processingRequestId = ref<string | null>(null)
const removingMemberId = ref<string | null>(null)

// Данные ботов
const bots = ref<
  Array<{
    id: string
    token: string
    botName: string | null
    botUsername: string | null
    projectId: string
    channelsCount?: number
  }>
>([])
const loadingBots = ref(false)
const botsError = ref<string | null>(null)

// Данные каналов
const channels = ref<
  Array<{
    id: string
    chatId: string
    chatType: string | null
    chatTitle: string | null
    chatUsername: string | null
    firstSeenAt: Date | string
    lastSeenAt: Date | string
    botId: string
    botStatus: string | null
  }>
>([])
const loadingChannels = ref(false)
const channelsError = ref<string | null>(null)

// Фильтр для вкладки "Ссылки"
const selectedChannelId = ref<string | null>(null)
const channelFilterOpen = ref(false)
const channelFilterRef = ref<HTMLElement | null>(null)
const channelFilterSearch = ref('')

// Dropdown в модальном окне создания ссылки
const modalChannelDropdownOpen = ref(false)
const modalChannelDropdownRef = ref<HTMLElement | null>(null)
const modalChannelSearch = ref('')

// Данные ссылок
const links = ref<
  Array<{
    id: string
    name: string
    placementUrl?: string | null
    channelId: string
    botId: string
    projectId: string
    inviteLink?: string | null
    inviteLinkCreatedAt?: Date | string | null
    revokedAt?: Date | string | null
    createdAt: Date | string
    updatedAt: Date | string
    clicksCount?: number
    subscribesCount?: number
  }>
>([])
const loadingLinks = ref(false)
const linksError = ref<string | null>(null)
const deletingLinkId = ref<string | null>(null)

// Отслеживание изменения статуса канала для предупреждения
const channelStatusHistory = ref<Map<string, string | null>>(new Map())
const statusChangeWarning = ref<{
  show: boolean
  channelId: string | null
  oldStatus: string | null
  newStatus: string | null
}>({
  show: false,
  channelId: null,
  oldStatus: null,
  newStatus: null
})

// Модальное окно для добавления бота
const showAddTokenModal = ref(false)
const newToken = ref('')
const addingToken = ref(false)
const tokenError = ref<string | null>(null)

// Модальное окно для создания ссылки
const showCreateLinkModal = ref(false)
const newLinkName = ref('')
const newLinkPlacementUrl = ref('')
const newLinkChannelId = ref<string | null>(null)
const newLinkBotId = ref<string | null>(null)
const creatingLink = ref(false)
const linkError = ref<string | null>(null)

// Модальные окна для алёртов и подтверждений
const showAlertModal = ref(false)
const alertMessage = ref('')
const alertTitle = ref('')
const alertType = ref<'info' | 'error' | 'success' | 'warning'>('info')

const showConfirmModal = ref(false)
const confirmMessage = ref('')
const confirmTitle = ref('')
const confirmType = ref<'danger' | 'warning' | 'info'>('info')
const confirmCallback = ref<(() => void) | null>(null)

// Модальные окна для редактирования проекта
const showEditNameModal = ref(false)
const showEditDescriptionModal = ref(false)
const showTransferOwnershipModal = ref(false)
const showDeleteProjectModal = ref(false)

const editName = ref('')
const editDescription = ref('')
const transferOwnershipUserId = ref<string | null>(null)
const editingName = ref(false)
const editingDescription = ref(false)
const transferringOwnership = ref(false)
const deletingProject = ref(false)
const editError = ref<string | null>(null)

// Проверка прав доступа
const isOwner = computed(() => {
  if (!project.value || !ctx.user) return false
  return (
    project.value.members?.some((m: any) => m.userId === ctx.user.id && m.role === 'owner') || false
  )
})

const isMember = computed(() => {
  if (!project.value || !ctx.user) return false
  return (
    project.value.members?.some(
      (m: any) => m.userId === ctx.user.id && (m.role === 'owner' || m.role === 'member')
    ) || false
  )
})

const isAdmin = computed(() => {
  return ctx.user?.is && ctx.user.is('Admin')
})

// Tooltip state
const tooltip = ref<{
  show: boolean
  text: string
  x: number
  y: number
}>({
  show: false,
  text: '',
  x: 0,
  y: 0
})

const showTooltip = (event: MouseEvent, text: string) => {
  if (!text) return
  const target = (event.currentTarget || event.target) as HTMLElement

  // Проверяем, обрезан ли текст
  // Ищем span внутри ячейки, так как именно он содержит текст
  const spanElement = target.querySelector('span') || target
  const isTextTruncated =
    spanElement.scrollWidth > spanElement.clientWidth || target.scrollWidth > target.clientWidth

  if (!isTextTruncated) return

  const rect = target.getBoundingClientRect()
  tooltip.value = {
    show: true,
    text,
    x: rect.left + rect.width / 2,
    y: rect.top
  }
}

const hideTooltip = () => {
  tooltip.value.show = false
}

const canViewRequests = computed(() => {
  return isMember.value || isAdmin.value
})

const canManageMembers = computed(() => {
  return isOwner.value || isAdmin.value
})

// Загрузка информации о проекте
const loadProject = async () => {
  loading.value = true
  error.value = null

  try {
    const result = await apiGetProjectRoute({ id: props.projectId }).run(ctx)

    if (result.success && result.project) {
      project.value = result.project
    } else {
      error.value = result.error || 'Ошибка при загрузке проекта'
    }
  } catch (e: any) {
    console.error('[ProjectDetailPage] Ошибка загрузки проекта:', e)
    error.value = e.message || 'Ошибка при загрузке проекта'
  } finally {
    loading.value = false
  }
}

// Загрузка заявок
const loadRequests = async () => {
  if (!canViewRequests.value) return

  loadingRequests.value = true

  try {
    const result = await apiGetProjectRequestsRoute({ id: props.projectId }).run(ctx)

    if (result.success && result.requests) {
      requests.value = result.requests
    }
  } catch (e: any) {
    console.error('[ProjectDetailPage] Ошибка загрузки заявок:', e)
  } finally {
    loadingRequests.value = false
  }
}

// Функции для показа модальных окон
const showAlert = (
  message: string,
  title?: string,
  type: 'info' | 'error' | 'success' | 'warning' = 'info'
) => {
  alertMessage.value = message
  alertTitle.value = title || ''
  alertType.value = type
  showAlertModal.value = true
}

const showConfirm = (
  message: string,
  onConfirm: () => void,
  title?: string,
  type: 'danger' | 'warning' | 'info' = 'info'
) => {
  confirmMessage.value = message
  confirmTitle.value = title || ''
  confirmType.value = type
  confirmCallback.value = onConfirm
  showConfirmModal.value = true
}

const handleConfirm = () => {
  if (confirmCallback.value) {
    confirmCallback.value()
  }
  showConfirmModal.value = false
  confirmCallback.value = null
}

const handleCancel = () => {
  showConfirmModal.value = false
  confirmCallback.value = null
}

// Одобрение заявки
const approveRequest = async (requestId: string) => {
  if (processingRequestId.value) return

  processingRequestId.value = requestId

  try {
    const result = await apiApproveProjectRequestRoute({ id: props.projectId, requestId }).run(ctx)

    if (result.success) {
      // Обновляем данные
      await loadProject()
      await loadRequests()
    } else {
      showAlert(result.error || 'Ошибка при одобрении заявки', 'Ошибка', 'error')
    }
  } catch (e: any) {
    console.error('[ProjectDetailPage] Ошибка одобрения заявки:', e)
    showAlert(e.message || 'Ошибка при одобрении заявки', 'Ошибка', 'error')
  } finally {
    processingRequestId.value = null
  }
}

// Отклонение заявки
const rejectRequest = async (requestId: string) => {
  if (processingRequestId.value) return

  processingRequestId.value = requestId

  try {
    const result = await apiRejectProjectRequestRoute({ id: props.projectId, requestId }).run(ctx)

    if (result.success) {
      // Обновляем заявки
      await loadRequests()
    } else {
      showAlert(result.error || 'Ошибка при отклонении заявки', 'Ошибка', 'error')
    }
  } catch (e: any) {
    console.error('[ProjectDetailPage] Ошибка отклонения заявки:', e)
    showAlert(e.message || 'Ошибка при отклонении заявки', 'Ошибка', 'error')
  } finally {
    processingRequestId.value = null
  }
}

// Удаление участника
const removeMember = async (userId: string) => {
  if (removingMemberId.value) return

  showConfirm(
    'Вы уверены, что хотите удалить этого участника из проекта?',
    async () => {
      removingMemberId.value = userId

      try {
        const result = await apiRemoveProjectMemberRoute({ id: props.projectId }).run(ctx, {
          userId
        })

        if (result.success) {
          // Обновляем данные проекта
          await loadProject()
        } else {
          showAlert(result.error || 'Ошибка при удалении участника', 'Ошибка', 'error')
        }
      } catch (e: any) {
        console.error('[ProjectDetailPage] Ошибка удаления участника:', e)
        showAlert(e.message || 'Ошибка при удалении участника', 'Ошибка', 'error')
      } finally {
        removingMemberId.value = null
      }
    },
    'Подтверждение удаления',
    'danger'
  )
}

// Загрузка ботов
const loadBots = async () => {
  if (!props.projectId) return

  loadingBots.value = true
  botsError.value = null

  try {
    const result = await apiGetBotsListRoute.query({ projectId: props.projectId }).run(ctx)

    if (result.success && result.bots) {
      bots.value = result.bots.map((bot: any) => ({
        id: bot.id,
        token: bot.token,
        botName: bot.botName || null,
        botUsername: bot.botUsername || null,
        projectId: bot.projectId,
        channelsCount: bot.channelsCount || 0
      }))
    } else {
      botsError.value = result.error || 'Ошибка при получении списка ботов'
    }
  } catch (e: any) {
    console.error('[ProjectDetailPage] Ошибка загрузки ботов:', e)
    botsError.value = e.message || 'Ошибка при загрузке ботов'
  } finally {
    loadingBots.value = false
  }
}

// Загрузка каналов
const loadChannels = async () => {
  if (!props.projectId) return

  loadingChannels.value = true
  channelsError.value = null

  try {
    const result = await apiGetChannelsListRoute.query({ projectId: props.projectId }).run(ctx)

    if (result.success && result.channels) {
      // Проверяем изменение статуса перед обновлением
      const newChannels = result.channels.map((channel: any) => ({
        id: channel.id,
        chatId: channel.chatId,
        chatType: channel.chatType || null,
        chatTitle: channel.chatTitle || null,
        chatUsername: channel.chatUsername || null,
        firstSeenAt: channel.firstSeenAt,
        botStatus: channel.botStatus || null,
        lastSeenAt: channel.lastSeenAt,
        botId: channel.botId
      }))

      // Проверяем изменение статуса для каждого канала
      for (const newChannel of newChannels) {
        const oldStatus = channelStatusHistory.value.get(newChannel.id)
        const newStatus = newChannel.botStatus

        // Если статус изменился и мы на вкладке "Ссылки"
        // oldStatus !== undefined означает, что это не первая загрузка
        if (oldStatus !== undefined && oldStatus !== newStatus && activeTab.value === 'links') {
          // Показываем предупреждение (заменяем предыдущее, если было)
          statusChangeWarning.value = {
            show: true,
            channelId: newChannel.id,
            oldStatus: oldStatus,
            newStatus: newStatus
          }
        }

        // Обновляем историю статусов (инициализируем при первой загрузке)
        channelStatusHistory.value.set(newChannel.id, newStatus)
      }

      channels.value = newChannels
    } else {
      channelsError.value = result.error || 'Ошибка при получении списка каналов'
    }
  } catch (e: any) {
    console.error('[ProjectDetailPage] Ошибка загрузки каналов:', e)
    channelsError.value = e.message || 'Ошибка при загрузке каналов'
  } finally {
    loadingChannels.value = false
  }
}

// Загрузка ссылок
const loadLinks = async () => {
  if (!props.projectId) return

  loadingLinks.value = true
  linksError.value = null

  try {
    const queryParams: any = { projectId: props.projectId }
    if (selectedChannelId.value) {
      queryParams.channelId = selectedChannelId.value
    }

    const result = await apiGetLinksListRoute.query(queryParams).run(ctx)

    if (result.success && result.links) {
      links.value = result.links.map((link: any) => ({
        id: link.id,
        name: link.name,
        placementUrl: link.placementUrl || null,
        channelId: link.channelId,
        botId: link.botId,
        projectId: link.projectId,
        inviteLink: link.inviteLink || null,
        inviteLinkCreatedAt: link.inviteLinkCreatedAt || null,
        revokedAt: link.revokedAt || null,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        clicksCount: link.clicksCount || 0,
        subscribesCount: link.subscribesCount || 0
      }))
    } else {
      linksError.value = result.error || 'Ошибка при получении списка ссылок'
    }
  } catch (e: any) {
    console.error('[ProjectDetailPage] Ошибка загрузки ссылок:', e)
    linksError.value = e.message || 'Ошибка при загрузке ссылок'
  } finally {
    loadingLinks.value = false
  }
}

// Получение ботов для канала
const getBotsForChannel = (channelId: string) => {
  const channel = channels.value.find((c) => c.id === channelId)
  if (!channel) return []

  // Находим все каналы с таким же chatId и получаем уникальные botId
  const channelChatIds = channels.value
    .filter((c) => c.chatId === channel.chatId)
    .map((c) => c.botId)

  const uniqueBotIds = Array.from(new Set(channelChatIds))

  // Возвращаем ботов, которые есть в списке bots
  return bots.value.filter((bot) => uniqueBotIds.includes(bot.id))
}

// Проверка, нужен ли выбор бота для канала
const needsBotSelection = (channelId: string) => {
  return getBotsForChannel(channelId).length > 1
}

// Открытие модального окна для создания ссылки
const openCreateLinkModal = () => {
  showCreateLinkModal.value = true
  newLinkName.value = ''
  newLinkPlacementUrl.value = ''
  newLinkChannelId.value = null
  newLinkBotId.value = null
  linkError.value = null
}

// Закрытие модального окна для создания ссылки
const closeCreateLinkModal = () => {
  showCreateLinkModal.value = false
  newLinkName.value = ''
  newLinkPlacementUrl.value = ''
  newLinkChannelId.value = null
  newLinkBotId.value = null
  linkError.value = null
  creatingLink.value = false
  modalChannelDropdownOpen.value = false
  modalChannelSearch.value = ''
}

// Обработка изменения канала в модальном окне
const onChannelChange = () => {
  newLinkBotId.value = null

  if (!newLinkChannelId.value) return

  const selectedChannel = channels.value.find((c) => c.id === newLinkChannelId.value)
  if (selectedChannel) {
    // Если у канала только один бот (для этого chatId), используем его botId
    const botsForChannel = getBotsForChannel(newLinkChannelId.value)
    if (botsForChannel.length === 1) {
      // Если у канала только один бот, используем botId из выбранного канала
      newLinkBotId.value = selectedChannel.botId
    }
    // Если у канала несколько ботов, оставляем newLinkBotId.value = null
    // чтобы пользователь явно выбрал бота
  }
}

// Создание ссылки
const createLink = async () => {
  console.log('[ProjectDetailPage] createLink: Начало создания ссылки')

  if (!newLinkName.value || !newLinkName.value.trim()) {
    console.warn('[ProjectDetailPage] createLink: Название ссылки не заполнено')
    linkError.value = 'Название ссылки обязательно'
    return
  }

  if (!newLinkChannelId.value) {
    console.warn('[ProjectDetailPage] createLink: Канал не выбран')
    linkError.value = 'Выберите канал'
    return
  }

  if (!props.projectId) {
    console.warn('[ProjectDetailPage] createLink: projectId не установлен')
    linkError.value = 'Для создания ссылки необходимо выбрать проект.'
    return
  }

  const botsForChannel = getBotsForChannel(newLinkChannelId.value)
  if (botsForChannel.length === 0) {
    console.warn('[ProjectDetailPage] createLink: У канала нет доступных ботов')
    linkError.value = 'У выбранного канала нет доступных ботов'
    return
  }
  if (botsForChannel.length > 1 && !newLinkBotId.value) {
    console.warn('[ProjectDetailPage] createLink: У канала несколько ботов, но бот не выбран')
    linkError.value = 'Выберите бота (у канала несколько ботов)'
    return
  }
  // Если botsForChannel.length === 1, botId должен быть установлен автоматически в onChannelChange
  // Но на случай, если что-то пошло не так, используем botId из канала или из списка ботов
  if (botsForChannel.length === 1 && !newLinkBotId.value) {
    const selectedChannel = channels.value.find((c) => c.id === newLinkChannelId.value)
    if (selectedChannel && selectedChannel.botId) {
      newLinkBotId.value = selectedChannel.botId
    } else if (botsForChannel[0] && botsForChannel[0].id) {
      // Fallback: используем botId из списка ботов, если channel.botId недоступен
      newLinkBotId.value = botsForChannel[0].id
    } else {
      // Это не должно произойти, но на всякий случай возвращаем ошибку
      console.error(
        '[ProjectDetailPage] createLink: Не удалось определить botId для канала с одним ботом'
      )
      linkError.value = 'Не удалось определить бота для канала. Попробуйте перезагрузить страницу.'
      return
    }
  }

  const linkData = {
    name: newLinkName.value.trim(),
    placementUrl: newLinkPlacementUrl.value ? newLinkPlacementUrl.value.trim() : null,
    channelId: newLinkChannelId.value,
    botId: newLinkBotId.value || null,
    projectId: props.projectId
  }

  console.log('[ProjectDetailPage] createLink: Данные для создания ссылки:', {
    name: linkData.name,
    placementUrl: linkData.placementUrl || 'не указано',
    channelId: linkData.channelId,
    botId: linkData.botId || 'не указано (будет использован botId из канала)',
    projectId: linkData.projectId
  })

  creatingLink.value = true
  linkError.value = null

  try {
    console.log(
      '[ProjectDetailPage] createLink: Проверка наличия apiCreateLinkRoute:',
      typeof apiCreateLinkRoute
    )
    console.log('[ProjectDetailPage] createLink: Проверка наличия ctx:', typeof ctx)

    if (typeof apiCreateLinkRoute === 'undefined') {
      const errorMsg = 'apiCreateLinkRoute не определен. Проверьте импорт.'
      console.error('[ProjectDetailPage] createLink: КРИТИЧЕСКАЯ ОШИБКА:', errorMsg)
      throw new Error(errorMsg)
    }

    if (typeof ctx === 'undefined') {
      const errorMsg = 'ctx не определен. Невозможно создать ссылку.'
      console.error('[ProjectDetailPage] createLink: КРИТИЧЕСКАЯ ОШИБКА:', errorMsg)
      throw new Error(errorMsg)
    }

    console.log('[ProjectDetailPage] createLink: Вызов apiCreateLinkRoute.run() с данными')
    console.log(
      '[ProjectDetailPage] createLink: typeof apiCreateLinkRoute.run:',
      typeof apiCreateLinkRoute.run
    )

    // Используем правильный синтаксис согласно документации: .run(ctx, bodyData)
    const result = await apiCreateLinkRoute.run(ctx, linkData)

    console.log('[ProjectDetailPage] createLink: Получен ответ от сервера:', {
      success: result.success,
      error: result.error || 'нет ошибки',
      linkId: result.link?.id || 'не создана'
    })

    if (result.success) {
      console.log('[ProjectDetailPage] createLink: Ссылка успешно создана, обновляем список')
      await loadLinks()
      closeCreateLinkModal()
      console.log('[ProjectDetailPage] createLink: Модальное окно закрыто')
    } else {
      console.error('[ProjectDetailPage] createLink: Сервер вернул ошибку:', result.error)
      linkError.value = result.error || 'Ошибка при создании ссылки'
    }
  } catch (e: any) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    const errorStack = e instanceof Error ? e.stack : 'нет стека'

    console.error('[ProjectDetailPage] createLink: ОШИБКА при создании ссылки:', errorMessage)
    console.error('[ProjectDetailPage] createLink: Стек ошибки:', errorStack)
    console.error('[ProjectDetailPage] createLink: Полный объект ошибки:', e)
    console.error('[ProjectDetailPage] createLink: Тип ошибки:', typeof e)
    console.error('[ProjectDetailPage] createLink: ctx доступен:', typeof ctx !== 'undefined')
    console.error(
      '[ProjectDetailPage] createLink: apiCreateLinkRoute доступен:',
      typeof apiCreateLinkRoute !== 'undefined'
    )

    linkError.value = errorMessage || 'Ошибка при создании ссылки'
  } finally {
    creatingLink.value = false
    console.log('[ProjectDetailPage] createLink: Завершение обработки, creatingLink = false')
  }
}

// Генерация публичного URL для ссылки
const getPublicLinkUrl = (linkId: string) => {
  // Используем роут-объект для генерации правильного URL
  // Согласно file-based роутингу Chatium, это создаст URL вида:
  // https://s.chtm.aley.pro/saas/analytics/telegram/channel~{linkId}

  // Проверяем, что linkId передан и не пустой
  if (!linkId || typeof linkId !== 'string' || !linkId.trim()) {
    console.error('[ProjectDetailPage] getPublicLinkUrl: linkId не передан или невалиден:', linkId)
    throw new Error('linkId обязателен для генерации URL')
  }

  const trimmedLinkId = linkId.trim()
  console.log('[ProjectDetailPage] getPublicLinkUrl: генерация URL для linkId:', trimmedLinkId)
  console.log('[ProjectDetailPage] getPublicLinkUrl: publicLinkRoute:', publicLinkRoute)
  console.log(
    '[ProjectDetailPage] getPublicLinkUrl: typeof publicLinkRoute:',
    typeof publicLinkRoute
  )

  // Проверяем, что роут доступен
  if (!publicLinkRoute) {
    console.error('[ProjectDetailPage] getPublicLinkUrl: publicLinkRoute не определен')
    throw new Error('Роут publicLinkRoute не найден')
  }

  // Проверяем, что метод url доступен
  if (typeof publicLinkRoute.url !== 'function') {
    console.error('[ProjectDetailPage] getPublicLinkUrl: publicLinkRoute.url не является функцией')
    console.error(
      '[ProjectDetailPage] getPublicLinkUrl: publicLinkRoute:',
      JSON.stringify(publicLinkRoute, null, 2)
    )
    throw new Error('Метод url() не доступен в роуте publicLinkRoute')
  }

  console.log(
    '[ProjectDetailPage] getPublicLinkUrl: publicLinkRoute.url:',
    typeof publicLinkRoute.url
  )
  console.log('[ProjectDetailPage] getPublicLinkUrl: параметры для url():', { id: trimmedLinkId })

  try {
    // ✅ ПРАВИЛЬНО: вызываем .url() напрямую с параметрами на объекте роута
    // Согласно документации 002-routing.md, для роутов с параметрами пути используется паттерн: route.url({ id: ... })
    const url = publicLinkRoute.url({ id: trimmedLinkId })
    console.log(
      '[ProjectDetailPage] getPublicLinkUrl: сгенерирован URL:',
      url,
      'для linkId:',
      trimmedLinkId
    )
    return url
  } catch (error: any) {
    console.error('[ProjectDetailPage] getPublicLinkUrl: ошибка генерации URL:', error)
    console.error('[ProjectDetailPage] getPublicLinkUrl: error.message:', error?.message)
    console.error('[ProjectDetailPage] getPublicLinkUrl: error.stack:', error?.stack)
    throw error
  }
}

// Копирование ссылки в буфер обмена
const copyLinkToClipboard = async (linkId: string) => {
  try {
    console.log('[ProjectDetailPage] copyLinkToClipboard: получен linkId:', linkId)
    console.log('[ProjectDetailPage] copyLinkToClipboard: typeof linkId:', typeof linkId)
    console.log('[ProjectDetailPage] copyLinkToClipboard: linkId значение:', JSON.stringify(linkId))

    if (!linkId) {
      console.error('[ProjectDetailPage] copyLinkToClipboard: linkId не передан')
      showAlert('Ошибка: ID ссылки не найден', 'Ошибка', 'error')
      return
    }

    const url = getPublicLinkUrl(linkId)
    console.log('[ProjectDetailPage] copyLinkToClipboard: копирование URL:', url)
    await navigator.clipboard.writeText(url)
    showAlert('Ссылка скопирована в буфер обмена', 'Успешно', 'success')
  } catch (e: any) {
    console.error('[ProjectDetailPage] Ошибка копирования ссылки:', e)
    console.error('[ProjectDetailPage] Ошибка копирования ссылки - message:', e?.message)
    console.error('[ProjectDetailPage] Ошибка копирования ссылки - stack:', e?.stack)
    showAlert(
      'Не удалось скопировать ссылку: ' + (e?.message || 'Неизвестная ошибка'),
      'Ошибка',
      'error'
    )
  }
}

// Получение названия канала по ID
const getChannelName = (channelId: string) => {
  const channel = channels.value.find((c) => c.id === channelId)
  if (!channel) return null
  return channel.chatTitle || channel.chatUsername || channel.chatId
}

// Получение статуса канала по ID
const getChannelStatus = (channelId: string): string | null => {
  const channel = channels.value.find((c) => c.id === channelId)
  return channel?.botStatus || null
}

// Закрытие предупреждения об изменении статуса
const closeStatusChangeWarning = () => {
  statusChangeWarning.value.show = false
  statusChangeWarning.value.channelId = null
  statusChangeWarning.value.oldStatus = null
  statusChangeWarning.value.newStatus = null
}

// Форматирование статуса бота в канале
const formatBotStatus = (status: string | null): { text: string; color: string; icon: string } => {
  if (!status) {
    return { text: 'Неизвестно', color: 'var(--color-text-secondary)', icon: 'fa-question-circle' }
  }

  switch (status) {
    case 'member':
      return { text: 'Участник', color: '#4ade80', icon: 'fa-check-circle' }
    case 'administrator':
      return { text: 'Администратор', color: '#3b82f6', icon: 'fa-shield-alt' }
    case 'creator':
      return { text: 'Создатель', color: '#f59e0b', icon: 'fa-crown' }
    case 'left':
      return { text: 'Покинул', color: '#ef4444', icon: 'fa-sign-out-alt' }
    case 'kicked':
      return { text: 'Удалён', color: '#dc2626', icon: 'fa-ban' }
    case 'restricted':
      return { text: 'Ограничен', color: '#f97316', icon: 'fa-lock' }
    default:
      return { text: status, color: 'var(--color-text-secondary)', icon: 'fa-question-circle' }
  }
}

// Форматирование статуса канала (публичный/приватный)
const formatChannelStatus = (
  chatUsername: string | null | undefined
): { text: string; color: string; icon: string } => {
  if (chatUsername) {
    return { text: 'Публичный', color: '#4ade80', icon: 'fa-globe' }
  } else {
    return { text: 'Приватный', color: '#3b82f6', icon: 'fa-lock' }
  }
}

// Маскирование токена для tooltip (полный маскированный токен)
const maskTokenFull = (token: string) => {
  if (!token) return ''
  if (token.length <= 14) {
    return '•'.repeat(token.length)
  }
  return token.substring(0, 10) + '•'.repeat(token.length - 14) + token.substring(token.length - 4)
}

// Отображение токена в таблице в формате "8133629083:***123"
const maskToken = (token: string) => {
  if (!token) return ''

  const colonIndex = token.indexOf(':')
  if (colonIndex === -1) {
    // Если нет двоеточия, показываем первые 13 символов
    return token.length > 13 ? token.substring(0, 13) : token
  }

  // Часть до двоеточия
  const beforeColon = token.substring(0, colonIndex)
  // Последние 3 символа после двоеточия
  const afterColon = token.substring(colonIndex + 1)
  const lastThree =
    afterColon.length >= 3 ? afterColon.substring(afterColon.length - 3) : afterColon

  return `${beforeColon}:***${lastThree}`
}

// Открытие модального окна для добавления бота
const openAddTokenModal = () => {
  showAddTokenModal.value = true
  newToken.value = ''
  tokenError.value = null
}

// Закрытие модального окна
const closeAddTokenModal = () => {
  showAddTokenModal.value = false
  newToken.value = ''
  tokenError.value = null
  addingToken.value = false
}

// Добавление бота
const addToken = async () => {
  if (!newToken.value || !newToken.value.trim()) {
    tokenError.value = 'Введите токен бота'
    return
  }

  if (!props.projectId) {
    tokenError.value = 'Для добавления бота необходимо выбрать проект.'
    return
  }

  addingToken.value = true
  tokenError.value = null

  try {
    // 1. Валидация токена через API
    const validationResult = await apiValidateTokenRoute
      .body({
        token: newToken.value.trim()
      })
      .run(ctx)

    if (!validationResult.success) {
      tokenError.value = validationResult.error || 'Ошибка при проверке токена'
      return
    }

    // 2. Сохранение токена в таблицу
    const saveResult = await apiAddBotRoute
      .body({
        token: newToken.value.trim(),
        botName: validationResult.botInfo.name,
        botUsername: validationResult.botInfo.username,
        projectId: props.projectId
      })
      .run(ctx)

    if (!saveResult.success) {
      tokenError.value = saveResult.error || 'Ошибка при сохранении токена'
      return
    }

    // 3. Обновление списка и закрытие модального окна
    await loadBots()
    closeAddTokenModal()
  } catch (e: any) {
    console.error('[ProjectDetailPage] Ошибка при добавлении токена:', e)
    tokenError.value = e.message || 'Ошибка при добавлении токена'
  } finally {
    addingToken.value = false
  }
}

// Форматирование даты
const formatDate = (date: Date | string | null | undefined) => {
  if (!date) {
    return 'Дата не указана'
  }

  try {
    const d = typeof date === 'string' ? new Date(date) : date

    // Проверка на валидность даты
    if (isNaN(d.getTime())) {
      return 'Неверная дата'
    }

    return d.toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('[ProjectDetailPage] Ошибка форматирования даты:', error)
    return 'Ошибка форматирования даты'
  }
}

let escHandler: ((e: KeyboardEvent) => void) | null = null

onMounted(async () => {
  if (window.hideAppLoader) {
    window.hideAppLoader()
  }

  // Обработчик клика вне dropdown для закрытия
  document.addEventListener('click', handleClickOutside)

  // Обработчик Esc для закрытия модальных окон
  escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showAddTokenModal.value && !addingToken.value) {
        closeAddTokenModal()
      } else if (showCreateLinkModal.value && !creatingLink.value) {
        closeCreateLinkModal()
      } else if (showEditNameModal.value && !editingName.value) {
        closeEditNameModal()
      } else if (showEditDescriptionModal.value && !editingDescription.value) {
        closeEditDescriptionModal()
      } else if (showTransferOwnershipModal.value && !transferringOwnership.value) {
        closeTransferOwnershipModal()
      }
    }
  }
  window.addEventListener('keydown', escHandler)

  await loadProject()

  // Загружаем заявки, если есть права
  if (canViewRequests.value) {
    await loadRequests()
  }

  // Автоматически переключаем на нужную вкладку, если передан параметр target
  if (props.target) {
    // Маппинг значений target на вкладки
    const targetToTab: Record<
      string,
      'info' | 'bots' | 'channels' | 'links' | 'members' | 'requests'
    > = {
      links: 'links', // Для "Управлять ссылками" открываем вкладку "Ссылки"
      channels: 'channels',
      bots: 'bots'
    }

    const targetTab = targetToTab[props.target]
    if (targetTab) {
      activeTab.value = targetTab
    }
  }

  // Загружаем данные при переключении на соответствующие вкладки
  if (activeTab.value === 'bots') {
    await loadBots()
  } else if (activeTab.value === 'channels' || activeTab.value === 'links') {
    await loadChannels()
    if (activeTab.value === 'links') {
      await loadLinks()
    }
  }
})

onUnmounted(() => {
  // Cleanup обработчика клика вне dropdown
  document.removeEventListener('click', handleClickOutside)

  // Cleanup обработчика Esc
  if (escHandler) {
    window.removeEventListener('keydown', escHandler)
    escHandler = null
  }
})

// Загрузка данных при переключении вкладок
const handleTabChange = async (
  tab: 'info' | 'bots' | 'channels' | 'links' | 'members' | 'requests'
) => {
  activeTab.value = tab

  if (tab === 'bots' && bots.value.length === 0 && !loadingBots.value) {
    await loadBots()
  } else if (tab === 'channels' && channels.value.length === 0 && !loadingChannels.value) {
    await loadChannels()
  } else if (tab === 'links') {
    // При переключении на вкладку "Ссылки" всегда загружаем каналы для проверки изменения статуса
    if (!loadingChannels.value) {
      await loadChannels()
    }
    if (links.value.length === 0 && !loadingLinks.value) {
      await loadLinks()
    }
  }
}

// Обработка изменения фильтра по каналу
const onChannelFilterChange = async () => {
  await loadLinks()
}

// Обработка выбора канала в кастомном dropdown
const selectChannel = async (channelId: string | null) => {
  selectedChannelId.value = channelId
  channelFilterOpen.value = false
  channelFilterSearch.value = ''
  await loadLinks()
}

// Закрытие dropdown при клике вне его
const handleClickOutside = (event: MouseEvent) => {
  if (channelFilterRef.value && !channelFilterRef.value.contains(event.target as Node)) {
    channelFilterOpen.value = false
    channelFilterSearch.value = ''
  }
  if (
    modalChannelDropdownRef.value &&
    !modalChannelDropdownRef.value.contains(event.target as Node)
  ) {
    modalChannelDropdownOpen.value = false
    modalChannelSearch.value = ''
  }
}

// Получение названия выбранного канала
const selectedChannelName = computed(() => {
  if (!selectedChannelId.value) return 'Все каналы'
  const channel = channels.value.find((c) => c.id === selectedChannelId.value)
  return channel ? channel.chatTitle || channel.chatUsername || channel.chatId : 'Все каналы'
})

// Получение названия выбранного канала в модальном окне
const selectedModalChannelName = computed(() => {
  if (!newLinkChannelId.value) return 'Выберите канал'
  const channel = channels.value.find((c) => c.id === newLinkChannelId.value)
  return channel ? channel.chatTitle || channel.chatUsername || channel.chatId : 'Выберите канал'
})

// Фильтрация каналов для фильтра
const filteredChannelsForFilter = computed(() => {
  if (!channelFilterSearch.value.trim()) return channels.value
  const search = channelFilterSearch.value.toLowerCase().trim()
  return channels.value.filter((channel) => {
    const title = (channel.chatTitle || '').toLowerCase()
    const username = (channel.chatUsername || '').toLowerCase()
    const id = String(channel.chatId || '').toLowerCase()
    return title.includes(search) || username.includes(search) || id.includes(search)
  })
})

// Фильтрация каналов для модального окна
const filteredChannelsForModal = computed(() => {
  if (!modalChannelSearch.value.trim()) return channels.value
  const search = modalChannelSearch.value.toLowerCase().trim()
  return channels.value.filter((channel) => {
    const title = (channel.chatTitle || '').toLowerCase()
    const username = (channel.chatUsername || '').toLowerCase()
    const id = String(channel.chatId || '').toLowerCase()
    return title.includes(search) || username.includes(search) || id.includes(search)
  })
})

// Обработка выбора канала в модальном окне
const selectModalChannel = (channelId: string | null) => {
  newLinkChannelId.value = channelId
  modalChannelDropdownOpen.value = false
  modalChannelSearch.value = ''
  onChannelChange()
}

// Проверка webhook для бота
const checkWebhook = async (botId: string) => {
  try {
    console.log('[ProjectDetailPage] checkWebhook: Проверка webhook для бота:', botId)

    const result = await apiCheckWebhookRoute({ id: botId }).run(ctx)

    console.log('[ProjectDetailPage] checkWebhook: Результат проверки:', result)

    if (result.success && result.webhookInfo) {
      const info = result.webhookInfo
      const message =
        `Текущий URL: ${info.url || 'не установлен'}\n` +
        `URL приложения: ${result.expectedUrl}\n` +
        `Результат совпадения: ${result.isCorrect ? 'Да' : 'Нет'}\n` +
        `Событий в ожидании: ${info.pending_update_count || 0}\n` +
        `Есть ошибки доставки: ${info.last_error_date ? 'Да' : 'Нет'}\n` +
        (info.last_error_date
          ? `Последняя ошибка: ${new Date(info.last_error_date * 1000).toLocaleString()}\n`
          : '') +
        (info.last_error_message ? `Сообщение: ${info.last_error_message}` : '')

      showAlert(message, 'Статус webhook', 'info')
    } else {
      showAlert(
        `Ошибка проверки webhook: ${result.error || 'Неизвестная ошибка'}`,
        'Ошибка',
        'error'
      )
    }
  } catch (e: any) {
    console.error('[ProjectDetailPage] checkWebhook: Ошибка:', e)
    showAlert(
      `Ошибка при проверке webhook: ${e.message || 'Неизвестная ошибка'}`,
      'Ошибка',
      'error'
    )
  }
}

// Перерегистрация webhook для бота
const reregisterWebhook = async (botId: string) => {
  try {
    console.log('[ProjectDetailPage] reregisterWebhook: Перерегистрация webhook для бота:', botId)

    showConfirm(
      'Вы уверены, что хотите перерегистрировать webhook? Это обновит настройки webhook с новыми типами обновлений (подписки, лайки и др.).',
      async () => {
        const result = await apiReregisterWebhookRoute.run(ctx, { botId: botId })

        console.log('[ProjectDetailPage] reregisterWebhook: Результат перерегистрации:', result)

        if (result.success) {
          const webhookUrl = apiWebhookRoute({ id: botId }).url()
          showAlert(`Вебхук установлен на значение: ${webhookUrl}`, 'Успешно', 'success')
        } else {
          showAlert(
            `Ошибка перерегистрации webhook: ${result.error || 'Неизвестная ошибка'}`,
            'Ошибка',
            'error'
          )
        }
      },
      'Подтверждение перерегистрации',
      'warning'
    )
  } catch (e: any) {
    console.error('[ProjectDetailPage] reregisterWebhook: Ошибка:', e)
    showAlert(
      `Ошибка при перерегистрации webhook: ${e.message || 'Неизвестная ошибка'}`,
      'Ошибка',
      'error'
    )
  }
}

// Переход на страницу вебхуков для бота или канала
const viewWebhooks = (botId: string, chatId?: string) => {
  // Переходим на страницу вебхуков с фильтром по botId и опционально по chatId
  const queryParams: any = { botId: botId }
  if (chatId) {
    queryParams.chatId = chatId
  }
  const webhooksUrl = webhooksPageRoute.query(queryParams).url()
  window.location.href = webhooksUrl
}

// Удаление ссылки
const deleteLink = async (linkId: string) => {
  if (deletingLinkId.value) return

  showConfirm(
    'Вы уверены, что хотите удалить эту ссылку? Это отзовёт работу публичной ссылки для аналитики, отзовёт все инвайт-линки в телеграм и удалит все связанные данные по аналитике из таблиц.',
    async () => {
      deletingLinkId.value = linkId

      try {
        const result = await apiDeleteLinkRoute.run(ctx, {
          linkId: linkId
        })

        if (result.success) {
          showAlert('Ссылка успешно удалена', 'Успешно', 'success')
          // Обновляем список ссылок
          await loadLinks()
        } else {
          showAlert(result.error || 'Ошибка при удалении ссылки', 'Ошибка', 'error')
        }
      } catch (e: any) {
        console.error('[ProjectDetailPage] Ошибка удаления ссылки:', e)
        showAlert(e.message || 'Ошибка при удалении ссылки', 'Ошибка', 'error')
      } finally {
        deletingLinkId.value = null
      }
    },
    'Подтверждение удаления',
    'danger'
  )
}

// Открытие модального окна для редактирования названия
const openEditNameModal = () => {
  if (!project.value) return
  editName.value = project.value.name
  editError.value = null
  showEditNameModal.value = true
}

// Закрытие модального окна для редактирования названия
const closeEditNameModal = () => {
  showEditNameModal.value = false
  editName.value = ''
  editError.value = null
  editingName.value = false
}

// Сохранение названия проекта
const saveProjectName = async () => {
  if (!editName.value || !editName.value.trim()) {
    editError.value = 'Название проекта обязательно'
    return
  }

  if (!props.projectId) {
    editError.value = 'ID проекта не установлен'
    return
  }

  editingName.value = true
  editError.value = null

  try {
    const result = await apiUpdateProjectRoute({ id: props.projectId }).run(ctx, {
      name: editName.value.trim()
    })

    if (result.success) {
      await loadProject()
      closeEditNameModal()
      showAlert('Название проекта успешно обновлено', 'Успешно', 'success')
    } else {
      editError.value = result.error || 'Ошибка при обновлении названия'
    }
  } catch (e: any) {
    console.error('[ProjectDetailPage] Ошибка обновления названия:', e)
    editError.value = e.message || 'Ошибка при обновлении названия'
  } finally {
    editingName.value = false
  }
}

// Открытие модального окна для редактирования описания
const openEditDescriptionModal = () => {
  if (!project.value) return
  editDescription.value = project.value.description || ''
  editError.value = null
  showEditDescriptionModal.value = true
}

// Закрытие модального окна для редактирования описания
const closeEditDescriptionModal = () => {
  showEditDescriptionModal.value = false
  editDescription.value = ''
  editError.value = null
  editingDescription.value = false
}

// Сохранение описания проекта
const saveProjectDescription = async () => {
  if (!props.projectId) {
    editError.value = 'ID проекта не установлен'
    return
  }

  editingDescription.value = true
  editError.value = null

  try {
    const result = await apiUpdateProjectRoute({ id: props.projectId }).run(ctx, {
      description: editDescription.value.trim() || null
    })

    if (result.success) {
      await loadProject()
      closeEditDescriptionModal()
      showAlert('Описание проекта успешно обновлено', 'Успешно', 'success')
    } else {
      editError.value = result.error || 'Ошибка при обновлении описания'
    }
  } catch (e: any) {
    console.error('[ProjectDetailPage] Ошибка обновления описания:', e)
    editError.value = e.message || 'Ошибка при обновлении описания'
  } finally {
    editingDescription.value = false
  }
}

// Получение списка участников для передачи прав (кроме текущего пользователя, если он овнер)
const availableMembersForTransfer = computed(() => {
  if (!project.value || !project.value.members) return []

  return project.value.members.filter((member: any) => {
    // Исключаем текущего пользователя, если он овнер
    if (userIdsMatch(member.userId, ctx.user?.id) && member.role === 'owner') {
      return false
    }
    // Включаем всех остальных участников
    return true
  })
})

// Открытие модального окна для передачи прав
const openTransferOwnershipModal = () => {
  if (!project.value) return
  transferOwnershipUserId.value = null
  editError.value = null
  showTransferOwnershipModal.value = true
}

// Закрытие модального окна для передачи прав
const closeTransferOwnershipModal = () => {
  showTransferOwnershipModal.value = false
  transferOwnershipUserId.value = null
  editError.value = null
  transferringOwnership.value = false
}

// Передача прав владельца
const transferOwnership = async () => {
  if (!transferOwnershipUserId.value) {
    editError.value = 'Выберите участника для передачи прав'
    return
  }

  if (!props.projectId) {
    editError.value = 'ID проекта не установлен'
    return
  }

  transferringOwnership.value = true
  editError.value = null

  try {
    const result = await apiTransferOwnershipRoute({ id: props.projectId }).run(ctx, {
      newOwnerUserId: transferOwnershipUserId.value
    })

    if (result.success) {
      await loadProject()
      closeTransferOwnershipModal()
      showAlert('Права владельца успешно переданы', 'Успешно', 'success')
    } else {
      editError.value = result.error || 'Ошибка при передаче прав'
    }
  } catch (e: any) {
    console.error('[ProjectDetailPage] Ошибка передачи прав:', e)
    editError.value = e.message || 'Ошибка при передаче прав'
  } finally {
    transferringOwnership.value = false
  }
}

// Удаление проекта
const deleteProject = async () => {
  if (!props.projectId) {
    showAlert('ID проекта не установлен', 'Ошибка', 'error')
    return
  }

  showConfirm(
    'Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить. Все данные проекта (боты, каналы, ссылки, аналитика) будут удалены.',
    async () => {
      deletingProject.value = true

      try {
        const result = await apiDeleteProjectRoute.run(ctx, {
          projectId: props.projectId
        })

        if (result.success) {
          showAlert('Проект успешно удалён', 'Успешно', 'success')
          // Перенаправляем на страницу проектов
          if (props.projectsPageUrl) {
            window.location.href = props.projectsPageUrl
          }
        } else {
          showAlert(result.error || 'Ошибка при удалении проекта', 'Ошибка', 'error')
        }
      } catch (e: any) {
        console.error('[ProjectDetailPage] Ошибка удаления проекта:', e)
        showAlert(e.message || 'Ошибка при удалении проекта', 'Ошибка', 'error')
      } finally {
        deletingProject.value = false
      }
    },
    'Подтверждение удаления проекта',
    'danger'
  )
}
</script>

<template>
  <div class="app-layout bg-transparent text-[var(--color-text)] flex flex-col">
    <!-- Header -->
    <Header
      :pageTitle="'A/Ley Services'"
      :indexUrl="props.indexUrl"
      :profileUrl="props.profileUrl"
      :loginUrl="props.loginUrl"
      :isAuthenticated="props.isAuthenticated"
    />

    <!-- Content -->
    <main class="content-wrapper flex-1 relative z-10 min-h-0 overflow-y-auto">
      <div class="content-inner">
        <!-- Loading -->
        <div v-if="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Загрузка проекта...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="error-container">
          <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <span>{{ error }}</span>
          </div>
          <a
            v-if="props.projectsPageUrl"
            :href="props.projectsPageUrl"
            class="btn btn-primary mt-4"
          >
            <i class="fas fa-arrow-left"></i>
            Вернуться к проектам
          </a>
        </div>

        <!-- Project Content -->
        <div v-else-if="project" class="project-detail">
          <!-- Project Header -->
          <div class="project-header">
            <div class="project-header-content">
              <h1 class="project-title">{{ project.name }}</h1>
              <p v-if="project.description" class="project-description">
                {{ project.description }}
              </p>
              <div class="project-meta">
                <span class="meta-item">
                  <i class="fas fa-users"></i>
                  {{ project.membersCount }} участников
                </span>
              </div>
            </div>
            <a v-if="props.projectsPageUrl" :href="props.projectsPageUrl" class="btn btn-secondary">
              <i class="fas fa-arrow-left"></i>
              К списку проектов
            </a>
          </div>

          <!-- Tabs -->
          <div class="tabs">
            <button
              @click="activeTab = 'info'"
              :class="['tab', { 'tab-active': activeTab === 'info' }]"
            >
              <i class="fas fa-info-circle"></i>
              Информация
            </button>
            <button
              @click="handleTabChange('bots')"
              :class="['tab', { 'tab-active': activeTab === 'bots' }]"
            >
              <i class="fas fa-robot"></i>
              Боты
            </button>
            <button
              @click="handleTabChange('channels')"
              :class="['tab', { 'tab-active': activeTab === 'channels' }]"
            >
              <i class="fas fa-broadcast-tower"></i>
              Каналы
            </button>
            <button
              @click="handleTabChange('links')"
              :class="['tab', { 'tab-active': activeTab === 'links' }]"
            >
              <i class="fas fa-link"></i>
              Ссылки
            </button>
            <button
              v-if="canManageMembers"
              @click="activeTab = 'members'"
              :class="['tab', { 'tab-active': activeTab === 'members' }]"
            >
              <i class="fas fa-users"></i>
              Участники
            </button>
            <button
              v-if="canViewRequests"
              @click="activeTab = 'requests'"
              :class="['tab', { 'tab-active': activeTab === 'requests' }]"
            >
              <i class="fas fa-inbox"></i>
              Заявки
              <span v-if="requests.length > 0" class="tab-badge">{{ requests.length }}</span>
            </button>
          </div>

          <!-- Tab Content -->
          <div class="tab-content">
            <!-- Info Tab -->
            <div v-if="activeTab === 'info'" class="tab-panel">
              <div class="info-section">
                <div class="section-header">
                  <h2 class="section-title">Информация о проекте</h2>
                  <div v-if="isOwner || isAdmin" class="section-actions">
                    <button
                      @click="openEditNameModal"
                      class="btn btn-secondary btn-sm"
                      title="Редактировать название"
                    >
                      <i class="fas fa-edit"></i>
                      Редактировать название
                    </button>
                    <button
                      @click="openEditDescriptionModal"
                      class="btn btn-secondary btn-sm"
                      title="Редактировать описание"
                    >
                      <i class="fas fa-edit"></i>
                      Редактировать описание
                    </button>
                    <button
                      v-if="isOwner && availableMembersForTransfer.length > 0"
                      @click="openTransferOwnershipModal"
                      class="btn btn-secondary btn-sm"
                      title="Передать права владельца"
                    >
                      <i class="fas fa-user-crown"></i>
                      Передать права
                    </button>
                    <button
                      @click="deleteProject"
                      class="btn btn-danger btn-sm"
                      title="Удалить проект"
                      :disabled="deletingProject"
                    >
                      <i v-if="deletingProject" class="fas fa-spinner fa-spin"></i>
                      <i v-else class="fas fa-trash"></i>
                      Удалить проект
                    </button>
                  </div>
                </div>
                <div class="info-grid">
                  <div class="info-item">
                    <label class="info-label">Название</label>
                    <div class="info-value">{{ project.name }}</div>
                  </div>
                  <div class="info-item">
                    <label class="info-label">Описание</label>
                    <div class="info-value">{{ project.description || 'Нет описания' }}</div>
                  </div>
                  <div class="info-item">
                    <label class="info-label">Участников</label>
                    <div class="info-value">{{ project.membersCount }}</div>
                  </div>
                  <div class="info-item">
                    <label class="info-label">ID проекта</label>
                    <div class="info-value info-value-code">{{ project.id }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bots Tab -->
            <div v-if="activeTab === 'bots'" class="tab-panel">
              <div class="section-header">
                <h2 class="section-title">Боты проекта</h2>
                <div class="section-actions">
                  <button @click="openAddTokenModal" class="btn btn-primary btn-sm">
                    <i class="fas fa-plus"></i>
                    Добавить бота
                  </button>
                  <button
                    @click="loadBots"
                    class="btn btn-secondary btn-sm"
                    :disabled="loadingBots"
                  >
                    <i v-if="loadingBots" class="fas fa-spinner fa-spin"></i>
                    <i v-else class="fas fa-sync-alt"></i>
                    Обновить
                  </button>
                </div>
              </div>

              <div v-if="loadingBots" class="loading-container-small">
                <div class="loading-spinner"></div>
                <p>Загрузка ботов...</p>
              </div>

              <div v-else-if="botsError" class="error-container">
                <div class="error-message">
                  <i class="fas fa-exclamation-circle"></i>
                  <span>{{ botsError }}</span>
                </div>
              </div>

              <div v-else-if="bots.length === 0" class="empty-state">
                <i class="fas fa-robot"></i>
                <p>Нет добавленных ботов</p>
                <p class="empty-subtext">Добавьте первого бота, чтобы начать работу</p>
              </div>

              <div v-else class="table-container">
                <div class="table-wrapper">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Название</th>
                        <th>Username</th>
                        <th>Токен</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="bot in bots" :key="bot.id">
                        <td
                          class="cell-with-tooltip"
                          @mouseenter="showTooltip($event, bot.botName || 'Telegram Bot')"
                          @mouseleave="hideTooltip"
                        >
                          <span>{{ bot.botName || 'Telegram Bot' }}</span>
                        </td>
                        <td
                          class="cell-with-tooltip"
                          @mouseenter="
                            bot.botUsername && showTooltip($event, '@' + bot.botUsername)
                          "
                          @mouseleave="hideTooltip"
                        >
                          <span v-if="bot.botUsername" class="username-value">
                            @{{ bot.botUsername }}
                          </span>
                          <span v-else class="text-secondary">—</span>
                        </td>
                        <td
                          class="cell-with-tooltip token-cell"
                          @mouseenter="showTooltip($event, maskTokenFull(bot.token))"
                          @mouseleave="hideTooltip"
                        >
                          <span class="code-value">{{ maskToken(bot.token) }}</span>
                        </td>
                        <td>
                          <div class="table-actions">
                            <button
                              @click="checkWebhook(bot.id)"
                              class="btn btn-secondary btn-sm"
                              title="Проверить webhook"
                            >
                              <i class="fas fa-link"></i>
                            </button>
                            <button
                              @click="reregisterWebhook(bot.id)"
                              class="btn btn-secondary btn-sm"
                              title="Перерегистрировать webhook"
                            >
                              <i class="fas fa-sync-alt"></i>
                            </button>
                            <button
                              @click="viewWebhooks(bot.id)"
                              class="btn btn-secondary btn-sm"
                              title="Просмотр вебхуков"
                            >
                              <i class="fas fa-list"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Channels Tab -->
            <div v-if="activeTab === 'channels'" class="tab-panel">
              <div class="section-header">
                <h2 class="section-title">Каналы проекта</h2>
                <button
                  @click="loadChannels"
                  class="btn btn-secondary btn-sm"
                  :disabled="loadingChannels"
                >
                  <i v-if="loadingChannels" class="fas fa-spinner fa-spin"></i>
                  <i v-else class="fas fa-sync-alt"></i>
                  Обновить
                </button>
              </div>

              <div v-if="loadingChannels" class="loading-container-small">
                <div class="loading-spinner"></div>
                <p>Загрузка каналов...</p>
              </div>

              <div v-else-if="channelsError" class="error-container">
                <div class="error-message">
                  <i class="fas fa-exclamation-circle"></i>
                  <span>{{ channelsError }}</span>
                </div>
              </div>

              <div v-else-if="channels.length === 0" class="empty-state">
                <i class="fas fa-broadcast-tower"></i>
                <p>Нет каналов</p>
                <p class="empty-subtext">
                  Каналы появятся здесь после того, как бот начнёт получать вебхуки от Telegram
                </p>
              </div>

              <div v-else class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th>Username</th>
                      <th>Chat ID</th>
                      <th>Статус</th>
                      <th>Последняя активность</th>
                      <th>Вебхуки</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="channel in channels" :key="channel.id">
                      <td
                        class="cell-with-tooltip"
                        @mouseenter="showTooltip($event, channel.chatTitle || 'Канал без названия')"
                        @mouseleave="hideTooltip"
                      >
                        <span class="cell-content">{{
                          channel.chatTitle || 'Канал без названия'
                        }}</span>
                      </td>
                      <td>
                        <span v-if="channel.chatUsername" class="username-value"
                          >@{{ channel.chatUsername }}</span
                        >
                        <span v-else class="text-secondary">—</span>
                      </td>
                      <td
                        class="cell-with-tooltip code-value-cell"
                        @mouseenter="showTooltip($event, String(channel.chatId))"
                        @mouseleave="hideTooltip"
                      >
                        <span class="code-value">{{ channel.chatId }}</span>
                      </td>
                      <td>
                        <span
                          class="status-badge"
                          :style="{ color: formatChannelStatus(channel.chatUsername).color }"
                        >
                          <i :class="['fas', formatChannelStatus(channel.chatUsername).icon]"></i>
                          {{ formatChannelStatus(channel.chatUsername).text }}
                        </span>
                      </td>
                      <td>{{ formatDate(channel.lastSeenAt) }}</td>
                      <td>
                        <button
                          v-if="channel.botId"
                          @click="viewWebhooks(channel.botId, channel.chatId)"
                          class="btn btn-secondary btn-sm"
                          title="Просмотр вебхуков канала"
                        >
                          <i class="fas fa-code"></i>
                          Вебхуки
                        </button>
                        <span v-else class="text-secondary">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Links Tab -->
            <div v-if="activeTab === 'links'" class="tab-panel">
              <!-- Предупреждение об изменении статуса канала -->
              <Transition name="fade">
                <div v-if="statusChangeWarning.show" class="status-change-warning">
                  <div class="warning-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div class="warning-text">
                      <strong>Статус канала изменился</strong>
                      <span v-if="statusChangeWarning.channelId">
                        Канал "{{ getChannelName(statusChangeWarning.channelId) }}" изменил статус с
                        <span class="status-text">{{
                          formatBotStatus(statusChangeWarning.oldStatus).text
                        }}</span>
                        на
                        <span class="status-text">{{
                          formatBotStatus(statusChangeWarning.newStatus).text
                        }}</span>
                      </span>
                    </div>
                  </div>
                  <button @click="closeStatusChangeWarning" class="warning-close" title="Закрыть">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </Transition>

              <div class="section-header">
                <h2 class="section-title">Ссылки проекта</h2>
                <div class="section-actions">
                  <button
                    @click="openCreateLinkModal"
                    class="btn btn-primary btn-sm"
                    :disabled="channels.length === 0"
                  >
                    <i class="fas fa-plus"></i>
                    Создать ссылку
                  </button>
                  <button
                    @click="loadLinks"
                    class="btn btn-secondary btn-sm"
                    :disabled="loadingLinks"
                  >
                    <i v-if="loadingLinks" class="fas fa-spinner fa-spin"></i>
                    <i v-else class="fas fa-sync-alt"></i>
                    Обновить
                  </button>
                </div>
              </div>

              <div class="links-filter">
                <label class="filter-label">
                  <i class="fas fa-filter"></i>
                  Фильтр по каналу
                </label>
                <div class="custom-select-wrapper" ref="channelFilterRef">
                  <div
                    class="custom-select"
                    :class="{ 'custom-select-open': channelFilterOpen }"
                    @click="channelFilterOpen = !channelFilterOpen"
                  >
                    <span class="custom-select-value">{{ selectedChannelName }}</span>
                    <i
                      class="fas fa-chevron-down custom-select-arrow"
                      :class="{ 'custom-select-arrow-open': channelFilterOpen }"
                    ></i>
                  </div>
                  <div v-if="channelFilterOpen" class="custom-select-dropdown">
                    <div class="custom-select-search">
                      <i class="fas fa-search"></i>
                      <input
                        type="text"
                        v-model="channelFilterSearch"
                        @click.stop
                        @keydown.enter.prevent
                        class="custom-select-search-input"
                        placeholder="Поиск по названию..."
                      />
                    </div>
                    <div class="custom-select-options">
                      <div
                        class="custom-select-option"
                        :class="{ 'custom-select-option-selected': selectedChannelId === null }"
                        @click="selectChannel(null)"
                      >
                        Все каналы
                      </div>
                      <div
                        v-for="channel in filteredChannelsForFilter"
                        :key="channel.id"
                        class="custom-select-option"
                        :class="{
                          'custom-select-option-selected': selectedChannelId === channel.id
                        }"
                        @click="selectChannel(channel.id)"
                      >
                        {{ channel.chatTitle || channel.chatUsername || channel.chatId }}
                      </div>
                      <div
                        v-if="filteredChannelsForFilter.length === 0"
                        class="custom-select-no-results"
                      >
                        Каналы не найдены
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="loadingChannels || loadingLinks" class="loading-container-small">
                <div class="loading-spinner"></div>
                <p>{{ loadingChannels ? 'Загрузка каналов...' : 'Загрузка ссылок...' }}</p>
              </div>

              <div v-else-if="channels.length === 0" class="empty-state">
                <i class="fas fa-link"></i>
                <p>Нет каналов</p>
                <p class="empty-subtext">Сначала добавьте бота и дождитесь появления каналов</p>
              </div>

              <div v-else-if="linksError" class="error-container">
                <div class="error-message">
                  <i class="fas fa-exclamation-circle"></i>
                  <span>{{ linksError }}</span>
                </div>
              </div>

              <div v-else-if="links.length === 0" class="empty-state">
                <i class="fas fa-link"></i>
                <p>Нет ссылок</p>
                <p class="empty-subtext">Создайте первую ссылку для отслеживания переходов</p>
              </div>

              <div v-else class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th>Канал</th>
                      <th>Место размещения</th>
                      <th>Переходы</th>
                      <th>Подписки</th>
                      <th>Ссылка</th>
                      <th>Управление</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="link in links" :key="link.id">
                      <td
                        class="cell-with-tooltip"
                        @mouseenter="showTooltip($event, link.name)"
                        @mouseleave="hideTooltip"
                      >
                        <span class="cell-content">{{ link.name }}</span>
                      </td>
                      <td>
                        <div v-if="getChannelName(link.channelId)" class="channel-cell">
                          <span class="cell-content">
                            {{ getChannelName(link.channelId) }}
                          </span>
                          <span
                            v-if="getChannelStatus(link.channelId)"
                            class="status-badge status-badge-small"
                            :style="{
                              color: formatBotStatus(getChannelStatus(link.channelId)).color
                            }"
                          >
                            <i
                              :class="[
                                'fas',
                                formatBotStatus(getChannelStatus(link.channelId)).icon
                              ]"
                            ></i>
                            {{ formatBotStatus(getChannelStatus(link.channelId)).text }}
                          </span>
                        </div>
                        <span v-else class="text-secondary">—</span>
                      </td>
                      <td>
                        <a
                          v-if="link.placementUrl"
                          :href="link.placementUrl"
                          target="_blank"
                          class="text-[var(--color-primary)] hover:underline text-sm cell-content-link"
                          :title="link.placementUrl"
                        >
                          <i class="fas fa-external-link-alt mr-1"></i>
                          Открыть
                        </a>
                        <span v-else class="text-secondary">—</span>
                      </td>
                      <td>{{ link.clicksCount || 0 }}</td>
                      <td>{{ link.subscribesCount || 0 }}</td>
                      <td>
                        <button
                          @click="copyLinkToClipboard(link.id)"
                          class="btn btn-secondary btn-sm"
                          title="Копировать ссылку"
                        >
                          <i class="fas fa-copy"></i>
                          Копировать
                        </button>
                      </td>
                      <td>
                        <button
                          @click="deleteLink(link.id)"
                          class="btn btn-danger btn-sm"
                          :disabled="deletingLinkId === link.id"
                          title="Удалить ссылку"
                        >
                          <i v-if="deletingLinkId === link.id" class="fas fa-spinner fa-spin"></i>
                          <i v-else class="fas fa-trash"></i>
                          Удалить
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Members Tab -->
            <div v-if="activeTab === 'members' && canManageMembers" class="tab-panel">
              <h2 class="section-title">Участники проекта</h2>
              <div v-if="project.members && project.members.length > 0" class="members-list">
                <div v-for="member in project.members" :key="member.userId" class="member-item">
                  <div class="member-info">
                    <div class="member-role">
                      <i :class="['fas', member.role === 'owner' ? 'fa-crown' : 'fa-user']"></i>
                      <span class="role-label">{{
                        member.role === 'owner' ? 'Владелец' : 'Участник'
                      }}</span>
                    </div>
                    <div class="member-id">ID: {{ member.userId }}</div>
                  </div>
                  <button
                    v-if="member.userId !== ctx.user?.id && (isOwner || isAdmin)"
                    @click="removeMember(member.userId)"
                    class="btn btn-danger btn-sm"
                    :disabled="removingMemberId === member.userId"
                  >
                    <i v-if="removingMemberId === member.userId" class="fas fa-spinner fa-spin"></i>
                    <i v-else class="fas fa-trash"></i>
                    Удалить
                  </button>
                </div>
              </div>
              <div v-else class="empty-state">
                <i class="fas fa-users"></i>
                <p>Нет участников</p>
              </div>
            </div>

            <!-- Requests Tab -->
            <div v-if="activeTab === 'requests' && canViewRequests" class="tab-panel">
              <div class="section-header">
                <h2 class="section-title">Входящие запросы</h2>
                <button
                  @click="loadRequests"
                  class="btn btn-secondary btn-sm"
                  :disabled="loadingRequests"
                >
                  <i v-if="loadingRequests" class="fas fa-spinner fa-spin"></i>
                  <i v-else class="fas fa-sync-alt"></i>
                  Обновить
                </button>
              </div>

              <div v-if="loadingRequests" class="loading-container-small">
                <div class="loading-spinner"></div>
                <p>Загрузка заявок...</p>
              </div>

              <div v-else-if="requests.length === 0" class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>Нет входящих заявок</p>
              </div>

              <div v-else class="requests-list">
                <div v-for="request in requests" :key="request.id" class="request-item">
                  <div class="request-info">
                    <div class="request-user">
                      <i class="fas fa-user"></i>
                      <span>ID пользователя: {{ request.userId }}</span>
                    </div>
                    <div class="request-date">
                      <i class="fas fa-clock"></i>
                      <span>Подана: {{ formatDate(request.requestedAt) }}</span>
                    </div>
                  </div>
                  <div class="request-actions">
                    <button
                      @click="approveRequest(request.id)"
                      class="btn btn-success btn-sm"
                      :disabled="processingRequestId === request.id"
                    >
                      <i
                        v-if="processingRequestId === request.id"
                        class="fas fa-spinner fa-spin"
                      ></i>
                      <i v-else class="fas fa-check"></i>
                      Принять
                    </button>
                    <button
                      @click="rejectRequest(request.id)"
                      class="btn btn-danger btn-sm"
                      :disabled="processingRequestId === request.id"
                    >
                      <i
                        v-if="processingRequestId === request.id"
                        class="fas fa-spinner fa-spin"
                      ></i>
                      <i v-else class="fas fa-times"></i>
                      Отклонить
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="app-footer">
      <div class="footer-content">
        <div class="footer-left">ИП Худолей Андрей Германович</div>
        <div class="footer-center">Все права сохранены © 2025</div>
        <div class="footer-right">
          <button class="footer-link">
            Сделано с <i class="fas fa-heart footer-heart"></i> на Chatium
          </button>
        </div>
      </div>
    </footer>

    <!-- Alert Modal -->
    <AlertModal
      :show="showAlertModal"
      :message="alertMessage"
      :title="alertTitle"
      :type="alertType"
      @close="showAlertModal = false"
    />

    <!-- Confirm Modal -->
    <ConfirmModal
      :show="showConfirmModal"
      :message="confirmMessage"
      :title="confirmTitle"
      :type="confirmType"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />

    <!-- Add Token Modal -->
    <Transition name="modal">
      <div
        v-if="showAddTokenModal"
        class="modal-overlay"
        @click="addingToken ? null : closeAddTokenModal"
      >
        <div class="modal-content" @click.stop>
          <div class="modal-scanlines"></div>

          <div class="modal-header">
            <h2 class="modal-title">Ввести новый токен</h2>
            <button @click="closeAddTokenModal" class="modal-close-btn" :disabled="addingToken">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">
                <i class="fas fa-key"></i>
                Токен бота
              </label>
              <input
                v-model="newToken"
                type="text"
                class="form-input"
                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                :disabled="addingToken"
              />
              <p class="form-hint">
                Токен можно получить у
                <a href="https://t.me/BotFather" target="_blank" class="form-link">@BotFather</a>
              </p>
              <div v-if="tokenError" class="form-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>{{ tokenError }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button @click="addToken" class="modal-btn modal-btn-submit" :disabled="addingToken">
              <span v-if="addingToken">
                <i class="fas fa-spinner fa-spin"></i>
                Проверка...
              </span>
              <span v-else>Добавить</span>
            </button>
            <button
              @click="closeAddTokenModal"
              class="modal-btn modal-btn-cancel"
              :disabled="addingToken"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Create Link Modal -->
    <Transition name="modal">
      <div
        v-if="showCreateLinkModal"
        class="modal-overlay"
        @click="creatingLink ? null : closeCreateLinkModal"
      >
        <div class="modal-content" @click.stop>
          <div class="modal-scanlines"></div>

          <div class="modal-header">
            <h2 class="modal-title">Создать ссылку</h2>
            <button @click="closeCreateLinkModal" class="modal-close-btn" :disabled="creatingLink">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">
                <i class="fas fa-tag"></i>
                Название ссылки <span style="color: var(--color-accent)">*</span>
              </label>
              <input
                v-model="newLinkName"
                type="text"
                class="form-input"
                placeholder="Например: Реклама в Instagram"
                :disabled="creatingLink"
              />
              <div v-if="linkError && linkError.includes('Название')" class="form-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>{{ linkError }}</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">
                <i class="fas fa-link"></i>
                Место размещения (URL)
              </label>
              <input
                v-model="newLinkPlacementUrl"
                type="text"
                class="form-input"
                placeholder="https://example.com/page"
                :disabled="creatingLink"
              />
              <p class="form-hint">Опционально: укажите URL, где будет размещена эта ссылка</p>
            </div>

            <div class="form-group">
              <label class="form-label">
                <i class="fas fa-broadcast-tower"></i>
                Канал <span style="color: var(--color-accent)">*</span>
              </label>
              <div class="custom-select-wrapper custom-select-form" ref="modalChannelDropdownRef">
                <div
                  class="custom-select form-input"
                  :class="{
                    'custom-select-open': modalChannelDropdownOpen,
                    'form-input-disabled': creatingLink
                  }"
                  @click="!creatingLink && (modalChannelDropdownOpen = !modalChannelDropdownOpen)"
                  :style="{
                    cursor: creatingLink ? 'not-allowed' : 'pointer',
                    opacity: creatingLink ? 0.6 : 1
                  }"
                >
                  <span class="custom-select-value">{{ selectedModalChannelName }}</span>
                  <i
                    class="fas fa-chevron-down custom-select-arrow"
                    :class="{ 'custom-select-arrow-open': modalChannelDropdownOpen }"
                  ></i>
                </div>
                <div
                  v-if="modalChannelDropdownOpen && !creatingLink"
                  class="custom-select-dropdown"
                >
                  <div class="custom-select-search">
                    <i class="fas fa-search"></i>
                    <input
                      type="text"
                      v-model="modalChannelSearch"
                      @click.stop
                      @keydown.enter.prevent
                      class="custom-select-search-input"
                      placeholder="Поиск по названию..."
                    />
                  </div>
                  <div class="custom-select-options">
                    <div
                      v-for="channel in filteredChannelsForModal"
                      :key="channel.id"
                      class="custom-select-option"
                      :class="{ 'custom-select-option-selected': newLinkChannelId === channel.id }"
                      @click="selectModalChannel(channel.id)"
                    >
                      {{ channel.chatTitle || channel.chatUsername || channel.chatId }}
                    </div>
                    <div
                      v-if="filteredChannelsForModal.length === 0"
                      class="custom-select-no-results"
                    >
                      Каналы не найдены
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="linkError && linkError.includes('канал')" class="form-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>{{ linkError }}</span>
              </div>
            </div>

            <div v-if="newLinkChannelId && needsBotSelection(newLinkChannelId)" class="form-group">
              <label class="form-label">
                <i class="fas fa-robot"></i>
                Бот <span style="color: var(--color-accent)">*</span>
              </label>
              <select v-model="newLinkBotId" class="form-input" :disabled="creatingLink">
                <option :value="null">Выберите бота</option>
                <option
                  v-for="bot in getBotsForChannel(newLinkChannelId)"
                  :key="bot.id"
                  :value="bot.id"
                >
                  {{ bot.botName || bot.botUsername || bot.id }}
                </option>
              </select>
              <div v-if="linkError && linkError.includes('бот')" class="form-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>{{ linkError }}</span>
              </div>
            </div>

            <div
              v-if="
                linkError &&
                !linkError.includes('Название') &&
                !linkError.includes('канал') &&
                !linkError.includes('бот')
              "
              class="form-error"
            >
              <i class="fas fa-exclamation-circle"></i>
              <span>{{ linkError }}</span>
            </div>
          </div>

          <div class="modal-footer">
            <button @click="createLink" class="modal-btn modal-btn-submit" :disabled="creatingLink">
              <span v-if="creatingLink">
                <i class="fas fa-spinner fa-spin"></i>
                Создание...
              </span>
              <span v-else>Создать</span>
            </button>
            <button
              @click="closeCreateLinkModal"
              class="modal-btn modal-btn-cancel"
              :disabled="creatingLink"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Edit Name Modal -->
    <Transition name="modal">
      <div
        v-if="showEditNameModal"
        class="modal-overlay"
        @click="editingName ? null : closeEditNameModal"
      >
        <div class="modal-content" @click.stop>
          <div class="modal-scanlines"></div>

          <div class="modal-header">
            <h2 class="modal-title">Редактировать название проекта</h2>
            <button @click="closeEditNameModal" class="modal-close-btn" :disabled="editingName">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">
                <i class="fas fa-tag"></i>
                Название <span style="color: var(--color-accent)">*</span>
              </label>
              <input
                v-model="editName"
                type="text"
                class="form-input"
                placeholder="Введите название проекта"
                :disabled="editingName"
                @keyup.enter="saveProjectName"
              />
              <div v-if="editError" class="form-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>{{ editError }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button
              @click="saveProjectName"
              class="modal-btn modal-btn-submit"
              :disabled="editingName"
            >
              <span v-if="editingName">
                <i class="fas fa-spinner fa-spin"></i>
                Сохранение...
              </span>
              <span v-else>Сохранить</span>
            </button>
            <button
              @click="closeEditNameModal"
              class="modal-btn modal-btn-cancel"
              :disabled="editingName"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Edit Description Modal -->
    <Transition name="modal">
      <div
        v-if="showEditDescriptionModal"
        class="modal-overlay"
        @click="editingDescription ? null : closeEditDescriptionModal"
      >
        <div class="modal-content" @click.stop>
          <div class="modal-scanlines"></div>

          <div class="modal-header">
            <h2 class="modal-title">Редактировать описание проекта</h2>
            <button
              @click="closeEditDescriptionModal"
              class="modal-close-btn"
              :disabled="editingDescription"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">
                <i class="fas fa-align-left"></i>
                Описание
              </label>
              <textarea
                v-model="editDescription"
                class="form-input"
                placeholder="Введите описание проекта (необязательно)"
                :disabled="editingDescription"
                rows="4"
              ></textarea>
              <div v-if="editError" class="form-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>{{ editError }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button
              @click="saveProjectDescription"
              class="modal-btn modal-btn-submit"
              :disabled="editingDescription"
            >
              <span v-if="editingDescription">
                <i class="fas fa-spinner fa-spin"></i>
                Сохранение...
              </span>
              <span v-else>Сохранить</span>
            </button>
            <button
              @click="closeEditDescriptionModal"
              class="modal-btn modal-btn-cancel"
              :disabled="editingDescription"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Transfer Ownership Modal -->
    <Transition name="modal">
      <div
        v-if="showTransferOwnershipModal"
        class="modal-overlay"
        @click="transferringOwnership ? null : closeTransferOwnershipModal"
      >
        <div class="modal-content" @click.stop>
          <div class="modal-scanlines"></div>

          <div class="modal-header">
            <h2 class="modal-title">Передать права владельца</h2>
            <button
              @click="closeTransferOwnershipModal"
              class="modal-close-btn"
              :disabled="transferringOwnership"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">
                <i class="fas fa-user-crown"></i>
                Новый владелец <span style="color: var(--color-accent)">*</span>
              </label>
              <select
                v-model="transferOwnershipUserId"
                class="form-input"
                :disabled="transferringOwnership"
              >
                <option :value="null">Выберите участника</option>
                <option
                  v-for="member in availableMembersForTransfer"
                  :key="member.userId"
                  :value="member.userId"
                >
                  ID: {{ member.userId }} ({{ member.role === 'owner' ? 'Владелец' : 'Участник' }})
                </option>
              </select>
              <p class="form-hint">После передачи прав вы станете обычным участником проекта</p>
              <div v-if="editError" class="form-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>{{ editError }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button
              @click="transferOwnership"
              class="modal-btn modal-btn-submit"
              :disabled="transferringOwnership || !transferOwnershipUserId"
            >
              <span v-if="transferringOwnership">
                <i class="fas fa-spinner fa-spin"></i>
                Передача...
              </span>
              <span v-else>Передать права</span>
            </button>
            <button
              @click="closeTransferOwnershipModal"
              class="modal-btn modal-btn-cancel"
              :disabled="transferringOwnership"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Tooltip -->
    <Transition name="tooltip">
      <div
        v-if="tooltip.show"
        class="custom-tooltip"
        :style="{ left: tooltip.x + 'px', top: tooltip.y - 10 + 'px' }"
      >
        {{ tooltip.text }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
:root {
  --color-bg: #0a0a0a;
  --color-bg-secondary: #141414;
  --color-bg-tertiary: #1a1a1a;
  --color-text: #e8e8e8;
  --color-text-secondary: #a0a0a0;
  --color-text-tertiary: #707070;
  --color-border: #2a2a2a;
  --color-border-light: #3a3a3a;
  --color-accent: #d3234b;
  --color-accent-hover: #e6395f;
  --color-accent-light: rgba(211, 35, 75, 0.15);
  --transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

/* App Layout */
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  position: relative;
}

.content-wrapper {
  flex: 1;
  min-height: 0;
  padding: 3rem 0;
}

.content-inner {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.loading-container,
.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  flex-direction: column;
  gap: 1rem;
}

.loading-container-small {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  flex-direction: column;
  gap: 1rem;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: rgba(211, 35, 75, 0.1);
  border: 2px solid var(--color-accent);
  color: var(--color-accent);
  font-size: 1rem;
}

.project-detail {
  width: 100%;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 2rem;
}

.project-header-content {
  flex: 1;
}

.project-title {
  font-size: 2rem;
  font-weight: 400;
  margin: 0 0 0.75rem 0;
  color: var(--color-text);
  letter-spacing: 0.05em;
}

.project-description {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin: 0 0 1rem 0;
  line-height: 1.6;
}

.project-meta {
  display: flex;
  gap: 1.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
}

.meta-item i {
  color: var(--color-accent);
}

.btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  font-size: 0.9375rem;
  cursor: pointer;
  transition: var(--transition);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}

.btn-primary {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-primary:hover {
  background: var(--color-accent-light);
  border-color: var(--color-accent-hover);
}

.btn-secondary {
  border-color: var(--color-border);
  color: var(--color-text-secondary);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--color-border-light);
  color: var(--color-text);
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-success {
  border-color: #4ade80;
  color: #4ade80;
}

.btn-success:hover {
  background: rgba(74, 222, 128, 0.1);
  border-color: #22c55e;
}

.btn-danger {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-danger:hover {
  background: var(--color-accent-light);
  border-color: var(--color-accent-hover);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid var(--color-border);
  margin-bottom: 2rem;
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.tabs::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.tab {
  padding: 0.75rem 1.5rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  white-space: nowrap;
}

.tab:hover {
  color: var(--color-text);
}

.tab-active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.tab-badge {
  background: var(--color-accent);
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
}

.tab-content {
  min-height: 400px;
}

.tab-panel {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 400;
  margin: 0;
  color: var(--color-text);
  letter-spacing: 0.05em;
}

.section-description {
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0;
}

.info-section {
  background: var(--color-bg-secondary);
  border: 2px solid var(--color-border);
  padding: 2rem;
  clip-path: polygon(
    0 4px,
    4px 4px,
    4px 0,
    calc(100% - 4px) 0,
    calc(100% - 4px) 4px,
    100% 4px,
    100% calc(100% - 4px),
    calc(100% - 4px) calc(100% - 4px),
    calc(100% - 4px) 100%,
    4px 100%,
    4px calc(100% - 4px),
    0 calc(100% - 4px)
  );
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.03em;
}

.info-value {
  font-size: 1rem;
  color: var(--color-text);
}

.info-value-code {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: var(--color-accent);
  word-break: break-all;
}

.members-list,
.requests-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.member-item,
.request-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: var(--color-bg-secondary);
  border: 2px solid var(--color-border);
  clip-path: polygon(
    0 4px,
    4px 4px,
    4px 0,
    calc(100% - 4px) 0,
    calc(100% - 4px) 4px,
    100% 4px,
    100% calc(100% - 4px),
    calc(100% - 4px) calc(100% - 4px),
    calc(100% - 4px) 100%,
    4px 100%,
    4px calc(100% - 4px),
    0 calc(100% - 4px)
  );
}

.member-info,
.request-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.member-role {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text);
  font-size: 1rem;
}

.member-role i {
  color: var(--color-accent);
}

.role-label {
  font-weight: 500;
}

.member-id {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  font-family: 'Courier New', monospace;
}

.request-user,
.request-date {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text);
  font-size: 0.9375rem;
}

.request-user i,
.request-date i {
  color: var(--color-accent);
}

.request-date {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.request-actions {
  display: flex;
  gap: 0.75rem;
}

.table-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  white-space: nowrap;
  overflow: visible;
}

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--color-text-secondary);
}

.empty-state i {
  font-size: 4rem;
  color: var(--color-text-tertiary);
  margin-bottom: 1.5rem;
  display: block;
}

.empty-subtext {
  font-size: 0.875rem;
  color: var(--color-text-tertiary);
  margin-top: 0.5rem;
}

.table-container {
  background: var(--color-bg-secondary);
  border: 2px solid var(--color-border);
  padding: 1.5rem;
  clip-path: polygon(
    0 4px,
    4px 4px,
    4px 0,
    calc(100% - 4px) 0,
    calc(100% - 4px) 4px,
    100% 4px,
    100% calc(100% - 4px),
    calc(100% - 4px) calc(100% - 4px),
    calc(100% - 4px) 100%,
    4px 100%,
    4px calc(100% - 4px),
    0 calc(100% - 4px)
  );
  position: relative;
  width: 100%;
  box-sizing: border-box;
  display: block;
}

.table-wrapper {
  width: 100%;
  overflow: hidden;
}

/* Специфичные стили для таблицы ботов (4 колонки) */
.table-wrapper .data-table th:nth-child(1),
.table-wrapper .data-table td:nth-child(1) {
  width: 30%;
}

.table-wrapper .data-table th:nth-child(2),
.table-wrapper .data-table td:nth-child(2) {
  width: 20%;
}

.table-wrapper .data-table th:nth-child(3),
.table-wrapper .data-table td:nth-child(3) {
  width: 30%;
}

.table-wrapper .data-table th:nth-child(4),
.table-wrapper .data-table td:nth-child(4) {
  width: 20%;
  text-align: left;
}

.data-table {
  width: 100%;
  min-width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  display: table;
  table-layout: fixed;
}

.data-table thead {
  background: rgba(0, 0, 0, 0.3);
  width: 100%;
  display: table-header-group;
}

.data-table tbody {
  width: 100%;
  display: table-row-group;
}

.data-table th {
  padding: 1rem;
  text-align: left;
  color: var(--color-text);
  font-weight: 400;
  letter-spacing: 0.03em;
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
  box-sizing: border-box;
}

.data-table colgroup,
.data-table col {
  display: table-column;
}

.data-table th:nth-child(1),
.data-table td:nth-child(1) {
  width: 20%;
  overflow: hidden;
}

.data-table th:nth-child(2),
.data-table td:nth-child(2) {
  width: 12%;
}

.data-table th:nth-child(3),
.data-table td:nth-child(3) {
  width: 18%;
  overflow: hidden;
}

.data-table th:nth-child(4),
.data-table td:nth-child(4) {
  width: 12%;
  text-align: center;
}

.data-table th:nth-child(5),
.data-table td:nth-child(5) {
  width: 12%;
  text-align: center;
}

.data-table th:nth-child(6),
.data-table td:nth-child(6) {
  width: 15%;
  min-width: 140px;
  overflow: visible;
  white-space: nowrap;
}

.data-table th:nth-child(7),
.data-table td:nth-child(7) {
  width: 15%;
  min-width: 130px;
  overflow: visible;
  white-space: nowrap;
}

.data-table td {
  padding: 1rem;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
  position: relative;
  box-sizing: border-box;
}

.data-table td .cell-content {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  width: 100%;
}

.data-table td .cell-content-link {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-table tbody tr:hover {
  background: rgba(211, 35, 75, 0.05);
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.code-value {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: var(--color-accent);
  letter-spacing: 0.05em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  max-width: 100%;
}

.code-value-cell {
  overflow: hidden;
  max-width: 100%;
}

.code-value-cell .code-value {
  display: block;
  width: 100%;
  min-width: 0;
}

.username-value {
  color: var(--color-accent);
  font-family: 'Courier New', monospace;
  letter-spacing: 0.05em;
}

.cell-with-tooltip {
  position: relative;
  cursor: help;
}

.data-table td.token-cell {
  padding-left: 1.25rem;
  padding-right: 0.75rem;
}

.custom-tooltip {
  position: fixed;
  transform: translate(-50%, calc(-100% - 0.75rem));
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 2px solid var(--color-accent);
  color: var(--color-text);
  font-size: 0.875rem;
  font-family: 'Courier New', monospace;
  white-space: nowrap;
  z-index: 10000;
  pointer-events: none;
  box-shadow:
    0 0 20px rgba(211, 35, 75, 0.4),
    0 0 40px rgba(211, 35, 75, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}

.custom-tooltip::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid var(--color-accent);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 400;
  letter-spacing: 0.02em;
}

.status-badge i {
  font-size: 0.875rem;
}

.status-badge-small {
  font-size: 0.75rem;
  gap: 0.25rem;
  margin-left: 0.5rem;
}

.status-badge-small i {
  font-size: 0.75rem;
}

.channel-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.status-change-warning {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: rgba(245, 158, 11, 0.1);
  border: 2px solid #f59e0b;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.warning-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.warning-content i {
  color: #f59e0b;
  font-size: 1.25rem;
}

.warning-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: var(--color-text);
  font-size: 0.9375rem;
}

.warning-text strong {
  color: #f59e0b;
  font-weight: 600;
}

.warning-text .status-text {
  font-weight: 600;
  color: var(--color-accent);
}

.warning-close {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.25s ease;
}

.warning-close:hover {
  color: var(--color-text);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.tooltip-enter-active {
  transition:
    opacity 0.2s ease-out,
    transform 0.2s ease-out;
}

.tooltip-leave-active {
  transition:
    opacity 0.15s ease-in,
    transform 0.15s ease-in;
}

.tooltip-enter-from {
  opacity: 0;
  transform: translate(-50%, calc(-100% - 1rem));
}

.tooltip-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-100% - 1rem));
}

.text-secondary {
  color: var(--color-text-secondary);
}

.links-filter {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: transparent;
  border: 2px solid transparent;
  overflow: visible;
  position: relative;
}

.links-filter::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-bg-secondary);
  border: 2px solid var(--color-border);
  clip-path: polygon(
    0 4px,
    4px 4px,
    4px 0,
    calc(100% - 4px) 0,
    calc(100% - 4px) 4px,
    100% 4px,
    100% calc(100% - 4px),
    calc(100% - 4px) calc(100% - 4px),
    calc(100% - 4px) 100%,
    4px 100%,
    4px calc(100% - 4px),
    0 calc(100% - 4px)
  );
  z-index: 0;
  pointer-events: none;
}

.links-filter > * {
  position: relative;
  z-index: 1;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: var(--color-text);
  font-size: 0.9375rem;
  letter-spacing: 0.03em;
}

.filter-label i {
  color: var(--color-accent);
}

.custom-select-wrapper {
  position: relative;
  width: 100%;
}

.custom-select-form .custom-select {
  padding: 0.875rem 1rem;
  background: rgba(0, 0, 0, 0.3);
}

.custom-select-form .custom-select-open {
  background: rgba(0, 0, 0, 0.3);
}

.custom-select-form .form-input-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(0, 0, 0, 0.2) !important;
}

.custom-select {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #0a0a0a;
  border: 2px solid var(--color-border);
  color: var(--color-text);
  font-size: 0.9375rem;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: var(--transition);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}

.custom-select:hover {
  border-color: var(--color-border-light);
}

.custom-select-open {
  border-color: var(--color-accent);
  box-shadow: 0 0 10px rgba(211, 35, 75, 0.3);
}

.custom-select-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-select-arrow {
  color: var(--color-accent);
  font-size: 0.75rem;
  transition: transform 0.2s ease;
  margin-left: 0.5rem;
  flex-shrink: 0;
}

.custom-select-arrow-open {
  transform: rotate(180deg);
}

.custom-select-dropdown {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  background: #0a0a0a;
  border: 2px solid var(--color-border);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.custom-select-form .custom-select-dropdown {
  z-index: 100000;
}

.custom-select-form .custom-select-wrapper {
  z-index: 100000;
}

.custom-select-search {
  padding: 0.5rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #0a0a0a;
  flex-shrink: 0;
}

.custom-select-search i {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  flex-shrink: 0;
}

.custom-select-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text);
  font-size: 0.875rem;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.03em;
  padding: 0.25rem 0;
}

.custom-select-search-input::placeholder {
  color: var(--color-text-tertiary);
}

.custom-select-options {
  max-height: 12rem;
  overflow-y: auto;
  overflow-x: hidden;
}

.custom-select-options::-webkit-scrollbar {
  width: 6px;
}

.custom-select-options::-webkit-scrollbar-track {
  background: transparent;
}

.custom-select-options::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.custom-select-options::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-light);
}

.custom-select-no-results {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-family: 'Courier New', monospace;
}

.custom-select-option {
  padding: 0.75rem 1rem;
  color: var(--color-text);
  font-size: 0.9375rem;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: var(--transition);
  background: transparent;
}

.custom-select-option:hover {
  background: #141414;
  color: var(--color-text);
}

.custom-select-option-selected {
  background: #141414;
  color: var(--color-text);
  border-left: 3px solid var(--color-accent);
  padding-left: calc(1rem - 3px);
}

.custom-select-option-selected:hover {
  background: #1a1a1a;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  padding: 1rem;
}

.modal-content {
  padding: 0;
  max-width: 600px;
  width: 100%;
  position: relative;
  overflow: visible;
}

.modal-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 2px solid var(--color-accent);
  box-shadow:
    0 0 40px rgba(211, 35, 75, 0.4),
    0 0 80px rgba(211, 35, 75, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  clip-path: polygon(
    0 4px,
    4px 4px,
    4px 0,
    calc(100% - 4px) 0,
    calc(100% - 4px) 4px,
    100% 4px,
    100% calc(100% - 4px),
    calc(100% - 4px) calc(100% - 4px),
    calc(100% - 4px) 100%,
    4px 100%,
    4px calc(100% - 4px),
    0 calc(100% - 4px)
  );
  z-index: 0;
  pointer-events: none;
}

/* Modal transitions */
.modal-enter-active {
  transition: opacity 0.3s ease-out;
}

.modal-leave-active {
  transition: opacity 0.3s ease-in;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content {
  animation: modal-appear 0.4s cubic-bezier(0.34, 1.3, 0.64, 1);
}

.modal-leave-active .modal-content {
  animation: modal-disappear 0.4s cubic-bezier(0.34, 1.3, 0.64, 1);
}

@keyframes modal-appear {
  from {
    transform: scale(0.8) translateY(20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

@keyframes modal-disappear {
  from {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
  to {
    transform: scale(0.8) translateY(20px);
    opacity: 0;
  }
}

.modal-scanlines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 1;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2rem 2.5rem;
  border-bottom: 1px solid var(--color-border);
  position: relative;
  z-index: 1;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--color-text);
  margin: 0;
  letter-spacing: 0.08em;
  text-shadow:
    0 0 10px rgba(232, 232, 232, 0.4),
    0 0 20px rgba(211, 35, 75, 0.2);
}

.modal-close-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 0;
  background: transparent;
  border: 2px solid var(--color-border);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition);
  position: relative;
  overflow: hidden;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}

.modal-close-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.12) 0px,
    rgba(0, 0, 0, 0.12) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 0;
}

.modal-close-btn i {
  position: relative;
  z-index: 2;
}

.modal-close-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: rgba(211, 35, 75, 0.1);
}

.modal-body {
  padding: 2rem 2.5rem;
  position: relative;
  z-index: 100;
  overflow: visible;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative;
  z-index: 1;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  color: var(--color-text);
  letter-spacing: 0.03em;
}

.form-label i {
  color: var(--color-accent);
}

.form-input {
  padding: 0.875rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid var(--color-border);
  color: var(--color-text);
  font-size: 0.9375rem;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.05em;
  transition: var(--transition);
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}

.form-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 10px rgba(211, 35, 75, 0.3);
}

.form-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(0, 0, 0, 0.2);
}

.form-input::placeholder {
  color: var(--color-text-tertiary);
}

.form-input textarea,
textarea.form-input {
  resize: vertical;
  min-height: 100px;
  font-family: 'Courier New', monospace;
}

.form-hint {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin: 0;
  letter-spacing: 0.02em;
}

.form-link {
  color: var(--color-accent);
  text-decoration: none;
  transition: color 0.25s ease;
}

.form-link:hover {
  color: var(--color-accent-hover);
  text-decoration: underline;
}

.form-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(211, 35, 75, 0.1);
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
  font-size: 0.875rem;
  margin-top: 0.5rem;
  clip-path: polygon(
    0 2px,
    2px 2px,
    2px 0,
    calc(100% - 2px) 0,
    calc(100% - 2px) 2px,
    100% 2px,
    100% calc(100% - 2px),
    calc(100% - 2px) calc(100% - 2px),
    calc(100% - 2px) 100%,
    2px 100%,
    2px calc(100% - 2px),
    0 calc(100% - 2px)
  );
}

.form-error i {
  flex-shrink: 0;
}

.form-error span {
  flex: 1;
}

.modal-footer {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1.5rem 2.5rem;
  border-top: 1px solid var(--color-border);
  position: relative;
  z-index: 1;
}

.modal-btn {
  min-width: 120px;
  padding: 0.875rem 2rem;
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: 0.05em;
  border: 2px solid;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}

.modal-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.12) 0px,
    rgba(0, 0, 0, 0.12) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 0;
}

.modal-btn span,
.modal-btn {
  position: relative;
  z-index: 2;
}

.modal-btn-cancel {
  color: var(--color-text-secondary);
  border-color: var(--color-border-light);
}

.modal-btn-cancel:hover {
  color: var(--color-text);
  border-color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.05);
}

.modal-btn-submit {
  color: var(--color-accent);
  border-color: var(--color-accent);
  box-shadow: 0 0 10px rgba(211, 35, 75, 0.3);
}

.modal-btn-submit:hover:not(:disabled) {
  background: var(--color-accent);
  color: white;
  box-shadow:
    0 0 20px rgba(211, 35, 75, 0.6),
    0 0 40px rgba(211, 35, 75, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.modal-btn-submit:disabled {
  opacity: 0.6;
  cursor: wait;
}

.app-footer {
  background: transparent;
  padding: 1.5rem 0;
  flex-shrink: 0;
  position: relative;
  z-index: 200;
  margin-top: auto;
}

/* Terminal-style corner brackets for footer */
.app-footer::before {
  content: '';
  position: absolute;
  bottom: 10px;
  left: 10px;
  width: 20px;
  height: 20px;
  border-left: 2px solid rgba(211, 35, 75, 0.3);
  border-bottom: 2px solid rgba(211, 35, 75, 0.3);
  pointer-events: none;
}

.app-footer::after {
  content: '';
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 20px;
  height: 20px;
  border-right: 2px solid rgba(211, 35, 75, 0.3);
  border-bottom: 2px solid rgba(211, 35, 75, 0.3);
  pointer-events: none;
}

.footer-content {
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.03em;
  position: relative;
}

.footer-left:hover,
.footer-center:hover {
  animation: glitch-footer 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

@keyframes glitch-footer {
  0%,
  100% {
    transform: translate(0);
    text-shadow: none;
  }
  10% {
    transform: translate(-1.5px, 0);
    text-shadow:
      1px 0 #ff00ff,
      -1px 0 #00ffff;
  }
  20% {
    transform: translate(1.5px, 0);
    text-shadow:
      -1px 0 #ff00ff,
      1px 0 #00ffff;
  }
  30% {
    transform: translate(-1px, 0);
    text-shadow:
      1.5px 0 #ff00ff,
      -1.5px 0 #00ffff;
  }
  40% {
    transform: translate(1px, 0);
    text-shadow:
      -1.5px 0 #ff00ff,
      1.5px 0 #00ffff;
  }
  50% {
    transform: translate(-1.5px, 0);
    text-shadow:
      1px 0 #ff00ff,
      -1px 0 #00ffff;
  }
  60% {
    transform: translate(1.5px, 0);
    text-shadow:
      -1px 0 #ff00ff,
      1px 0 #00ffff;
  }
  70% {
    transform: translate(-1px, 0);
    text-shadow:
      1px 0 #ff00ff,
      -1px 0 #00ffff;
  }
  80% {
    transform: translate(1px, 0);
    text-shadow:
      -1px 0 #ff00ff,
      1px 0 #00ffff;
  }
  90% {
    transform: translate(-0.5px, 0);
    text-shadow:
      0.5px 0 #ff00ff,
      -0.5px 0 #00ffff;
  }
}

.footer-left {
  flex: 1;
  text-align: left;
  color: var(--color-text-secondary);
}

.footer-center {
  flex: 0 0 auto;
  text-align: center;
  color: var(--color-text-secondary);
}

.footer-right {
  flex: 1;
  text-align: right;
}

.footer-link {
  color: var(--color-text-secondary);
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.25s ease;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  position: relative;
  z-index: 10;
}

.footer-link:hover {
  color: var(--color-text);
  animation: glitch-footer 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

.footer-heart {
  color: #dd3057;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .project-header {
    flex-direction: column;
  }

  .tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .member-item,
  .request-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .request-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
