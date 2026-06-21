<script setup lang="ts">
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onBeforeMount,
  onBeforeUnmount,
  nextTick
} from 'vue'
import { nanoid } from '@app/nanoid'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { post } from './fetchers/messages'
import { provideExistingChatScreen } from './contexts/ChatScreenContext'
import { provideNavigator } from '../AppUiPresenter/NavigatorContext'
import Footer from './components/Footer.vue'
import Messages, { Message } from './components/Messages.vue'

const messagesRef = ref<InstanceType<typeof Messages> | null>(null)
import type { ContextMenuItem } from './components/ContextMenu.vue'
import { ChatiumJsonChatScreen, ChatScreenStore } from './contexts/ChatScreenContext'
import {
  apiChatBanUserRoute,
  apiChatUnbanUserRoute,
  apiChatDeleteAllUserMessagesRoute,
  apiChatDeleteMessageRoute,
  apiChatDeleteOwnMessageRoute,
  apiChatUserSocketRoute,
  apiChatRateLimitStatusRoute,
  apiChatCheckMyBanRoute,
  apiChatGetBansRoute,
  apiChatGetAdminIdsRoute
} from '../../api/chat-admin-routes'

interface ChatScreenProps {
  screen: ChatiumJsonChatScreen
  messageGrouping?: boolean
  isAdmin?: boolean
  episodeId?: string
  currentTimeSeconds?: number
  chatAccessMode?: string
  onlineCount?: number
  hideCta?: boolean
  paidFormIds?: string[]
  enableReplies?: boolean
  enableReactions?: boolean
}

const props = defineProps<ChatScreenProps>()

const emit = defineEmits<{
  (e: 'messageSent'): void
  (e: 'openForm', formType: string): void
  (e: 'newIncomingMessage'): void
}>()

const store = reactive<ChatScreenStore>({
  chat: props.screen,
  messages: [],
  lastChangeId: null,
  lastReadAt: null,
  socketStore: null,
  isAdmin: props.isAdmin ?? false,
  episodeId: props.episodeId ?? '',
  adminIds: [],
  hideCta: props.hideCta ?? false,
  paidFormIds: props.paidFormIds ?? [],
  enableReplies: props.enableReplies ?? true,
  enableReactions: props.enableReactions ?? true
})

provideExistingChatScreen(store)

getOrCreateBrowserSocketClient().then((socketStore) => {
  store.socketStore = socketStore
})

const text = ref('')
const replyMessage = ref<Message | null>(null)
const footerFocusTrigger = ref(false)
const rateLimitBlockedUntil = ref<number | null>(null)
const banState = ref<{
  banned: boolean
  type?: string
  expiresAt?: number | null
  reason?: string
}>({ banned: false })

const ctxMenuMessageId = ref<string | null>(null)
const ctxMenuMessage = ref<Message | null>(null)

function closeCtxMenu() {
  ctxMenuMessageId.value = null
  ctxMenuMessage.value = null
}

async function banUser(duration?: number) {
  const authorId = ctxMenuMessage.value?.author?.id
  if (!authorId || !props.episodeId) return
  try {
    await apiChatBanUserRoute({ userId: authorId }).run(ctx, {
      episodeId: props.episodeId,
      duration: duration ?? undefined
    })
  } catch (e) {
    console.error('Ban failed:', e)
  }
}

async function unbanUser() {
  const authorId = ctxMenuMessage.value?.author?.id
  if (!authorId || !props.episodeId) return
  try {
    await apiChatUnbanUserRoute({ userId: authorId }).run(ctx, {
      episodeId: props.episodeId
    })
  } catch (e) {
    console.error('Unban failed:', e)
  }
}

async function deleteAllUserMessages() {
  const authorId = ctxMenuMessage.value?.author?.id
  if (!authorId || !props.episodeId) return
  try {
    await apiChatDeleteAllUserMessagesRoute({ userId: authorId }).run(ctx, {
      episodeId: props.episodeId
    })
  } catch (e) {
    console.error('Delete all messages failed:', e)
  }
}

async function deleteMessage() {
  const messageId = ctxMenuMessage.value?.id
  if (!messageId || !props.episodeId) return
  try {
    await apiChatDeleteMessageRoute({ messageId }).run(ctx, {
      episodeId: props.episodeId
    })
    store.messages = store.messages.filter((m) => m.id !== messageId)
  } catch (e) {
    console.error('Delete message failed:', e)
  }
}

