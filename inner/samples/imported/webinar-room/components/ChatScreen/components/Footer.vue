<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import Spinner from '../../Spinner.vue'
import IconButton from '../../IconButton.vue'
import ReplyMessage from './ReplyMessage.vue'

interface Message {
  id: string
  text: string
}

interface BanState {
  banned: boolean
  type?: string
  expiresAt?: number | null
  reason?: string
}

interface FooterProps {
  text?: string
  replyMessage?: Message | null
  waiting?: boolean
  focusTrigger?: string | number | boolean
  maxMessageLength?: number
  rateLimitBlockedUntil?: number | null
  banState?: BanState
  chatAccessMode?: string
  userType?: string
  isAdmin?: boolean
}

const props = withDefaults(defineProps<FooterProps>(), {
  text: '',
  waiting: false,
  maxMessageLength: 5000,
  rateLimitBlockedUntil: null,
  banState: () => ({ banned: false }),
  chatAccessMode: 'open',
  userType: 'Real',
  isAdmin: false
})

const emit = defineEmits<{
  (e: 'input', text: string): void
  (e: 'removeReplyMessage'): void
  (e: 'submit'): void
  (e: 'cancel'): void
  (e: 'loginClick'): void
}>()

const inputElement = ref<HTMLTextAreaElement | null>(null)
const now = ref(Date.now())
let timerInterval: any = null

const textIsEmpty = computed(() => !props.text || props.text.length === 0)
const isTextTooLong = computed(() => (props.text?.length || 0) > props.maxMessageLength)

const containsUrl = computed(() => {
  if (props.isAdmin || !props.text) return false
  const urlPattern =
    /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|ru|net|org|info|io|app|site|online|tech|pro|dev|club|store|shop|me|xyz|by|kz|ua|uk|de|fr|us)[^\s]*)/gi
  return urlPattern.test(props.text)
})

const isRateLimited = computed(() => {
  if (!props.rateLimitBlockedUntil) return false
  return props.rateLimitBlockedUntil > now.value
})

const rateLimitSecondsLeft = computed(() => {
  if (!props.rateLimitBlockedUntil) return 0
  return Math.max(0, Math.ceil((props.rateLimitBlockedUntil - now.value) / 1000))
})

const isBanned = computed(() => {
  if (!props.banState?.banned) return false
  if (props.banState.type === 'timeout' && props.banState.expiresAt) {
    return props.banState.expiresAt > now.value
  }
  return true
})

const isPermanentBan = computed(() => {
  return props.banState?.banned && props.banState.type === 'permanent'
})

const banSecondsLeft = computed(() => {
  if (!props.banState?.expiresAt) return 0
  return Math.max(0, Math.ceil((props.banState.expiresAt - now.value) / 1000))
})

const banTimeLeft = computed(() => {
  const total = banSecondsLeft.value
  if (total <= 0) return ''
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m > 0) return `${m} мин ${s} сек`
  return `${s} сек`
})

const isChatDisabled = computed(() => props.chatAccessMode === 'disabled')
const needsAuth = computed(
  () => props.chatAccessMode === 'auth-only' && (!props.userType || props.userType === 'Anonymous')
)
const isBlocked = computed(
  () => isRateLimited.value || isBanned.value || isChatDisabled.value || needsAuth.value
)

function startTimer() {
  if (timerInterval) return
  timerInterval = setInterval(() => {
    now.value = Date.now()
    if (!isRateLimited.value && !isBanned.value && timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }, 200)
}

watch(
  () => props.rateLimitBlockedUntil,
  (val) => {
    if (val && val > Date.now()) {
      now.value = Date.now()
      startTimer()
    }
  },
  { immediate: true }
)

watch(
  () => props.banState,
  (val) => {
    if (val?.banned) {
      now.value = Date.now()
      if (val.type === 'timeout' && val.expiresAt && val.expiresAt > Date.now()) {
        startTimer()
      }
    }
  },
  { immediate: true, deep: true }
)

function inputHandler(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('input', target.value)
}

watch(
  () => props.text,
  () => {
    nextTick(() => {
      if (inputElement.value) {
        const offset = inputElement.value.offsetHeight - inputElement.value.clientHeight
        inputElement.value.style.height = 'auto'
        inputElement.value.style.height = inputElement.value.scrollHeight + offset + 'px'
      }
    })
  }
)

function keyDownHandler(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    emit('cancel')
  }

  if (event.key === 'Enter' && event.shiftKey === false) {
    event.stopPropagation()
    event.preventDefault()
    if (!isBlocked.value && !containsUrl.value && !isTextTooLong.value) {
      emit('submit')
    }
  }
}

