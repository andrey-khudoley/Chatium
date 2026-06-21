<template>
  <div class="chat-popup" @click.stop>
    <button class="close-btn" @click="closePopup" aria-label="Закрыть чат">×</button>
    <div class="chat-wrapper">
      <header class="chat-header">
        <div>
          <div class="chat-title">Служба поддержки</div>
          <div class="chat-subtitle">Мы рядом, чтобы помочь</div>
        </div>
      </header>

      <section class="chat-messages" ref="messagesContainer">
        <div v-if="isLoading" class="chat-state">
          <span class="chat-state__label">Загружаем диалог…</span>
        </div>
        <div v-else-if="loadError && !hasLoaded" class="chat-state chat-state--error">
          <span class="chat-state__label">{{ loadError }}</span>
          <button type="button" class="chat-state__retry" @click="loadMessages">
            Попробовать снова
          </button>
        </div>
        <div v-else-if="!messages.length" class="chat-state chat-state--empty">
          <span class="chat-state__label"> Спросите что-нибудь — мы ответим в этом чате. </span>
        </div>
        <template v-else>
          <article
            v-for="message in messages"
            :key="message.id"
            :class="[
              'chat-message',
              `chat-message--${message.author}`,
              { 'chat-message--pending': message.pending }
            ]"
          >
            <span class="chat-message__time">
              {{ message.pending ? 'Отправка…' : message.time }}
            </span>
            <div class="chat-message__bubble">
              <p v-if="message.text" class="chat-message__text">
                {{ message.text }}
              </p>
              <div v-if="message.images?.length" class="chat-message__attachments">
                <figure
                  v-for="(image, imageIndex) in message.images"
                  :key="image.url || imageIndex"
                  class="chat-message__attachment"
                >
                  <img
                    class="chat-message__image"
                    :src="image.url?.replace('2048x2048', '500x')"
                    :alt="image?.alt || image?.name || `Вложение ${imageIndex + 1}`"
                    loading="lazy"
                  />
                </figure>
              </div>
            </div>
          </article>
        </template>

        <article
          v-if="typingIndicatorVisible"
          key="typing-indicator"
          class="chat-message chat-message--agent chat-message--typing"
        >
          <span class="chat-message__time">Готовлю ответ…</span>
          <div class="chat-typing-bubble">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </article>
      </section>

      <div v-if="(loadError && hasLoaded) || sendError" class="chat-banner chat-banner--error">
        {{ sendError || loadError }}
      </div>

      <footer class="chat-input">
        <MessageInput
          ref="messageInputRef"
          placeholder="Спросите что-нибудь..."
          :isSending="isSending"
          @submit="sendMessage"
        />
      </footer>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { apiChatMessagesRoute, apiChatSendMessageRoute } from '../api/chats'
import MessageInput from './MessageInput.vue'

const props = defineProps({
  uid: String,
  userId: String,
  userDisplayName: String,
  socketId: String
})

const closePopup = () => {
  window.parent.postMessage({ type: 'chatiumSenderWidget:close' }, '*')
}

const messages = ref([])
const isLoading = ref(true)
const isSending = ref(false)
const loadError = ref('')
const sendError = ref('')
const hasLoaded = ref(false)
const typingIndicatorVisible = ref(false)
const messagesContainer = ref(null)
const messageInputRef = ref(null)

let typingIndicatorTimeoutId = null
let typingIndicatorHideTimeoutId = null

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit'
})

const formatTime = (value) => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) {
    return timeFormatter.format(new Date())
  }
  return timeFormatter.format(date)
}

const isImageFile = (file) => {
  if (!file || typeof file.url !== 'string' || !file.url) {
    return false
  }

  if (typeof file.mime !== 'string') {
    return false
  }

  return file.mime.startsWith('image/')
}

const extractImageFiles = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return []
  }

  return items.filter(isImageFile)
}

const mapApiMessage = (message, index) => {
  const files = message.files ?? []
  const content = message.content ?? ''
  const images = extractImageFiles(files)

  return {
    id: message.id ?? `${message.role}-${index}`,
    author: message.role === 'assistant' ? 'agent' : 'user',
    text: content || (files.length ? 'Файлы отправлены' : ''),
    time: formatTime(message.createdAt),
    files,
    images
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    const container = messagesContainer.value
    if (!container) return
    container.scrollTop = container.scrollHeight
  })
}

const clearTypingIndicatorTimeouts = () => {
  if (typingIndicatorTimeoutId) {
    clearTimeout(typingIndicatorTimeoutId)
    typingIndicatorTimeoutId = null
  }
  if (typingIndicatorHideTimeoutId) {
    clearTimeout(typingIndicatorHideTimeoutId)
    typingIndicatorHideTimeoutId = null
  }
}