async function deleteOwnMessage() {
  const messageId = ctxMenuMessage.value?.id
  if (!messageId || !props.episodeId) return
  try {
    await apiChatDeleteOwnMessageRoute({ messageId }).run(ctx, {
      episodeId: props.episodeId
    })
    store.messages = store.messages.filter((m) => m.id !== messageId)
  } catch (e) {
    console.error('Delete own message failed:', e)
  }
}

const ctxMenuUserBanned = ref(false)

async function onOpenContextMenu(data: { message: Message }) {
  ctxMenuUserBanned.value = false
  ctxMenuMessage.value = data.message
  ctxMenuMessageId.value = data.message.id

  if (data.message?.author?.id && props.episodeId) {
    try {
      const bans = await apiChatGetBansRoute({ episodeId: props.episodeId }).run(ctx)
      ctxMenuUserBanned.value = bans.some(
        (b: any) => b.user === data.message.author?.id || b.user?.id === data.message.author?.id
      )
    } catch (e) {}
  }
}

const ctxMenuItems = computed<ContextMenuItem[]>(() => {
  const items: ContextMenuItem[] = []
  const isMyMessage =
    ctxMenuMessage.value?.isOutgoing || ctxMenuMessage.value?.author?.id === ctx.user?.id

  if (isMyMessage && !store.isAdmin) {
    items.push({
      label: 'Удалить сообщение',
      icon: 'fas fa-xmark',
      danger: true,
      action: deleteOwnMessage
    })
    return items
  }

  if (store.isAdmin) {
    if (isMyMessage) {
      items.push({
        label: 'Удалить сообщение',
        icon: 'fas fa-xmark',
        danger: true,
        action: deleteMessage
      })
      return items
    }

    if (ctxMenuUserBanned.value) {
      items.push({
        label: 'Разблокировать',
        icon: 'fas fa-unlock',
        action: unbanUser
      })
    }

    items.push({
      label: 'Заблокировать',
      icon: 'fas fa-ban',
      danger: true,
      children: [
        { label: 'На 5 минут', icon: 'fas fa-clock', action: () => banUser(5) },
        { label: 'На 30 минут', icon: 'fas fa-clock', action: () => banUser(30) },
        { label: 'На 1 час', icon: 'fas fa-clock', action: () => banUser(60) },
        { label: 'Навсегда', icon: 'fas fa-infinity', danger: true, action: () => banUser() }
      ]
    })

    items.push({
      label: 'Удалить все сообщения',
      icon: 'fas fa-trash-can',
      danger: true,
      action: deleteAllUserMessages
    })

    items.push({
      label: 'Удалить сообщение',
      icon: 'fas fa-xmark',
      danger: true,
      action: deleteMessage
    })
  }

  return items
})

let messagesSocketDisposer: (() => void) | null = null
let reactionsSocketDisposer: (() => void) | null = null
let userSocketSubscription: any = null

function isInjectedScenarioMessage(message: any) {
  return Boolean(
    message?.data?.__isScenarioMessage ||
      message?.id?.startsWith?.('fake_') ||
      message?.id?.startsWith?.('fake_banner_')
  )
}

async function fetchMessages() {
  if (props.screen?.messages_get_url) {
    interface MessagesGetResponse {
      success: boolean
      data: {
        messages: Message[]
        lastChangeId: string
      }
    }

    const response = await fetch(props.screen?.messages_get_url)
    const body = (await response.json()) as MessagesGetResponse

    // Сохраняем фейковые сообщения (из HybridChatScreen)
    const fakeMessages = store.messages.filter((m) => isInjectedScenarioMessage(m))

    // Объединяем фейковые + реальные из API
    store.messages = [...fakeMessages, ...body.data.messages]

    // Сортируем по времени создания
    store.messages.sort(
      (a, b) =>
        (a.createdAtTimestamp || a.createdAt || 0) - (b.createdAtTimestamp || b.createdAt || 0)
    )

    store.lastChangeId = body.data.lastChangeId
  }
}

