<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { currentTheme } from '../../../shared/theme'
import ReplyMessage from './ReplyMessage.vue'
import AppUiPresenter from '../../AppUiPresenter/AppUiPresenter.vue'
import ContextMenu from './ContextMenu.vue'
import ChatSaleBanner from './ChatSaleBanner.vue'
import type { ContextMenuItem } from './ContextMenu.vue'
import { useChatScreenContext } from '../contexts/ChatScreenContext'
import { post } from '../fetchers/messages'
import type { Message } from './Messages.vue'

const HEART_EMOJI = '❤️'

interface MessageComponentProps {
  message: Message
  showTimestamps?: boolean
  timeFormat?: string
  ctxMenuItems?: ContextMenuItem[]
  ctxMenuOpen?: boolean
  ctxMenuForceAbove?: boolean
  enableReplies?: boolean
  enableReactions?: boolean
}

const props = withDefaults(defineProps<MessageComponentProps>(), {
  showTimestamps: true,
  timeFormat: 'HH:mm',
  ctxMenuOpen: false,
  enableReplies: true,
  enableReactions: true
})

const emit = defineEmits<{
  (e: 'dblclick', event: MouseEvent): void
  (e: 'openContextMenu', data: { message: Message }): void
  (e: 'closeContextMenu'): void
  (e: 'reply', message: Message): void
  (e: 'openForm', formId: string): void
}>()

const store = useChatScreenContext()

const isHiddenBanner = computed(() => {
  if (props.message.data?.type !== 'sale_banner') return false
  if (store.hideCta) return true
  const bannerFormId = props.message.data?.formId
  if (bannerFormId && store.paidFormIds?.includes(bannerFormId)) return true
  return false
})

const isSaleBanner = computed(() => {
  if (store.hideCta) return false
  if (props.message.data?.type !== 'sale_banner') return false
  const bannerFormId = props.message.data?.formId
  if (bannerFormId && store.paidFormIds?.includes(bannerFormId)) return false
  return true
})

const isAdminMessage = computed(() => {
  const authorId = props.message.author?.id
  if (!authorId || !store.adminIds?.length) return false
  return store.adminIds.includes(authorId)
})

const isMyMessage = computed(() => {
  return props.message.isOutgoing || props.message.author?.id === ctx.user?.id
})

const messageRootEl = ref<HTMLDivElement | null>(null)

let timeoutHandler1: number | null = null
let timeoutHandler2: number | null = null

// Long-tap support for mobile (Safari doesn't fire contextmenu on touch)
let longTapTimer: number | null = null
let touchStartPos = { x: 0, y: 0 }
const LONG_TAP_DURATION = 500
const TOUCH_MOVE_THRESHOLD = 10

function onTouchStart(e: TouchEvent) {
  if (!store.isAdmin && !isMyMessage.value) return
  const touch = e.touches[0]
  touchStartPos = { x: touch.clientX, y: touch.clientY }
  longTapTimer = window.setTimeout(() => {
    longTapTimer = null
    e.preventDefault()
    emit('openContextMenu', { message: props.message })
  }, LONG_TAP_DURATION)
}

function onTouchMove(e: TouchEvent) {
  if (!longTapTimer) return
  const touch = e.touches[0]
  const dx = Math.abs(touch.clientX - touchStartPos.x)
  const dy = Math.abs(touch.clientY - touchStartPos.y)
  if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) {
    clearTimeout(longTapTimer)
    longTapTimer = null
  }
}

function onTouchEnd() {
  if (longTapTimer) {
    clearTimeout(longTapTimer)
    longTapTimer = null
  }
}

onBeforeUnmount(() => {
  if (longTapTimer) {
    clearTimeout(longTapTimer)
    longTapTimer = null
  }
})

function replyMessageClickHandler(event: MouseEvent) {
  const chatScreenElement = (event.target as HTMLElement)?.closest<HTMLDivElement>('.ChatScreen')

  if (chatScreenElement) {
    const messageElement = chatScreenElement.querySelector(
      `[data-id="${props.message.replyTo?.id}"]`
    )

    if (messageElement) {
      if (timeoutHandler1) clearTimeout(timeoutHandler1)
      if (timeoutHandler2) clearTimeout(timeoutHandler2)

      messageElement?.classList.remove('MessageHighlight')
      messageElement?.classList.remove('MessageHighlightOff')

      requestAnimationFrame(function () {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        messageElement.classList.add('MessageHighlight')

        timeoutHandler1 = setTimeout(function () {
          messageElement?.classList.add('MessageHighlightOff')

          timeoutHandler2 = setTimeout(function () {
            messageElement?.classList.remove('MessageHighlight')
            messageElement?.classList.remove('MessageHighlightOff')
          }, 1000)
        }, 1000)
      })
    }
  }
}

