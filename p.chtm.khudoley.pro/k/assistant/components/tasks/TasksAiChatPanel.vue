<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { createComponentLogger } from '../../shared/logger'
import { sortTaskAiChatMessagesForDisplay } from '../../shared/tasks-ai-chat-message-order'

type ChatAuthor = {
  id?: string
  name?: string
  avatar?: { image?: string; iconCssClass?: string; bgColor?: string }
}

type ChatMessage = {
  id: string
  text?: string | null
  createdAt?: number
  createdAtTimestamp?: number
  author?: ChatAuthor
  isOutgoing?: boolean
  data?: { assistant?: boolean }
  sending?: boolean
}

type ChatScreenJson = {
  messages_get_url?: string
  messages_add_url?: string
  messages_changes_url?: string
  messages_socket_id?: string
  current_author?: ChatAuthor
}

const props = defineProps<{
  projectId: string | null
  isAuthenticated: boolean
  ensureUrl: string
  resetUrl: string
}>()

const emit = defineEmits<{
  /** После ответа ассистента в фиде список задач на сервере мог измениться (JSON-actions). */
  (e: 'tasks-maybe-changed'): void
}>()

const log = createComponentLogger('TasksAiChatPanel')

const screen = ref<ChatScreenJson | null>(null)
const messages = ref<ChatMessage[]>([])
const lastChangeId = ref<string | null>(null)
const loadError = ref('')
const booting = ref(false)
const sending = ref(false)
const awaitingAssistant = ref(false)
const inputText = ref('')
const listRef = ref<HTMLElement | null>(null)

let socketDisposer: (() => void) | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let assistantWaitTimer: ReturnType<typeof setInterval> | null = null

const canUseChat = computed(
  () => props.isAuthenticated && !!props.projectId && !!screen.value?.messages_add_url
)

function newMessageId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
  } catch {
    // ignore
  }
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  })
  return r.json() as Promise<T>
}

