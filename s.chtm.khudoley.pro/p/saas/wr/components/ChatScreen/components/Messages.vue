<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, defineExpose } from 'vue'
import MessageComponent from './MessageComponent.vue'
import type { ContextMenuItem } from './ContextMenu.vue'

export interface Message {
  id: string
  isOutgoing: boolean
  type: string
  text: string
  textTokens: (string | { type: 'url'; v: string; onClick?: { url: string } })[]
  files: MessageFile[]
  blocks: any[]
  canEdit: boolean
  bgColor: string | null
  createdAt: number
  createdAtTimestamp: number
  updatedAt: number
  updatedAtTimestamp: number
  author: {
    id: string
    name: string
    avatar?: { image: string }
    onClick?: { type: 'navigate'; url: string }
  }
  replyTo: Message | null
  isSameAuthor: boolean
  isSameDay: boolean
  sending?: boolean
  reactions?: Record<string, { user_id: string }[]>
  data?: {
    type?: string
    title?: string
    subtitle?: string
    buttonText?: string
    formId?: string
  }
}

export interface MessageFile {
  mime_type?: string
  hash?: string
  url?: string
  thumbnail_url_400?: string
  meta?: {
    size?: number
    width?: number
    height?: number
    type?: string
    name?: string
    duration?: number
  }
}

interface MessagesProps {
  messages: Message[]
  dateFormat?: string
  timeFormat?: string
  showTimestamps?: boolean
  messageGrouping?: boolean
  ctxMenuMessageId?: string | null
  ctxMenuItems?: ContextMenuItem[]
  enableReplies?: boolean
  enableReactions?: boolean
}

const props = withDefaults(defineProps<MessagesProps>(), {
  dateFormat: 'd MMM',
  timeFormat: 'HH:mm',
  showTimestamps: true,
  messageGrouping: true,
  ctxMenuMessageId: null,
  enableReplies: true,
  enableReactions: true
})

const emit = defineEmits<{
  (e: 'replyMessage', message: Message): void
  (e: 'openContextMenu', data: { message: Message }): void
  (e: 'closeContextMenu'): void
  (e: 'openForm', formType: string): void
}>()

const messagesElement = ref<HTMLDivElement | null>(null)
const isNearBottom = ref(true)
const hasNewMessages = ref(false)
const newMessageCount = ref(0)

const SCROLL_THRESHOLD = 100

const sortedMessages = computed(() => {
  const sorted = [...props.messages].sort((a: Message, b: Message) =>
    a.createdAt > b.createdAt ? +1 : a.createdAt < b.createdAt ? -1 : 0
  )
  let prevAuthorId: string | null = null
  sorted.forEach((msg) => {
    const same = prevAuthorId === msg.author?.id
    msg.isSameAuthor = same
    prevAuthorId = msg.author?.id || null
  })
  return sorted
})

const last3Ids = computed(() => {
  const msgs = sortedMessages.value
  const len = msgs.length
  if (len <= 3) return new Set(msgs.map((m) => m.id))
  return new Set(msgs.slice(len - 3).map((m) => m.id))
})

const lastMessageId = computed(() => {
  const msgs = sortedMessages.value
  return msgs.length > 0 ? msgs[msgs.length - 1].id : null
})

function checkIfNearBottom() {
  const el = messagesElement.value
  if (!el) return true
  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
  return distanceFromBottom <= SCROLL_THRESHOLD
}

function onScroll() {
  const near = checkIfNearBottom()
  isNearBottom.value = near
  if (near) {
    hasNewMessages.value = false
    newMessageCount.value = 0
  }
}

function scrollDown() {
  if (messagesElement.value) {
    messagesElement.value.scrollTop = messagesElement.value.scrollHeight
    isNearBottom.value = true
    hasNewMessages.value = false
    newMessageCount.value = 0
  }
}

function scrollDownSmooth() {
  if (messagesElement.value) {
    messagesElement.value.scrollTo({
      top: messagesElement.value.scrollHeight,
      behavior: 'smooth'
    })
    hasNewMessages.value = false
    newMessageCount.value = 0
  }
}