function dd(v: number) {
  return v.toString().length === 1 ? '0' + v.toString() : v.toString()
}

function time(ms: number) {
  const date = new Date(ms)
  return dd(date.getHours()) + ':' + dd(date.getMinutes())
}

const nameColor = computed(() => {
  const id = props.message.author?.id || ''
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  const isDark = currentTheme.value === 'dark'
  const lightness = isDark ? 65 : 40
  const saturation = isDark ? 60 : 70
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
})

function parseTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts: (string | { type: 'url'; v: string })[] = []
  let lastIndex = 0
  let match

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    parts.push({ type: 'url', v: match[0] })
    lastIndex = urlRegex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts.length > 0 ? parts : null
}

const textTokens = computed(() => {
  if (props.message.textTokens?.length) {
    return props.message.textTokens
  }
  if (props.message.text) {
    return parseTextWithLinks(props.message.text)
  }
  return null
})

function onContextMenu(e: MouseEvent) {
  if (!store.isAdmin && !isMyMessage.value) {
    e.preventDefault()
    return
  }
  e.preventDefault()
  emit('openContextMenu', { message: props.message })
}

function onReply() {
  emit('reply', props.message)
}

// --- Reactions ---
const reactingHeart = ref(false)

const currentUserId = computed(() => ctx.user?.id || '')

function getHeartCount(): number {
  const reactions = props.message.reactions
  if (!reactions || !reactions[HEART_EMOJI]) return 0
  return reactions[HEART_EMOJI].length
}

const hasMyHeart = computed(() => {
  const reactions = props.message.reactions
  if (!reactions || !reactions[HEART_EMOJI] || !currentUserId.value) return false
  return reactions[HEART_EMOJI].some((r) => r.user_id === currentUserId.value)
})

const heartCount = computed(() => getHeartCount())
const showHeartChip = computed(() => heartCount.value > 0)
const showHoverHeart = computed(() => !hasMyHeart.value)

async function toggleHeart() {
  if (!currentUserId.value || !store.chat.messages_react_url) return
  if (reactingHeart.value) return

  const isMine = hasMyHeart.value
  reactingHeart.value = true

  try {
    await post(store.chat.messages_react_url, {
      messageId: props.message.id,
      reaction: HEART_EMOJI,
      action: isMine ? 'unset' : 'set'
    })
  } catch (e) {
    console.error('Failed to toggle reaction:', e)
  } finally {
    reactingHeart.value = false
  }
}
</script>