async function fetchChanges() {
  if (props.screen?.messages_changes_url) {
    interface MessagesChangesResponse {
      success: boolean
      changes: any[]
    }

    const response = await fetch(
      props.screen?.messages_changes_url +
        (store.lastChangeId
          ? (props.screen?.messages_changes_url.includes('?') ? '&' : '?') +
            'lastKnownChangeId=' +
            store.lastChangeId
          : '')
    )
    const body = (await response.json()) as MessagesChangesResponse

    if (body.success === true) {
      const { changes } = body

      if (changes.length > 0 && changes[0].prevId === store.lastChangeId) {
        changes.forEach((change) => {
          if (change.operation === 'create') {
            const existsMessage = store.messages.find((message) => message.id === change.messageId)

            if (!existsMessage) {
              store.messages.push(change.message)
              const isOwn = change.message.isOutgoing || change.message.author?.id === ctx.user?.id
              if (!isOwn) {
                emit('newIncomingMessage')
              }
            }
          } else if (change.operation === 'update') {
            const messageIndex = store.messages.findIndex(
              (message) => message.id === change.messageId
            )

            if (messageIndex !== -1) {
              store.messages[messageIndex] = {
                ...store.messages[messageIndex],
                text: change.message.text,
                updatedAt: change.message.updatedAt
              }
            }
          } else if (change.operation === 'delete') {
            store.messages = store.messages.filter((message) => message.id !== change.messageId)
          }
        })

        store.lastChangeId = changes[changes.length - 1].id
      } else if (changes.length > 0) {
        // Recover from missed changes by refetching current feed state.
        await fetchMessages()
      }
    }
  }
}

async function messagesSocketHandler() {
  await fetchChanges()
}

async function subscribeToUserSocket() {
  if (!props.episodeId || !ctx.user?.id) return

  try {
    const { encodedSocketId } = await apiChatUserSocketRoute({ episodeId: props.episodeId }).run(
      ctx
    )
    if (!encodedSocketId) return

    const socketClient = await getOrCreateBrowserSocketClient()
    userSocketSubscription = socketClient.subscribeToData(encodedSocketId)
    userSocketSubscription.listen((msg: any) => {
      if (msg.type === 'rate_limit') {
        rateLimitBlockedUntil.value = msg.blockedUntil
      }
      if (msg.type === 'ban') {
        rateLimitBlockedUntil.value = null
        banState.value = {
          banned: true,
          type: msg.banType,
          expiresAt: msg.expiresAt || null,
          reason: msg.reason
        }
      }
      if (msg.type === 'unban') {
        banState.value = { banned: false }
        rateLimitBlockedUntil.value = null
      }
    })
  } catch (e) {
    console.error('Failed to subscribe to user socket:', e)
  }
}

async function checkRateLimitStatus() {
  if (!props.episodeId || !ctx.user?.id) return

  try {
    const status = await apiChatRateLimitStatusRoute({ episodeId: props.episodeId }).run(ctx)
    if (status.limited && status.blockedUntil) {
      rateLimitBlockedUntil.value = status.blockedUntil
    }
  } catch (e) {
    console.error('Failed to check rate limit status:', e)
  }
}

async function checkBanStatus() {
  if (!props.episodeId || !ctx.user?.id) return

  try {
    const result = await apiChatCheckMyBanRoute({ episodeId: props.episodeId }).run(ctx)
    if (result.banned) {
      banState.value = {
        banned: true,
        type: result.type,
        expiresAt: result.expiresAt ? new Date(result.expiresAt).getTime() : null,
        reason: result.reason
      }
    }
  } catch (e) {
    console.error('Failed to check ban status:', e)
  }
}

function scrollToBottom() {
  nextTick(() => {
    messagesRef.value?.scrollDown()
  })
}

defineExpose({ scrollToBottom, store })

watch(
  () => props.screen?.messages_get_url,
  async () => {
    // Не очищаем store.messages - фейковые сообщения должны сохраниться
    await fetchMessages()
    // Не устанавливаем автофокус на мобильных устройствах
    if (!isMobile.value) {
      footerFocusTrigger.value = !footerFocusTrigger.value
    }
    scrollToBottom()
  },
  { immediate: true }
)

watch(
  () => props.hideCta,
  (val) => {
    store.hideCta = val
  }
)