function messageDblClickHandler(message: Message) {
  return function () {
    emit('replyMessage', message)
  }
}

watch(lastMessageId, (newId, oldId) => {
  if (!newId || newId === oldId) return

  const lastMsg = sortedMessages.value[sortedMessages.value.length - 1]
  const isOwnMessage = lastMsg?.isOutgoing || lastMsg?.author?.id === ctx.user?.id

  if (isNearBottom.value || isOwnMessage) {
    nextTick(() => {
      scrollDown()
    })
  } else {
    hasNewMessages.value = true
    newMessageCount.value++
  }
})

onMounted(() => {
  nextTick(() => {
    scrollDown()
  })

  messagesElement.value?.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  messagesElement.value?.removeEventListener('scroll', onScroll)
})

defineExpose({ scrollDown })
</script>

<template>
  <div
    class="Messages"
    ref="messagesElement"
    :class="{ 'Messages--no-grouping': !messageGrouping }"
  >
    <div v-if="sortedMessages.length === 0" class="Messages__empty">
      <div class="Messages__empty-icon">💬</div>
      <div class="Messages__empty-title">Чат эфира</div>
      <div class="Messages__empty-text">Напишите «Привет!», чтобы начать общение</div>
    </div>
    <MessageComponent
      v-for="message in sortedMessages"
      :key="message.id"
      :message="message"
      :ctxMenuOpen="ctxMenuMessageId === message.id"
      :ctxMenuItems="ctxMenuMessageId === message.id ? ctxMenuItems : undefined"
      :ctxMenuForceAbove="ctxMenuMessageId === message.id && last3Ids.has(message.id)"
      :enable-replies="enableReplies"
      :enable-reactions="enableReactions"
      @dblclick="messageDblClickHandler(message)"
      @reply="(msg) => emit('replyMessage', msg)"
      @open-context-menu="(data) => emit('openContextMenu', data)"
      @close-context-menu="emit('closeContextMenu')"
      @open-form="(type) => emit('openForm', type)"
      :show-timestamps="showTimestamps"
      :time-format="timeFormat"
    />

    <Transition name="newMsgBtn">
      <button v-if="hasNewMessages" class="Messages__newBtn" @click="scrollDownSmooth">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span>Новые сообщения</span>
        <span v-if="newMessageCount > 0" class="Messages__newBtnCount">{{
          newMessageCount > 99 ? '99+' : newMessageCount
        }}</span>
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.Messages {
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
  flex-grow: 2;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background-color: transparent;
  background-image: linear-gradient(var(--wr-chat-overlay-color), var(--wr-chat-overlay-color)),
    var(--wr-chat-bg-image);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  font-family: var(--chat-font-family);
  position: relative;
}

.Messages::-webkit-scrollbar {
  display: none;
}

.Messages {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.MessageHighlight {
  background-color: rgba(248, 0, 91, 0.1);
  transition: background-color 1s;
}

.MessageHighlightOff {
  background-color: transparent;
}

.Messages__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0.5;
  user-select: none;
  padding: 20px;
  text-align: center;
}

.Messages__empty-icon {
  font-size: 36px;
  line-height: 1;
}

.Messages__empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--wr-text-primary);
}

.Messages__empty-text {
  font-size: 13px;
  color: var(--wr-text-secondary);
}

.Messages__newBtn {
  position: sticky;
  bottom: 8px;
  align-self: center;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid var(--wr-border-light);
  background: var(--wr-chat-footer-bg);
  backdrop-filter: blur(12px);
  color: var(--wr-accent, #f8005b);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
  z-index: 5;
  font-family: inherit;
  line-height: 1;
}

.Messages__newBtn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.Messages__newBtn:active {
  transform: translateY(0);
}

.Messages__newBtnCount {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--wr-accent, #f8005b);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.newMsgBtn-enter-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.newMsgBtn-leave-active {
  transition: all 0.15s ease-in;
}
.newMsgBtn-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.9);
}
.newMsgBtn-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.95);
}
</style>