<template>
  <div
    v-if="!isHiddenBanner"
    ref="messageRootEl"
    class="Message"
    :class="{
      MessageSending: message.sending,
      MessageOutgoing: message.isOutgoing,
      MessageSameAuthor: message.isSameAuthor,
      MessageAdmin: isAdminMessage,
      MessageBanner: isSaleBanner
    }"
    :data-id="message.id"
    @dblclick="$emit('dblclick', $event)"
    @contextmenu="onContextMenu"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
  >
    <!-- Sale Banner rendering -->
    <div v-if="isSaleBanner" class="MessageCenter MessageBannerCenter">
      <div class="BannerAuthorRow">
        <img
          v-if="message.author?.avatar?.image"
          class="BannerAuthorAvatar"
          :src="message.author.avatar.image"
          alt=""
        />
        <div v-else class="BannerAuthorAvatarFallback">{{ (message.author?.name || 'Ч')[0] }}</div>
        <span class="BannerAuthorName">{{ message.author?.name || 'Чатиум' }}</span>
      </div>
      <ChatSaleBanner
        :title="message.data?.title"
        :subtitle="message.data?.subtitle"
        :buttonText="message.data?.buttonText"
        :formId="message.data?.formId"
        @click="emit('openForm', message.data?.formId || '')"
      />
    </div>

    <!-- Regular message rendering -->
    <div v-else class="MessageCenter">
      <div
        v-if="!message.isSameAuthor"
        class="MessageAuthorName"
        :style="{ color: isAdminMessage ? undefined : nameColor }"
        :class="{ MessageAdminAuthor: isAdminMessage }"
      >
        <span v-if="isAdminMessage && isMyMessage" class="MessageAdminBadge">Модератор</span>
        {{ message.author?.name }}
        <span v-if="isAdminMessage && !isMyMessage" class="MessageAdminBadge">Модератор</span>
      </div>

      <div
        v-if="message.textTokens?.length || message.text || message.files?.length"
        class="MessageText"
      >
        <div class="MessageWithReply">
          <div
            class="MessageTextWrapper"
            :class="{
              MessageTextWrapperOutgoing: message.isOutgoing,
              MessageTextWrapperAdmin: isAdminMessage && !message.isOutgoing
            }"
          >
            <ReplyMessage
              v-if="message.replyTo"
              :message="message.replyTo"
              @click="replyMessageClickHandler"
            />

            <div v-if="textTokens || message.text" class="MessageContent">
              <template v-if="textTokens">
                <template v-for="(token, idx) in textTokens" :key="idx">
                  <br v-if="typeof token === 'string' && token === '\n'" />
                  <span v-else-if="typeof token === 'string'">{{ token }}</span>
                  <a
                    v-else
                    :href="token.onClick?.url ?? token.v"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="MessageLink"
                    >{{ token.v }}</a
                  >
                </template>
              </template>

              <span v-if="showTimestamps" class="MessageInlineTime">{{
                time(message.createdAt)
              }}</span>
            </div>

            <div v-if="message.files?.length" class="MessageFiles">
              <MessageFile
                v-for="file in message.files"
                :key="file.hash || file.url"
                :file="file"
              />
            </div>

            <AppUiPresenter v-if="message.blocks?.length" :blocks="message.blocks" />

            <!-- Heart reaction chip -->
            <div v-if="props.enableReactions && showHeartChip" class="MsgReactions">
              <button
                class="MsgReactionChip"
                :class="{
                  'MsgReactionChip--active': hasMyHeart,
                  'MsgReactionChip--loading': reactingHeart
                }"
                @click.stop="toggleHeart()"
              >
                <span class="MsgReactionEmoji">❤️</span>
                <span class="MsgReactionCount">{{ heartCount }}</span>
              </button>
            </div>
          </div>

          <!-- Hover heart + reply -->
          <div class="MessageActions">
            <button
              v-if="props.enableReactions && showHoverHeart"
              class="MessageActionBtn HoverHeartBtn"
              :class="{ 'HoverHeartBtn--loading': reactingHeart }"
              @click.stop="toggleHeart()"
              title="❤️"
            >
              <span class="HoverHeartEmoji">❤️</span>
            </button>
            <button
              v-if="props.enableReplies"
              class="MessageActionBtn MessageReplyBtn"
              @click="onReply"
              title="Ответить"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="9 14 4 9 9 4" />
                <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Context menu rendered inside the message block -->
      <ContextMenu
        v-if="ctxMenuOpen && ctxMenuItems?.length"
        :items="ctxMenuItems"
        :x="0"
        :y="0"
        :forceAbove="ctxMenuForceAbove"
        @close="emit('closeContextMenu')"
      />
    </div>
  </div>
</template>

<style scoped>
.Message {
  box-sizing: border-box;
  display: flex;
  gap: 8px;
  padding: 4px 14px;
  font-family: var(--chat-font-family);
  transition: background-color 0.15s ease;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  position: relative;
}

.MessageOutgoing {
  flex-direction: row-reverse;
}

.MessageOutgoing .MessageCenter {
  align-items: flex-end;
}

.MessageOutgoing .MessageText {
  justify-content: flex-end;
}

.Message:hover {
  background-color: var(--wr-hover-bg);
}

.MessageSameAuthor {
  padding-top: 1px;
}

.MessageSending {
  opacity: 0.45;
}

.MessageOutgoing .MessageTextWrapper {
  background: var(--wr-chat-msg-out-bg) !important;
  border-color: var(--wr-chat-msg-out-border) !important;
}

.MessageCenter {
  flex-grow: 2;
  word-wrap: break-word;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: visible;
  min-width: 0;
  position: relative;
}

.MessageAuthorName {
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  color: var(--wr-chat-author);
  letter-spacing: -0.01em;
}

.MessageText {
  word-break: break-word;
  max-width: 100%;
  white-space: pre-line;
  line-height: 1.4;
  display: flex;
  color: var(--wr-chat-msg-in-text);
}

