<template>
  <div
    class="flex h-screen bg-white"
    :class="{ 'overflow-hidden': isMobile && sidebarOpen }"
    :style="rootStyles"
  >
    <!-- Sidebar -->
    <div :class="sidebarClasses" :style="sidebarStyles">
      <div v-if="sidebarOpen" class="flex flex-col h-full overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between p-3 border-b border-white/10">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
              <i class="fas fa-comment text-gray-900 text-sm"></i>
            </div>
          </div>
          <button
            @click="toggleSidebar"
            class="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <i class="fas fa-bars text-lg"></i>
          </button>
        </div>

        <!-- New Chat Button -->
        <div class="p-2">
          <button
            @click="createNewChat"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-200 transition-colors text-left"
          >
            <i class="fas fa-pen text-sm"></i>
            <span class="text-sm font-medium">Новый чат</span>
          </button>
        </div>

        <!-- Menu Items -->
        <div class="flex-1 overflow-y-auto px-2 space-y-0.5">
          <!-- Chats Section -->
          <div class="pt-4 pb-2">
            <div class="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase">Чаты</div>

            <div v-if="recentChats.length === 0" class="px-3 py-4 text-sm text-gray-400">
              Еще нет ни одного чата
            </div>

            <button
              v-for="chat in recentChats"
              :key="chat.id"
              @click="loadChat(chat.id)"
              :class="[
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
                currentChatId === chat.id ? 'bg-gray-200' : 'hover:bg-gray-100'
              ]"
            >
              <span class="text-sm truncate">{{
                chat.title ||
                'Без названия от ' +
                  chat.createdAt.toJSON().replace('T', ' ').split('.').shift().replaceAll('-', '.')
              }}</span>
            </button>
          </div>
        </div>

        <!-- User Profile -->
        <div class="border-t border-gray-200 p-3">
          <button
            class="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-200 transition-colors text-left"
          >
            <div
              class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center flex-shrink-0"
            >
              <span class="text-xs font-semibold text-white">{{ userInitials }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">
                {{ userDisplayName }}
              </div>
              <div class="text-xs text-gray-500">Бесплатно</div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="isMobile && sidebarOpen"
      class="fixed inset-0 z-30 bg-black/30"
      @click="toggleSidebar"
    ></div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col relative">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <button
            v-if="isMobile || !sidebarOpen"
            @click="isMobile ? toggleSidebar() : toggleSidebarAndNewChat()"
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i class="fas fa-bars text-gray-600"></i>
          </button>

          <div class="flex items-center gap-2">
            <span class="text-lg font-semibold text-gray-900">Чат с GPT</span>
          </div>
        </div>

        <div v-if="isAdmin" class="flex items-center gap-2">
          <a
            :href="setupPageRoute.url()"
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
            title="Настройки"
          >
            <i class="fas fa-cog"></i>
          </a>
        </div>
      </div>

      <!-- Chat Area -->
      <div
        class="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-10 overflow-y-auto sm:py-16"
        v-if="!currentChatId"
      >
        <div class="w-full max-w-md sm:max-w-3xl">
          <h1 class="text-3xl font-semibold text-gray-900 text-center mb-10 sm:text-4xl sm:mb-12">
            С чего начнем?
          </h1>

          <!-- Input Area -->
          <MessageInput
            ref="topInput"
            placeholder="Спросите что-нибудь..."
            :isSending="isSending"
            @submit="handleMessageSubmit"
          />
        </div>
      </div>

      <!-- Messages Area -->
      <div v-else class="flex-1 flex flex-col overflow-hidden">
        <div ref="messagesContainer" class="flex-1 overflow-y-auto px-4 py-6">
          <div class="max-w-3xl mx-auto space-y-6">
            <div
              v-for="msg in messages"
              :key="msg.id"
              :class="['flex gap-4', msg.role === 'user' ? 'justify-end' : 'justify-start']"
            >
              <!-- Assistant Message -->
              <div v-if="msg.role === 'assistant'" class="flex gap-4 max-w-[80%]">
                <div
                  class="w-8 h-8 rounded-full bg-[#19c37d] flex items-center justify-center flex-shrink-0"
                >
                  <i class="fas fa-comment text-white text-sm"></i>
                </div>
                <div class="flex-1 space-y-4 pt-1">
                  <div
                    v-if="msg.content"
                    class="prose prose-sm max-w-none"
                    v-html="formatMessage(msg.content)"
                  ></div>

                  <div v-if="getImageFiles(msg.files).length" class="flex flex-wrap gap-3">
                    <div
                      v-for="file in getImageFiles(msg.files)"
                      :key="file.url || file.name"
                      class="group overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-0.5"
                    >
                      <button
                        type="button"
                        class="relative block focus:outline-none"
                        @click="openImagePreview(file)"
                      >
                        <img
                          :src="file.url"
                          :alt="file.name || 'attachment'"
                          class="block h-40 w-48 object-cover"
                        />
                      </button>
                      <div
                        v-if="file.name || isFiniteSize(file.size)"
                        class="flex items-center gap-3 px-3 py-2 text-[11px] text-slate-500"
                      >
                        <span v-if="file.name" class="truncate font-medium text-slate-600">
                          {{ file.name }}
                        </span>
                        <span v-if="isFiniteSize(file.size)" class="ml-auto uppercase">
                          {{ formatFileSize(file.size) }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div v-if="getAudioFiles(msg.files).length" class="flex flex-col gap-3">
                    <AudioPlayer
                      v-for="file in getAudioFiles(msg.files)"
                      :key="`assistant-audio-${file.url || file.name}`"
                      :file="file"
                    />
                  </div>
                </div>
              </div>

              <!-- User Message -->
              <div v-else class="flex gap-4 max-w-[80%]">
                <div class="flex-1 bg-[#f4f4f4] rounded-3xl px-5 py-4">
                  <div class="space-y-4">
                    <div v-if="msg.content" class="text-sm text-gray-900 whitespace-pre-wrap">
                      {{ msg.content }}
                    </div>

                    <div v-if="getImageFiles(msg.files).length" class="flex flex-wrap gap-3">
                      <div
                        v-for="file in getImageFiles(msg.files)"
                        :key="file.url || file.name"
                        class="group overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 shadow-sm transition-transform hover:-translate-y-0.5"
                      >
                        <button
                          type="button"
                          class="relative block focus:outline-none"
                          @click="openImagePreview(file)"
                        >
                          <img
                            :src="file.url"
                            :alt="file.name || 'attachment'"
                            class="block h-40 w-48 object-cover"
                          />
                        </button>
                        <div
                          v-if="file.name || isFiniteSize(file.size)"
                          class="flex items-center gap-3 px-3 py-2 text-[11px] text-slate-500"
                        >
                          <span v-if="file.name" class="truncate font-medium text-slate-600">
                            {{ file.name }}
                          </span>
                          <span v-if="isFiniteSize(file.size)" class="ml-auto uppercase">
                            {{ formatFileSize(file.size) }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div v-if="getAudioFiles(msg.files).length" class="flex flex-col gap-3">
                      <AudioPlayer
                        v-for="file in getAudioFiles(msg.files)"
                        :key="`user-audio-${file.url || file.name}`"
                        :file="file"
                      />
                    </div>
                  </div>
                </div>
                <div
                  class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center flex-shrink-0"
                >
                  <span class="text-xs font-semibold text-white">{{ userInitials }}</span>
                </div>
              </div>
            </div>

            <div
              v-if="typingIndicatorVisible && typingIndicatorChatId === currentChatId"
              class="flex gap-4 max-w-[80%]"
            >
              <div
                class="w-8 h-8 rounded-full bg-[#19c37d] flex items-center justify-center flex-shrink-0"
              >
                <i class="fas fa-comment text-white text-sm"></i>
              </div>
              <div class="flex-1 space-y-4">
                <div key="typing-indicator" class="chat-message--typing">
                  <div class="chat-typing-bubble">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area at bottom -->
        <div class="p-4">
          <div class="mx-auto w-full max-w-3xl">
            <MessageInput
              ref="bottomInput"
              placeholder="Спросите что-нибудь..."
              :isSending="isSending"
              @submit="handleMessageSubmit"
            />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Image Preview Modal -->
  <div
    v-if="previewImage"
    class="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    @click.self="closeImagePreview"
  >
    <div class="relative max-h-[90vh] w-full max-w-4xl px-6">
      <button
        type="button"
        class="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
        @click="closeImagePreview"
      >
        <i class="fas fa-times text-lg"></i>
      </button>

      <div class="overflow-hidden rounded-3xl bg-white/10 p-4 shadow-2xl">
        <img
          :src="previewImage.url"
          :alt="previewImage.name || 'attachment preview'"
          class="mx-auto max-h-[70vh] w-full rounded-2xl object-contain"
        />

        <div
          v-if="previewImage.name || isFiniteSize(previewImage.size)"
          class="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80"
        >
          <span v-if="previewImage.name" class="font-medium">
            {{ previewImage.name }}
          </span>
          <span v-if="isFiniteSize(previewImage.size)" class="text-white/60">
            {{ formatFileSize(previewImage.size) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import MessageInput from '../components/MessageInput.vue'
import AudioPlayer from '../components/AudioPlayer.vue'
import {
  apiChatsListRoute,
  apiChatsCreateRoute,
  apiChatMessagesRoute,
  apiChatSendMessageRoute
} from '../api/chats'
import { setupPageRoute } from '../setup'
import { getOrCreateBrowserSocketClient } from '@app/socket'

const props = defineProps({
  socketId: String,
  isAdmin: {
    type: Boolean,
    default: false
  }
})

const sidebarOpen = ref(true)
const isMobile = ref(false)
const sidebarClasses = computed(() => {
  const base = 'flex flex-col flex-none bg-[#f5f5f5] text-gray-900 overflow-hidden'

  if (isMobile.value) {
    return [
      `${base} fixed inset-y-0 left-0 z-40 h-full transition-transform duration-300`,
      sidebarOpen.value
        ? 'w-full translate-x-0 shadow-xl'
        : 'w-full -translate-x-full pointer-events-none'
    ]
  }

  return [`${base} transition-[width] duration-300`, sidebarOpen.value ? 'w-64' : 'w-0']
})

const sidebarStyles = computed(() => {
  if (isMobile.value && !sidebarOpen.value) {
    return { width: '0', flexBasis: '0' }
  }

  return {}
})

const rootStyles = computed(() => ({
  height: '100svh',
  minHeight: '100svh'
}))
const currentChatId = ref(null)
const messages = ref([])
const messagesContainer = ref(null)
const typingIndicatorVisible = ref(false)
const typingIndicatorChatId = ref(null)
const isSending = ref(false)
const hasAppliedInitialChatId = ref(false)

const recentChats = ref([])
const previewImage = ref(null)
const topInput = ref(null)
const bottomInput = ref(null)

const getChatIdFromUrl = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const searchParams = new URLSearchParams(window.location.search)
  return searchParams.get('id')
}

const updateUrlWithChatId = (chatId) => {
  if (typeof window === 'undefined') {
    return
  }

  const url = new URL(window.location.href)

  if (chatId !== null && chatId !== undefined && `${chatId}` !== '') {
    url.searchParams.set('id', chatId)
  } else {
    url.searchParams.delete('id')
  }

  window.history.replaceState(null, '', url)
}

const initialChatIdFromUrl = getChatIdFromUrl()

let typingIndicatorTimeoutId = null
let typingIndicatorHideTimeoutId = null

const fallbackDisplayName = 'Аноним'

const userDisplayName = computed(() => {
  const rawName = ctx?.user?.displayName
  const normalized = typeof rawName === 'string' ? rawName.trim() : ''
  return normalized || fallbackDisplayName
})

const userInitials = computed(() => {
  const words = userDisplayName.value.trim().split(/\s+/).filter(Boolean)

  if (!words.length) {
    return fallbackDisplayName.slice(0, 2).toUpperCase()
  }

  const letters = words
    .slice(0, 2)
    .map((word) => word[0] || '')
    .join('')

  const fallback = words[0].slice(0, 2)

  return (letters || fallback).toUpperCase()
})

const getImageFiles = (files) =>
  (files || []).filter((file) => file?.mime?.startsWith('image/') && (file?.url || file?.thumbnail))

const getAudioFiles = (files) =>
  (files || []).filter((file) => {
    if (!file) {
      return false
    }
    const source = file.url || file.downloadUrl
    return Boolean(source) && file?.mime?.startsWith('audio/')
  })

const isFiniteSize = (value) => Number.isFinite(value) && value > 0

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const size = bytes / Math.pow(1024, exponent)

  const formatted = size < 10 && exponent > 0 ? size.toFixed(1) : size.toFixed(0)

  return `${formatted} ${units[exponent]}`
}

const openImagePreview = (file) => {
  previewImage.value = file
}

const closeImagePreview = () => {
  previewImage.value = null
}

const updateResponsiveState = () => {
  if (typeof window === 'undefined') {
    return
  }

  const mobile = window.matchMedia('(max-width: 1023px)').matches

  if (mobile !== isMobile.value) {
    isMobile.value = mobile
    sidebarOpen.value = mobile ? false : true
  }
}

const focusMessageInput = () => {
  const inputRef = currentChatId.value ? bottomInput.value : topInput.value
  inputRef?.focus?.()
}

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const toggleSidebarAndNewChat = () => {
  toggleSidebar()
  if (!isMobile.value) {
    createNewChat()
  }
}

const createNewChat = () => {
  currentChatId.value = null
  messages.value = []
  updateUrlWithChatId(null)
  if (isMobile.value) {
    sidebarOpen.value = false
  }
  nextTick(() => {
    focusMessageInput()
  })
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const loadChat = async (chatId) => {
  currentChatId.value = chatId
  updateUrlWithChatId(chatId)
  if (isMobile.value) {
    sidebarOpen.value = false
  }

  const response = await apiChatMessagesRoute({ id: chatId }).run(ctx)
  if (response.success) {
    hideTypingIndicator(chatId)
    messages.value = response.messages
    await scrollToBottom()
    await nextTick()
    focusMessageInput()
  }
}

const handleMessageSubmit = async ({ text, files }) => {
  if (text || files.length > 0) {
    isSending.value = true
    if (currentChatId.value) {
      // Send message to existing chat
      const targetChatId = currentChatId.value
      const pending = {
        id: `pending-${Date.now()}`,
        role: 'user',
        content: text,
        files: [],
        pending: true
      }

      messages.value = [...messages.value, pending]
      await scrollToBottom()

      try {
        const response = await apiChatSendMessageRoute({
          id: targetChatId
        }).run(ctx, {
          text,
          files
        })

        if (response.success) {
          // Reload messages
          if (currentChatId.value === targetChatId) {
            await loadChat(targetChatId)
          }
          scheduleTypingIndicator(targetChatId)
        } else {
          messages.value = messages.value.filter((msg) => msg.id !== pending.id)
          hideTypingIndicator(targetChatId)
        }
      } catch (error) {
        console.error('Failed to send message', error)
        messages.value = messages.value.filter((msg) => msg.id !== pending.id)
        hideTypingIndicator(targetChatId)
      } finally {
        isSending.value = false
      }
    } else {
      // Create new chat
      try {
        const response = await apiChatsCreateRoute.run(ctx, {
          text,
          files
        })

        if (response.success && response.chat) {
          recentChats.value.unshift(response.chat)
          const newChatId = response.chat.id
          await loadChat(newChatId)
          scheduleTypingIndicator(newChatId)
        }
      } finally {
        isSending.value = false
      }
    }
  }
}

const formatMessage = (content) => {
  // Basic markdown-like formatting
  let formatted = content
    .replace(/\n/g, '<br>')
    .replace(/## (.*?)(<br>|$)/g, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    .replace(/### (.*?)(<br>|$)/g, '<h3 class="text-base font-semibold mt-3 mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(
      /`(.*?)`/g,
      '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>'
    )
    .replace(/- (.*?)(<br>|$)/g, '<li class="ml-4">$1</li>')
    .replace(/👉/g, '<span class="inline-block mr-1">👉</span>')
    .replace(/👍/g, '<span class="inline-block mr-1">👍</span>')
    .replace(/❌/g, '<span class="inline-block mr-1">❌</span>')

  // Wrap consecutive <li> elements in <ul>
  formatted = formatted.replace(/(<li.*?<\/li>)+/g, (match) => {
    return '<ul class="list-disc my-2">' + match + '</ul>'
  })

  return formatted
}

// Load chats on mount
async function fetchChats() {
  const response = await apiChatsListRoute.run(ctx)
  if (response.success) {
    recentChats.value = response.chats
  }

  if (!hasAppliedInitialChatId.value && initialChatIdFromUrl) {
    hasAppliedInitialChatId.value = true
    await loadChat(initialChatIdFromUrl)
  }
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

const hideTypingIndicator = (chatId = typingIndicatorChatId.value) => {
  if (chatId && typingIndicatorChatId.value !== chatId) {
    return
  }

  typingIndicatorVisible.value = false
  typingIndicatorChatId.value = null
  clearTypingIndicatorTimeouts()
}

const scheduleTypingIndicator = (targetChatId = currentChatId.value) => {
  if (!targetChatId) {
    return
  }

  clearTypingIndicatorTimeouts()
  typingIndicatorVisible.value = false
  typingIndicatorChatId.value = targetChatId

  typingIndicatorTimeoutId = window.setTimeout(() => {
    typingIndicatorTimeoutId = null

    if (typingIndicatorChatId.value !== targetChatId) {
      return
    }

    typingIndicatorVisible.value = true

    if (currentChatId.value === targetChatId) {
      scrollToBottom()
    }

    typingIndicatorHideTimeoutId = window.setTimeout(() => {
      typingIndicatorHideTimeoutId = null

      if (typingIndicatorChatId.value !== targetChatId) {
        return
      }

      hideTypingIndicator(targetChatId)
    }, 20000)
  }, 500)
}

onMounted(async () => {
  updateResponsiveState()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateResponsiveState)
  }

  fetchChats()
  nextTick(() => {
    focusMessageInput()
  })

  const socketClient = await getOrCreateBrowserSocketClient()
  const socketSubscription = socketClient.subscribeToData(props.socketId)
  socketSubscription.listen((data) => {
    console.log('Socket message received:', data)

    if (data.action === 'chat.received') {
      if (data.chatId === currentChatId.value) {
        loadChat(currentChatId.value)
      }
    }
  })
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateResponsiveState)
  }
})
</script>

<style scoped>
/* Custom scrollbar for sidebar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.chat-message--typing {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.chat-typing-bubble {
  display: inline-flex;
  align-items: center;
  align-self: start;
  gap: 8px;
  padding: 12px 18px;
  border-radius: 16px;
  background: #f4f4f4;
}

.chat-typing-bubble span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #444;
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
</style>