watch(
  () => props.paidFormIds,
  (val) => {
    store.paidFormIds = val ?? []
  }
)

watch(
  () => store.socketStore,
  (socketStore) => {
    if (socketStore) {
      if (typeof messagesSocketDisposer === 'function') messagesSocketDisposer()
      if (typeof reactionsSocketDisposer === 'function') reactionsSocketDisposer()

      messagesSocketDisposer = null
      reactionsSocketDisposer = null

      const messagesSocketId = props.screen?.messages_socket_id

      if (messagesSocketId) {
        messagesSocketDisposer = socketStore.subscribeToSocket(
          messagesSocketId,
          messagesSocketHandler
        )
      }

      const reactionsSocketId = props.screen?.reactions_socket_id
      if (reactionsSocketId) {
        reactionsSocketDisposer = socketStore
          .subscribeToData(reactionsSocketId)
          .listen((data: any) => {
            const idx = store.messages.findIndex((m) => m.id === data.messageId)
            if (idx !== -1) {
              store.messages[idx] = { ...store.messages[idx], reactions: data.reactions }
            }
          })
      }
    }
  }
)

async function createMessage(
  id: string,
  text: string | undefined,
  replyTo: Message | null | undefined
) {
  store.messages.push({
    id,
    text,
    createdAt: Date.now(),
    author: props.screen?.current_author,
    textTokens: text ? [text] : [],
    replyTo,
    isOutgoing: true,
    sending: true
  } as unknown as Message)

  if (props.screen?.messages_add_url) {
    try {
      const response = await post(props.screen?.messages_add_url, {
        id,
        text,
        asGroup: false,
        replyTo,
        episodeId: props.screen?.episodeId,
        ...(typeof props.currentTimeSeconds === 'number'
          ? { elapsedSeconds: Math.max(0, Math.floor(props.currentTimeSeconds)) }
          : {})
      })

      if (response.success === true) {
        const messageIndex = store.messages.findIndex((message) => message.id === id)

        if (messageIndex !== -1) {
          store.messages[messageIndex].sending = false
        }
      } else {
        store.messages = store.messages.filter((m) => m.id !== id)
        console.error('Failed to send message:', response.error || 'Unknown error')
      }
    } catch (error: any) {
      store.messages = store.messages.filter((m) => m.id !== id)

      if (
        error?.message?.includes('Слишком частые сообщения') ||
        error?.message?.includes('rate') ||
        error?.message?.includes('Подождите')
      ) {
        const match = error.message.match(/(\d+)\s*сек/)
        if (match) {
          rateLimitBlockedUntil.value = Date.now() + parseInt(match[1], 10) * 1000
        }
      }

      console.error('Failed to send message:', error)
    }
  }
}

async function submitHandler() {
  const id = nanoid()
  const currentText = text.value
  const currentReplyMessage = replyMessage.value

  if (!currentText.trim().length) return

  if (currentText.length > 5000) {
    console.error('Message exceeds maximum length')
    return
  }

  text.value = ''
  replyMessage.value = null

  emit('messageSent')

  await createMessage(id, currentText, currentReplyMessage)
}

const userType = computed(() => ctx.user?.type || 'Anonymous')

function handleLoginClick() {
  const backUrl = window.location.pathname + window.location.search
  window.location.href = `/s/auth/signin?back=${encodeURIComponent(backUrl)}`
}

function removeReplyMessageHandler() {
  replyMessage.value = null
}

function replyMessageHandler(message: Message) {
  replyMessage.value = message
  footerFocusTrigger.value = !footerFocusTrigger.value
}

const navigator = {
  sendMessage: async (action: any) => {
    await createMessage(nanoid(), action.text, null)
  },
  refresh: (action: any) => null,
  navigate: (action: any) => {
    if (action.url && action.openInExternalApp) {
      window.open(action.url)
    } else {
      console.log('navigate', action)
    }
  }
}

provideNavigator(navigator)

async function fetchAdminIds() {
  try {
    const { adminIds } = await apiChatGetAdminIdsRoute.run(ctx)
    store.adminIds = adminIds ?? []
  } catch (e) {
    console.error('Failed to fetch admin IDs:', e)
  }
}

onBeforeMount(async () => {
  await fetchAdminIds()
})

const isMobile = computed(() => window.innerWidth < 1024)