.MessageTextWrapper {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
  background: var(--wr-chat-msg-in-bg);
  border: 1px solid var(--wr-chat-msg-in-border);
  border-radius: 4px 12px 12px 12px;
  padding: 8px 10px;
  font-size: 13.5px;
}

.MessageTextWrapperOutgoing {
  border-radius: 12px 4px 12px 12px;
}

/* Входящие сообщения в светлой теме: тень + контрастная обводка */
.theme-light .MessageTextWrapper:not(.MessageTextWrapperOutgoing):not(.MessageTextWrapperAdmin) {
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.08),
    0 1px 2px rgba(0, 0, 0, 0.04);
}

.MessageContent {
  display: inline;
  -webkit-user-select: text;
  user-select: text;
}

.MessageInlineTime {
  font-size: 10px;
  color: var(--wr-chat-timestamp);
  margin-left: 8px;
  vertical-align: baseline;
  white-space: nowrap;
  user-select: none;
}

.MessageLink {
  color: #f8005b;
  text-decoration: none;
  border-bottom: 1px solid rgba(248, 0, 91, 0.3);
  transition: border-color 0.15s ease;
}

.MessageLink:hover {
  border-bottom-color: #f8005b;
}

/* Admin message styles */
.MessageAdmin {
}

.MessageAdminAuthor {
  color: #f8005b !important;
  display: flex;
  align-items: center;
  gap: 6px;
}

.MessageAdminBadge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(248, 0, 91, 0.15);
  color: #f8005b;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 16px;
  flex-shrink: 0;
}

.MessageTextWrapperAdmin {
  background: rgba(248, 0, 91, 0.12) !important;
  border-color: rgba(248, 0, 91, 0.25) !important;
}

.theme-dark .MessageTextWrapperAdmin {
  background: rgba(248, 0, 91, 0.15) !important;
}

.theme-light .MessageTextWrapperAdmin {
  background: rgba(248, 0, 91, 0.08) !important;
}

.MessageWithReply {
  position: relative;
  display: inline-flex;
  align-items: flex-end;
  gap: 6px;
}

/* Action buttons container — horizontal row */
.MessageActions {
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 2px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.MessageOutgoing .MessageWithReply {
  flex-direction: row-reverse;
}

.Message:hover .MessageActions {
  opacity: 1;
  pointer-events: auto;
}

.MessageActionBtn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  background: var(--wr-bg-primary);
  color: var(--wr-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.MessageActionBtn:hover {
  background: var(--wr-hover-bg);
  color: #f8005b;
  transform: scale(1.05);
}

.MessageActionBtn:active {
  transform: scale(0.95);
}

/* Hover heart button */
.HoverHeartBtn {
  font-size: 14px;
  line-height: 1;
}

.HoverHeartEmoji {
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease;
}

.HoverHeartBtn:hover .HoverHeartEmoji {
  transform: scale(1.25);
}

.HoverHeartBtn--loading {
  opacity: 0.5;
  pointer-events: none;
}

/* Reactions inside bubble */
.MsgReactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.MsgReactionChip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid var(--wr-reaction-border);
  background: var(--wr-reaction-bg);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  transition: all 0.15s ease;
  user-select: none;
}

.MsgReactionChip:hover {
  background: var(--wr-reaction-hover);
}

.MsgReactionChip--active {
  border-color: rgba(248, 0, 91, 0.4);
  background: rgba(248, 0, 91, 0.12);
}

.MsgReactionChip--active:hover {
  background: rgba(248, 0, 91, 0.2);
}

.MsgReactionChip--loading {
  opacity: 0.5;
  pointer-events: none;
}

.MsgReactionEmoji {
  font-size: 14px;
  line-height: 1;
}

.MsgReactionCount {
  font-size: 11px;
  font-weight: 600;
  color: var(--wr-text-secondary);
  line-height: 1;
}

.MsgReactionChip--active .MsgReactionCount {
  color: #f8005b;
}

/* Banner message */
.MessageBanner {
  padding: 4px 8px;
}

.MessageBanner:hover {
  background-color: transparent;
}

.MessageBannerCenter {
  width: 100%;
}

.BannerAuthorRow {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 0 2px 0;
}

.BannerAuthorAvatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.BannerAuthorAvatarFallback {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f8005b, #d4004e);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.BannerAuthorName {
  font-size: 12px;
  font-weight: 600;
  color: #f8005b;
  letter-spacing: -0.01em;
}

/* Mobile: show reaction picker on tap too */
@media (hover: none) {
  .MessageActions {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