function scrollToBottom() {
  nextTick(() => {
    const el = listRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

async function fetchMessages() {
  const url = screen.value?.messages_get_url
  if (!url) return
  const r = await fetch(url, { credentials: 'include' })
  const body = (await r.json()) as {
    success?: boolean
    data?: { messages: ChatMessage[]; lastChangeId: string }
  }
  if (body.success && body.data) {
    messages.value = sortTaskAiChatMessagesForDisplay([...body.data.messages])
    lastChangeId.value = body.data.lastChangeId
    scrollToBottom()
  }
}

async function fetchChanges() {
  const base = screen.value?.messages_changes_url
  if (!base) return
  const url =
    base + (lastChangeId.value ? (base.includes('?') ? '&' : '?') + 'lastKnownChangeId=' + lastChangeId.value : '')
  const r = await fetch(url, { credentials: 'include' })
  const body = (await r.json()) as {
    success?: boolean
    changes?: { id: string; prevId?: string | null; operation: string; messageId?: string; message?: ChatMessage }[]
  }
  if (body.success !== true || !body.changes?.length) return

  const { changes } = body
  if (changes.length > 0 && changes[0].prevId === lastChangeId.value) {
    let assistantReplyAdded = false
    for (const change of changes) {
      if (change.operation === 'create' && change.message) {
        if (!messages.value.some((m) => m.id === change.message!.id)) {
          messages.value.push(change.message!)
          if (change.message.data?.assistant) {
            assistantReplyAdded = true
          }
        }
      } else if (change.operation === 'update' && change.messageId) {
        const idx = messages.value.findIndex((m) => m.id === change.messageId)
        if (idx !== -1 && change.message) {
          messages.value[idx] = { ...messages.value[idx], ...change.message }
        }
      } else if (change.operation === 'delete' && change.messageId) {
        messages.value = messages.value.filter((m) => m.id !== change.messageId)
      }
    }
    messages.value = sortTaskAiChatMessagesForDisplay(messages.value)
    lastChangeId.value = changes[changes.length - 1]!.id
    scrollToBottom()
    checkAssistantDone()
    if (assistantReplyAdded) {
      emit('tasks-maybe-changed')
    }
  } else if (changes.length > 0) {
    await fetchMessages()
    checkAssistantDone()
  }
}

function lastMessageIsAssistant(): boolean {
  const list = messages.value
  if (!list.length) return false
  const last = list[list.length - 1]!
  return Boolean(last.data?.assistant)
}

function checkAssistantDone() {
  if (awaitingAssistant.value && lastMessageIsAssistant()) {
    awaitingAssistant.value = false
    if (assistantWaitTimer) {
      clearInterval(assistantWaitTimer)
      assistantWaitTimer = null
    }
  }
}

function startAssistantWait() {
  awaitingAssistant.value = true
  if (assistantWaitTimer) clearInterval(assistantWaitTimer)
  assistantWaitTimer = setInterval(() => {
    void fetchChanges()
  }, 1500)
  setTimeout(() => {
    if (awaitingAssistant.value) {
      awaitingAssistant.value = false
      if (assistantWaitTimer) {
        clearInterval(assistantWaitTimer)
        assistantWaitTimer = null
      }
    }
  }, 120_000)
}

async function ensureChat() {
  if (!props.isAuthenticated || !props.projectId) {
    screen.value = null
    messages.value = []
    return
  }
  booting.value = true
  loadError.value = ''
  try {
    const j = await postJson<{ success?: boolean; chat?: ChatScreenJson; error?: string }>(props.ensureUrl, {
      projectId: props.projectId
    })
    if (!j.success || !j.chat) {
      loadError.value = j.error ?? 'Не удалось открыть чат'
      screen.value = null
      return
    }
    screen.value = j.chat
    await fetchMessages()
    setupSocket()
  } catch (e) {
    loadError.value = String(e)
    screen.value = null
  } finally {
    booting.value = false
  }
}

async function setupSocket() {
  if (socketDisposer) {
    socketDisposer()
    socketDisposer = null
  }
  const sid = screen.value?.messages_socket_id
  if (!sid) return
  try {
    const socketStore = await getOrCreateBrowserSocketClient()
    socketDisposer = socketStore.subscribeToSocket(sid, async () => {
      await fetchChanges()
    })
  } catch (e) {
    log.warning('WebSocket недоступен', String(e))
  }
}

async function onReset() {
  if (!props.projectId || !props.isAuthenticated) return
  if (!confirm('Очистить историю чата с AI для этого проекта?')) return
  loadError.value = ''
  try {
    const j = await postJson<{ success?: boolean; error?: string }>(props.resetUrl, { projectId: props.projectId })
    if (!j.success) {
      loadError.value = j.error ?? 'Не удалось сбросить чат'
      return
    }
    await ensureChat()
  } catch (e) {
    loadError.value = String(e)
  }
}

async function sendMessage() {
  const text = inputText.value.trim()
  const addUrl = screen.value?.messages_add_url
  if (!text || !addUrl || sending.value) return

  const id = newMessageId()
  const optimistic: ChatMessage = {
    id,
    text,
    createdAt: Date.now(),
    author: screen.value?.current_author as ChatAuthor | undefined,
    isOutgoing: true,
    sending: true
  }
  messages.value.push(optimistic)
  inputText.value = ''
  scrollToBottom()

  sending.value = true
  startAssistantWait()
  try {
    const r = await fetch(addUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id,
        text,
        asGroup: false
      })
    })
    const body = (await r.json()) as { success?: boolean; error?: string }
    const idx = messages.value.findIndex((m) => m.id === id)
    if (body.success === true) {
      if (idx !== -1) {
        messages.value[idx] = { ...messages.value[idx], sending: false }
      }
      await fetchChanges()
    } else {
      messages.value = messages.value.filter((m) => m.id !== id)
      loadError.value = body.error ?? 'Не отправилось'
      awaitingAssistant.value = false
      if (assistantWaitTimer) {
        clearInterval(assistantWaitTimer)
        assistantWaitTimer = null
      }
    }
  } catch (e) {
    messages.value = messages.value.filter((m) => m.id !== id)
    loadError.value = String(e)
    awaitingAssistant.value = false
    if (assistantWaitTimer) {
      clearInterval(assistantWaitTimer)
      assistantWaitTimer = null
    }
  } finally {
    sending.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    void sendMessage()
  }
}

watch(
  () => props.projectId,
  () => {
    void ensureChat()
  }
)

watch(
  () => props.isAuthenticated,
  (v) => {
    if (v && props.projectId) void ensureChat()
    if (!v) {
      screen.value = null
      messages.value = []
    }
  }
)