watch(
  () => props.focusTrigger,
  (newVal, oldVal) => {
    if (newVal !== oldVal) {
      inputElement.value?.focus()
    }
  }
)

function removeReplyMessageHandler() {
  emit('removeReplyMessage')
}

onMounted(() => {
  inputElement.value?.addEventListener('keydown', keyDownHandler, { capture: true })
})

onBeforeUnmount(() => {
  inputElement.value?.removeEventListener('keydown', keyDownHandler, { capture: true })
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
})
</script>

<template>
  <div
    class="Footer"
    :data-empty="textIsEmpty ? 'true' : 'false'"
    :data-text-too-long="isTextTooLong ? 'true' : 'false'"
  >
    <div v-if="replyMessage && !isBlocked" class="FooterReplyWrapper">
      <ReplyMessage :message="replyMessage" />
      <button class="FooterReplyClose" @click="removeReplyMessageHandler">
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
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Ban permanent -->
    <div v-if="isBanned && isPermanentBan" class="FooterRateLimited">
      <div class="FooterRateLimitedInner FooterBanned">
        <svg
          class="FooterRateLimitedIcon"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
        <span class="FooterRateLimitedText">Вы заблокированы в чате</span>
      </div>
    </div>

    <!-- Ban timeout -->
    <div v-else-if="isBanned" class="FooterRateLimited">
      <div class="FooterRateLimitedInner FooterBanned">
        <svg
          class="FooterRateLimitedIcon"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
        <span class="FooterRateLimitedText">Заблокированы: {{ banTimeLeft }}</span>
      </div>
    </div>

    <!-- Rate-limit timer -->
    <div v-else-if="isRateLimited" class="FooterRateLimited">
      <div class="FooterRateLimitedInner">
        <svg
          class="FooterRateLimitedIcon"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span class="FooterRateLimitedText">Подождите {{ rateLimitSecondsLeft }} сек</span>
      </div>
    </div>

    <!-- Chat disabled -->
    <div v-else-if="isChatDisabled" class="FooterRateLimited">
      <div class="FooterRateLimitedInner FooterChatClosed">
        <svg
          class="FooterRateLimitedIcon"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span class="FooterRateLimitedText">Чат закрыт</span>
      </div>
    </div>

    <!-- Need auth -->
    <div v-else-if="needsAuth" class="FooterRateLimited">
      <button class="FooterLoginBtn" @click="$emit('loginClick')">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        <span>Войти</span>
      </button>
    </div>

    <!-- Normal input -->
    <div v-else class="FooterMessageWrapper" @click.stop>
      <div class="FooterInput">
        <textarea
          class="FooterInputTextarea"
          rows="1"
          :value="text"
          @input="inputHandler"
          placeholder="Написать сообщение..."
          :readonly="waiting"
          ref="inputElement"
          :maxlength="maxMessageLength"
          @keydown.enter.stop.prevent="!isTextTooLong && !containsUrl && $emit('submit')"
        ></textarea>

        <div v-if="isTextTooLong" class="FooterInputLimitWarning">
          {{ props.text?.length }} / {{ maxMessageLength }}
        </div>

        <div v-if="containsUrl" class="FooterInputUrlWarning">Ссылки запрещены</div>
      </div>

      <div class="FooterActions">
        <template v-if="!waiting">
          <button
            class="FooterSendBtn"
            :class="{
              // FooterSendBtnHidden: !text?.length,
              FooterSendBtnDisabled: isTextTooLong || containsUrl
            }"
            @click="!isTextTooLong && !containsUrl && $emit('submit')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 22 20"
              fill="currentColor"
            >
              <path d="m0 0 22 10L0 20l2-8 5-2-5-2-2-8Z" />
            </svg>
          </button>
        </template>

        <div v-if="waiting" class="FooterWaiting">
          <Spinner />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.Footer {
  box-sizing: border-box;
  flex-shrink: 0;
  border-top: 1px solid var(--wr-border-light);
  position: relative;
  width: 100%;
  background: var(--wr-chat-footer-bg);
  backdrop-filter: blur(10px);
  font-family: var(--chat-font-family);
}

.FooterMessageWrapper {
  box-sizing: border-box;
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  width: 100%;
  align-items: flex-end;
}