const hideTypingIndicator = () => {
  typingIndicatorVisible.value = false
  clearTypingIndicatorTimeouts()
}

const scheduleTypingIndicator = () => {
  clearTypingIndicatorTimeouts()
  typingIndicatorVisible.value = false

  typingIndicatorTimeoutId = window.setTimeout(() => {
    typingIndicatorVisible.value = true
    scrollToBottom()

    typingIndicatorHideTimeoutId = window.setTimeout(() => {
      hideTypingIndicator()
    }, 10000)
  }, 500)
}

const loadMessages = async (withSpinner = true) => {
  if (withSpinner) {
    isLoading.value = true
  }

  if (withSpinner || !hasLoaded.value) {
    loadError.value = ''
  }

  try {
    const response = await apiChatMessagesRoute.query({ uid: props.uid }).run(ctx)

    if (response.success) {
      const mappedMessages = (response.messages ?? []).map(mapApiMessage)
      messages.value = mappedMessages
      hasLoaded.value = true
      loadError.value = ''
      sendError.value = ''

      const lastMessage = mappedMessages[mappedMessages.length - 1]
      if (lastMessage?.author === 'agent') {
        hideTypingIndicator()
      }
    } else {
      if (!hasLoaded.value) {
        messages.value = []
        loadError.value = response.reason ?? 'Не удалось загрузить сообщения'
      } else {
        sendError.value = response.reason ?? 'Не удалось обновить сообщения'
      }
    }
  } catch (error) {
    console.error('Failed to load messages', error)
    if (!hasLoaded.value) {
      messages.value = []
      loadError.value = 'Не удалось загрузить сообщения'
    } else {
      sendError.value = 'Не удалось обновить сообщения'
    }
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

const sendMessage = async (payload) => {
  if (isSending.value) {
    return
  }

  const { text = '', files = [] } = payload ?? {}
  const trimmedText = text.trim()
  const attachments = Array.isArray(files) ? files : []

  if (!trimmedText && attachments.length === 0) {
    return
  }

  const pending = {
    id: `pending-${Date.now()}`,
    author: 'user',
    text: trimmedText || (attachments.length ? 'Отправляем файлы…' : ''),
    time: formatTime(),
    files: attachments,
    images: extractImageFiles(attachments),
    pending: true
  }

  messages.value = [...messages.value, pending]
  sendError.value = ''
  loadError.value = ''
  isSending.value = true

  try {
    const response = await apiChatSendMessageRoute.query({ uid: props.uid }).run(ctx, {
      text: trimmedText,
      files: attachments,
      userId: props.userId,
      userDisplayName: props.userDisplayName
    })

    if (response?.success === false) {
      sendError.value = response.reason ?? 'Не удалось отправить сообщение'
      messages.value = messages.value.filter((msg) => msg.id !== pending.id)
      hideTypingIndicator()
    } else {
      await loadMessages(false)
      scheduleTypingIndicator()
    }
  } catch (error) {
    console.error('Failed to send message', error)
    sendError.value = 'Не удалось отправить сообщение'
    messages.value = messages.value.filter((msg) => msg.id !== pending.id)
    hideTypingIndicator()
  } finally {
    isSending.value = false
    nextTick(() => {
      messageInputRef.value?.focus?.()
    })
  }
}

watch(messages, scrollToBottom, { deep: true })

onMounted(async () => {
  loadMessages()
  nextTick(() => {
    messageInputRef.value?.focus?.()
  })

  const socketClient = await getOrCreateBrowserSocketClient()
  const socketSubscription = socketClient.subscribeToData(props.socketId)
  socketSubscription.listen((data) => {
    console.log('Socket message received:', data)

    if (data.action === 'chat.received') {
      loadMessages(false)
    }
  })
})
</script>

<style scoped>
.chat-popup {
  --chat-background: #050b1b;
  --chat-surface: rgba(14, 31, 68, 0.92);
  --chat-surface-alt: rgba(20, 44, 96, 0.85);
  --chat-accent: #4f8cff;
  --chat-accent-strong: #2650ff;
  --chat-border: rgba(80, 115, 189, 0.2);
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  background: radial-gradient(circle at top, #0c1b3f, var(--chat-background) 65%);
  color: #f4f7ff;
}

.chat-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--chat-surface);
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.close-btn {
  position: absolute;
  top: 6px;
  right: 4px;
  background: transparent;
  border: none;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  font-size: 28px;
  line-height: 1;
  color: #e3e9ff;
  cursor: pointer;
  transition:
    background 0.25s ease,
    color 0.25s ease,
    transform 0.25s ease;
}

.close-btn:hover {
  background: rgba(7, 19, 48, 0.65);
  color: #fff;
  transform: rotate(90deg);
}

.chat-header {
  padding: 10px 20px;
  background: #14269d;
  border-bottom: 1px solid var(--chat-border);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.chat-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 2px;
}

.chat-subtitle {
  font-size: 11px;
  color: rgba(228, 233, 255, 0.72);
}

.chat-messages {
  flex: 1;
  padding: 28px 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  background: linear-gradient(180deg, rgba(7, 18, 45, 0.1) 0%, rgba(2, 10, 33, 0.5) 100%);
}

.chat-state {
  margin: auto;
  text-align: center;
  color: rgba(228, 233, 255, 0.72);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 32px 16px;
}

.chat-state__label {
  font-size: 14px;
  line-height: 1.5;
}

.chat-state--error {
  color: #ffb5c2;
}

.chat-state__retry {
  align-self: center;
  padding: 8px 18px;
  border-radius: 999px;
  background: rgba(79, 140, 255, 0.16);
  border: 1px solid rgba(79, 140, 255, 0.4);
  color: #dce5ff;
  font-size: 13px;
  cursor: pointer;
  transition:
    background 0.25s ease,
    border 0.25s ease;
}

.chat-state__retry:hover {
  background: rgba(79, 140, 255, 0.3);
  border-color: rgba(79, 140, 255, 0.6);
}

.chat-banner {
  padding: 10px 24px;
  font-size: 13px;
  background: rgba(79, 140, 255, 0.12);
  color: #d0dcff;
  border-top: 1px solid rgba(79, 140, 255, 0.3);
}

.chat-banner--error {
  background: rgba(255, 107, 129, 0.15);
  color: #ffd5dc;
  border-color: rgba(255, 107, 129, 0.35);
}

.chat-message {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 86%;
}

.chat-message--agent {
  align-self: flex-start;
}

.chat-message--user {
  align-self: flex-end;
}

.chat-message--pending .chat-message__bubble {
  opacity: 0.7;
  box-shadow: inset 0 0 0 1px rgba(79, 140, 255, 0.15);
}

.chat-message__time {
  font-size: 12px;
  color: rgba(187, 199, 233, 0.65);
}

.chat-message--pending .chat-message__time {
  color: rgba(187, 199, 233, 0.45);
}

.chat-message__bubble {
  margin: 0;
  padding: 14px 18px;
  border-radius: 16px;
  line-height: 1.4;
  font-size: 15px;
  box-shadow: inset 0 0 0 1px rgba(79, 140, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-message__text {
  margin: 0;
  white-space: pre-wrap;
}

.chat-message__attachments {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
}

.chat-message__attachment {
  margin: 0;
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
}

.chat-message__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(5, 12, 30, 0.35);
  background: rgba(12, 27, 63, 0.4);
}

.chat-message--agent .chat-message__bubble {
  background: var(--chat-surface-alt);
  color: #e8edff;
  border-bottom-left-radius: 6px;
}

.chat-message--user .chat-message__bubble {
  background: linear-gradient(160deg, var(--chat-accent-strong), var(--chat-accent));
  color: #fff;
  border-bottom-right-radius: 6px;
}

.chat-message--typing .chat-message__bubble {
  display: none;
}

.chat-message--typing .chat-message__time {
  color: rgba(207, 219, 255, 0.75);
}

.chat-typing-bubble {
  display: inline-flex;
  align-items: center;
  align-self: start;
  gap: 8px;
  padding: 12px 18px;
  border-radius: 16px;
  background: var(--chat-surface-alt);
  box-shadow:
    inset 0 0 0 1px rgba(79, 140, 255, 0.12),
    0 4px 12px rgba(6, 16, 46, 0.35);
}

.chat-typing-bubble span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff; /* rgba(46, 70, 140, 0.8); */
  animation: chat-typing-dot 1.2s infinite ease-in-out;
}

.chat-typing-bubble span:nth-child(2) {
  animation-delay: 0.15s;
}

.chat-typing-bubble span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes chat-typing-dot {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }

  40% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

.chat-input {
  display: flex;
  align-items: center;
  padding: 5px;
  border-top: 1px solid #5073bd40;
  background: #040b1eeb;
}

@media (max-width: 480px) {
  .chat-messages {
    padding: 24px 16px 12px;
  }
}
</style>