onMounted(() => {
  void ensureChat()
  pollTimer = setInterval(() => {
    void fetchChanges()
  }, 8000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
  if (assistantWaitTimer) clearInterval(assistantWaitTimer)
  assistantWaitTimer = null
  if (socketDisposer) socketDisposer()
  socketDisposer = null
})
</script>

<template>
  <div class="tasks-ai-chat" aria-label="Чат с AI">
    <div class="tasks-ai-chat-head">
      <span class="tasks-ai-chat-title">AI</span>
      <div class="tasks-ai-chat-head-actions">
        <button
          type="button"
          class="tasks-ai-chat-reset"
          :disabled="!canUseChat || booting"
          title="Очистить историю чата"
          @click="onReset"
        >
          <i class="fas fa-rotate-left" aria-hidden="true" />
        </button>
      </div>
    </div>

    <p v-if="!isAuthenticated" class="tasks-ai-chat-hint">Войдите, чтобы писать ассистенту.</p>
    <p v-else-if="!projectId" class="tasks-ai-chat-hint">Выберите проект.</p>
    <p v-else-if="booting" class="tasks-ai-chat-hint">Подключение…</p>
    <p v-else-if="loadError" class="tasks-ai-chat-err" role="alert">{{ loadError }}</p>

    <div v-else ref="listRef" class="tasks-ai-chat-messages" role="log" aria-live="polite">
      <div
        v-for="m in messages"
        :key="m.id"
        class="tasks-ai-chat-row"
        :class="{ 'tasks-ai-chat-row--out': m.isOutgoing && !m.data?.assistant }"
      >
        <div class="tasks-ai-chat-bubble">
          <div class="tasks-ai-chat-meta">
            <span class="tasks-ai-chat-author">{{ m.author?.name || '…' }}</span>
            <span v-if="m.sending" class="tasks-ai-chat-sending">отправка…</span>
          </div>
          <div class="tasks-ai-chat-text">{{ m.text }}</div>
        </div>
      </div>
      <div v-if="awaitingAssistant" class="tasks-ai-chat-typing">Ассистент печатает…</div>
    </div>

    <div class="tasks-ai-chat-footer">
      <textarea
        v-model="inputText"
        class="tasks-ai-chat-input"
        rows="2"
        maxlength="8000"
        placeholder="Сообщение… Например: поставь встречу на завтра 14:00 и напомни за 15 минут"
        :disabled="!canUseChat || booting"
        @keydown="onKeydown"
      />
      <button
        type="button"
        class="tasks-ai-chat-send journal-nav-action"
        :disabled="!canUseChat || booting || sending || !inputText.trim()"
        @click="sendMessage"
      >
        Отправить
      </button>
    </div>
  </div>
</template>

<style scoped>
.tasks-ai-chat {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.28);
  max-height: calc(100vh - 8rem);
}

.tasks-ai-chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.65rem;
  border-bottom: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.tasks-ai-chat-title {
  font-size: 0.84rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.tasks-ai-chat-head-actions {
  display: flex;
  gap: 0.25rem;
}

.tasks-ai-chat-reset {
  width: 1.75rem;
  height: 1.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  border-radius: 2px;
  cursor: pointer;
  font-size: 0.86rem;
}

.tasks-ai-chat-reset:hover:not(:disabled) {
  color: var(--color-accent-hover);
  border-color: var(--color-accent);
}

.tasks-ai-chat-reset:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tasks-ai-chat-hint,
.tasks-ai-chat-err {
  margin: 0;
  padding: 0.65rem 0.75rem;
  font-size: 0.84rem;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.tasks-ai-chat-err {
  color: var(--color-accent-hover);
}

.tasks-ai-chat-messages {
  flex: 1 1 auto;
  min-height: 180px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0.5rem 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.tasks-ai-chat-row {
  display: flex;
  justify-content: flex-start;
}

.tasks-ai-chat-row--out {
  justify-content: flex-end;
}

.tasks-ai-chat-bubble {
  max-width: 92%;
  padding: 0.4rem 0.55rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.tasks-ai-chat-row--out .tasks-ai-chat-bubble {
  background: rgba(211, 35, 75, 0.12);
  border-color: rgba(211, 35, 75, 0.35);
}

.tasks-ai-chat-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.2rem;
}

.tasks-ai-chat-author {
  font-size: 0.74rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.tasks-ai-chat-sending {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
  font-style: italic;
}

.tasks-ai-chat-text {
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--color-text);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.tasks-ai-chat-typing {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  font-style: italic;
  padding: 0.15rem 0.25rem;
}

.tasks-ai-chat-footer {
  flex-shrink: 0;
  padding: 0.5rem 0.55rem 0.6rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  background: rgba(0, 0, 0, 0.15);
}

.tasks-ai-chat-input {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  min-height: 2.5rem;
  max-height: 8rem;
  padding: 0.45rem 0.5rem;
  font-family: inherit;
  font-size: 0.88rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: 2px;
}

.tasks-ai-chat-send {
  align-self: flex-end;
  width: auto;
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
}

@media (max-width: 1023px) {
  .tasks-ai-chat {
    max-height: min(70vh, 32rem);
  }
}
</style>