onMounted(() => {
  // Не устанавливаем автофокус на мобильных устройствах чтобы избежать сдвига страницы
  if (!isMobile.value) {
    footerFocusTrigger.value = !footerFocusTrigger.value
  }
  subscribeToUserSocket()
  checkRateLimitStatus()
  checkBanStatus()
})

onBeforeUnmount(() => {
  if (messagesSocketDisposer) messagesSocketDisposer()
  if (reactionsSocketDisposer) reactionsSocketDisposer()
  if (userSocketSubscription && userSocketSubscription.close) userSocketSubscription.close()
})
</script>

<template>
  <div class="ChatScreen">
    <slot name="messages" :messages="store.messages">
      <Messages
        ref="messagesRef"
        :messages="store.messages"
        :message-grouping="props.messageGrouping"
        :ctxMenuMessageId="ctxMenuMessageId"
        :ctxMenuItems="ctxMenuItems"
        :enable-replies="store.enableReplies"
        :enable-reactions="store.enableReactions"
        @reply-message="replyMessageHandler"
        @open-context-menu="onOpenContextMenu"
        @close-context-menu="closeCtxMenu"
        @open-form="(type) => emit('openForm', type)"
      />
    </slot>

    <slot name="footer" :text="text" :reply-message="replyMessage">
      <Footer
        :text="text"
        :replyMessage="store.enableReplies ? replyMessage : null"
        :rateLimitBlockedUntil="rateLimitBlockedUntil"
        :banState="banState"
        :chatAccessMode="props.chatAccessMode"
        :userType="userType"
        :isAdmin="store.isAdmin"
        @input="text = $event"
        @submit="submitHandler"
        @removeReplyMessage="removeReplyMessageHandler"
        @loginClick="handleLoginClick"
        :focusTrigger="footerFocusTrigger"
      />
    </slot>
  </div>
</template>

<style scoped>
.ChatScreen {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', var(--chat-font-family, sans-serif);
  background-color: transparent;
  color: var(--wr-chat-text);
  border-radius: 0;
  overflow: hidden;
  position: relative;

  --chat-font-family: 'Inter', sans-serif;
  --chat-background: transparent;
  --chat-text-color: var(--wr-chat-text);
  --chat-border-radius: 0;
  --chat-colors-background: transparent;
  --chat-colors-text: var(--wr-chat-msg-in-text);
  --chat-colors-timestamp: var(--wr-chat-timestamp);
  --chat-colors-authorName: var(--wr-chat-author);
  --chat-colors-primary: #f8005b;
  --chat-colors-headerBackground: var(--wr-chat-header-bg);
  --chat-colors-footerBackground: var(--wr-chat-footer-bg);
  --chat-colors-incomingMessage-background: var(--wr-chat-msg-in-bg);
  --chat-colors-incomingMessage-text: var(--wr-chat-msg-in-text);
  --chat-colors-incomingMessage-border: var(--wr-chat-msg-in-border);
  --chat-colors-outgoingMessage-background: var(--wr-chat-msg-out-bg);
  --chat-colors-outgoingMessage-text: var(--wr-chat-msg-out-text);
  --chat-colors-outgoingMessage-border: var(--wr-chat-msg-out-border);
  --chat-colors-inputText: var(--wr-chat-text);
  --chat-colors-buttons-send: #f8005b;
  --chat-colors-buttons-attach: var(--wr-text-tertiary);
  --chat-colors-buttons-hover: #f8005b;
  --chat-font-size-normal: 14px;
  --chat-font-size-small: 12px;
  --chat-font-size-large: 15px;
  --chat-font-weight-bold: 600;
  --chat-spacing-containerPadding: 12px;
  --chat-spacing-messageGap: 2px;
  --chat-spacing-messagePadding: 6px 14px;
  --chat-border-radius-message: 12px;
  --chat-animation-messageAppear: messageSlideIn 0.2s ease-out;
  --chat-primary-color: #f8005b;
}

.ChatScreen,
.ChatScreen *,
.ChatScreen *:before,
.ChatScreen *:after {
  box-sizing: border-box;
}

:global([data-v-app]) > div > .ChatScreenUploader,
:global([data-v-app]) > div > .ChatScreenUploader * {
  box-sizing: border-box;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