@media (min-width: 640px) {
  .FooterMessageWrapper {
    gap: 8px;
    padding: 8px 12px;
  }
}

.FooterReplyWrapper {
  display: flex;
  padding: 8px 10px 0;
  width: 100%;
  gap: 6px;
  align-items: flex-start;
}

@media (min-width: 640px) {
  .FooterReplyWrapper {
    padding: 8px 12px 0;
    gap: 8px;
  }
}

.FooterReplyClose {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--wr-text-secondary);
  opacity: 0.7;
  transition: all 0.15s;
  cursor: pointer;
  padding: 0;
}

.FooterReplyClose:hover {
  opacity: 1;
  background: var(--wr-btn-subtle-bg);
}

.FooterInput {
  flex-grow: 2;
  display: flex;
  position: relative;
  background: var(--wr-chat-input-bg);
  border: 1px solid var(--wr-chat-input-border);
  border-radius: 12px;
  padding: 0 10px;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

@media (min-width: 640px) {
  .FooterInput {
    padding: 0 12px;
  }
}

.FooterInput:focus-within {
  border-color: rgba(248, 0, 91, 0.35);
  background: var(--wr-chat-input-focus-bg);
}

.FooterActions {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
}

.FooterInputTextarea {
  box-sizing: border-box;
  border: none;
  outline: none;
  resize: none;
  width: 100%;
  padding: 10px 0;
  font: inherit;
  font-size: 13.5px;
  background-color: transparent;
  color: var(--wr-chat-text);
  line-height: 1.4;
}

.FooterInputTextarea::placeholder {
  color: var(--wr-chat-placeholder);
}

.FooterInputLimitWarning {
  position: absolute;
  bottom: 4px;
  right: 8px;
  font-size: 10px;
  color: #ff4757;
  font-weight: 500;
}

.FooterInputUrlWarning {
  position: absolute;
  bottom: 4px;
  right: 8px;
  font-size: 10px;
  color: #ff4757;
  font-weight: 500;
}

.FooterWaiting {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.FooterSendBtn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  color: #f8005b;
  background: rgba(248, 0, 91, 0.1);
  transition: all 0.2s ease;
  overflow: hidden;
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .FooterSendBtn {
    width: 40px;
    height: 40px;
  }
}

.FooterSendBtn:hover {
  background: rgba(248, 0, 91, 0.2);
  transform: scale(1.05);
}

.FooterSendBtnHidden {
  width: 0;
  opacity: 0;
  padding: 0;
  border: none;
  background: transparent;
  pointer-events: none;
}

.FooterSendBtnDisabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.FooterRateLimited {
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (min-width: 640px) {
  .FooterRateLimited {
    padding: 12px 16px;
  }
}

.FooterRateLimitedInner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 10px;
  background: rgba(248, 0, 91, 0.08);
  border: 1px solid rgba(248, 0, 91, 0.15);
}

.FooterRateLimitedIcon {
  color: rgba(248, 0, 91, 0.7);
  flex-shrink: 0;
}

.FooterRateLimitedText {
  font-size: 13px;
  color: rgba(248, 0, 91, 0.8);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.FooterBanned {
  background: rgba(255, 60, 60, 0.08);
  border-color: rgba(255, 60, 60, 0.15);
}

.FooterBanned .FooterRateLimitedIcon {
  color: rgba(255, 60, 60, 0.7);
}

.FooterBanned .FooterRateLimitedText {
  color: rgba(255, 60, 60, 0.8);
}

.FooterChatClosed {
  background: var(--wr-btn-subtle-bg);
  border-color: var(--wr-border-light);
}

.FooterChatClosed .FooterRateLimitedIcon {
  color: var(--wr-text-tertiary);
}

.FooterChatClosed .FooterRateLimitedText {
  color: var(--wr-text-secondary);
}

.FooterLoginBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  min-height: 44px;
  border-radius: 10px;
  background: rgba(248, 0, 91, 0.1);
  border: 1px solid rgba(248, 0, 91, 0.2);
  color: #f8005b;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

@media (min-width: 640px) {
  .FooterLoginBtn {
    gap: 8px;
    padding: 10px 24px;
    font-size: 14px;
  }
}

.FooterLoginBtn:hover {
  background: rgba(248, 0, 91, 0.15);
  border-color: rgba(248, 0, 91, 0.3);
  transform: translateY(-1px);
}

.FooterLoginBtn svg {
  flex-shrink: 0;
}
</style>
