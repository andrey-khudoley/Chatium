<template>
  <div class="hybrid-chat-screen">
    <ChatScreen
      v-if="screen"
      ref="chatScreenRef"
      :screen="screen"
      :message-grouping="true"
      :is-admin="false"
      :episode-id="episodeId"
      :current-time-seconds="currentTimeSeconds"
      :chat-access-mode="chatAccessMode"
      :hide-cta="hideCta"
      :enable-replies="false"
      :enable-reactions="false"
      @open-form="(type) => emit('openForm', type)"
      @new-incoming-message="emit('newIncomingMessage')"
    />
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import ChatScreen from '../ChatScreen/ChatScreen.vue'

const props = defineProps({
  screen: {
    type: Object,
    default: null
  },
  scenarioEvents: {
    type: Array,
    default: () => []
  },
  currentTimeSeconds: {
    type: Number,
    required: true
  },
  chatAccessMode: {
    type: String,
    default: 'open'
  },
  episodeId: String,
  hideCta: Boolean
})

const emit = defineEmits(['openForm', 'newIncomingMessage'])

const chatScreenRef = ref(null)
const injectedFakeIds = new Set()
const timelineOriginMs = ref(null)
const stableRealOffsets = new Map()
const MAX_CHAT_MESSAGES = 300

function isInjectedScenarioMessage(message) {
  return Boolean(
    message?.data?.__isScenarioMessage ||
      message?.id?.startsWith?.('fake_') ||
      message?.id?.startsWith?.('fake_banner_')
  )
}

function getTimelineBaseMs() {
  if (typeof timelineOriginMs.value !== 'number') {
    timelineOriginMs.value = Date.now() - props.currentTimeSeconds * 1000
  }
  return timelineOriginMs.value
}

function buildFakeMessage(event) {
  const tsMs = getTimelineBaseMs() + event.offsetSeconds * 1000
  const tsSec = Math.floor(tsMs / 1000)

  if (event.eventType === 'sale_banner') {
    return {
      id: `fake_banner_${event.id}`,
      text: '',
      textTokens: [],
      isOutgoing: false,
      type: 'text',
      files: [],
      blocks: [],
      canEdit: false,
      bgColor: null,
      createdAt: tsMs,
      createdAtTimestamp: tsSec,
      updatedAt: 0,
      updatedAtTimestamp: 0,
      author: {
        id: 'fake_banner_bot',
        name: 'Чатиум'
      },
      replyTo: null,
      isSameAuthor: false,
      isSameDay: true,
      data: {
        type: 'sale_banner',
        __isScenarioMessage: true,
        __scenarioEventId: event.scenarioEventId || event.id,
        __scenarioOffsetSeconds: event.offsetSeconds,
        title: event.bannerData?.title,
        subtitle: event.bannerData?.subtitle,
        buttonText: event.bannerData?.buttonText,
        formId: event.bannerData?.formId
      }
    }
  }

  const authorName = event.chatMessage?.authorName || 'Участник'
  const authorId = `fake_author_${authorName.replace(/\s+/g, '_')}`
  return {
    id: `fake_${event.id}`,
    text: event.chatMessage?.text || '',
    textTokens: [event.chatMessage?.text || ''],
    isOutgoing: false,
    type: 'text',
    files: [],
    blocks: [],
    canEdit: false,
    bgColor: null,
    createdAt: tsMs,
    createdAtTimestamp: tsSec,
    updatedAt: 0,
    updatedAtTimestamp: 0,
    author: {
      id: authorId,
      name: authorName
    },
    replyTo: null,
    isSameAuthor: false,
    isSameDay: true,
    data: {
      ...(event.chatMessage?.data || {}),
      __isScenarioMessage: true,
      __scenarioEventId: event.scenarioEventId || event.id,
      __scenarioOffsetSeconds: event.offsetSeconds
    }
  }
}

function getMessageTimestampMs(message) {
  if (typeof message?.createdAtTimestamp === 'number') return message.createdAtTimestamp * 1000
  const createdAtRaw = message?.createdAt
  if (typeof createdAtRaw === 'number') return createdAtRaw
  const parsed = createdAtRaw ? new Date(createdAtRaw).getTime() : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

function getMessageTimelineOffsetSeconds(message) {
  const scenarioOffset = message?.data?.__scenarioOffsetSeconds
  if (typeof scenarioOffset === 'number') return scenarioOffset

  const messageId = message?.id
  if (messageId && stableRealOffsets.has(messageId)) {
    return stableRealOffsets.get(messageId)
  }

  const createdAtMs = getMessageTimestampMs(message)
  if (!Number.isFinite(createdAtMs)) return Number.POSITIVE_INFINITY

  const timelineBaseMs = getTimelineBaseMs()
  let resolvedOffset = (createdAtMs - timelineBaseMs) / 1000

  // Brand-new real messages should appear after visible timeline messages.
  const isRecentMessage = Math.abs(Date.now() - createdAtMs) <= 30000
  if (isRecentMessage && resolvedOffset < props.currentTimeSeconds) {
    resolvedOffset = props.currentTimeSeconds + 0.001
  }

  if (messageId) {
    stableRealOffsets.set(messageId, resolvedOffset)
  }

  return resolvedOffset
}

function hasDuplicateRealMessage(event, realMessages) {
  const duplicateWindowSeconds = 15

  if (event.eventType === 'chat_message') {
    const eventText = String(event.chatMessage?.text || '').trim()
    const eventAuthor = String(event.chatMessage?.authorName || '').trim()
    if (!eventText) return false

    return realMessages.some((message) => {
      const msgText = String(message?.text || '').trim()
      const msgAuthor = String(message?.author?.name || '').trim()
      const offsetDelta = Math.abs(getMessageTimelineOffsetSeconds(message) - event.offsetSeconds)
      return (
        msgText === eventText && msgAuthor === eventAuthor && offsetDelta <= duplicateWindowSeconds
      )
    })
  }

  if (event.eventType === 'sale_banner') {
    return realMessages.some((message) => {
      const data = message?.data || {}
      const offsetDelta = Math.abs(getMessageTimelineOffsetSeconds(message) - event.offsetSeconds)
      return (
        data?.type === 'sale_banner' &&
        String(data?.title || '') === String(event.bannerData?.title || '') &&
        String(data?.buttonText || '') === String(event.bannerData?.buttonText || '') &&
        offsetDelta <= duplicateWindowSeconds
      )
    })
  }

  return false
}

function syncFakeMessages() {
  const store = chatScreenRef.value?.store
  if (!store) return

  const visibleEvents = props.scenarioEvents.filter((event) => {
    if (event.eventType !== 'chat_message' && event.eventType !== 'sale_banner') return false
    return event.offsetSeconds <= props.currentTimeSeconds
  })

  const realMessages = store.messages.filter((m) => !isInjectedScenarioMessage(m))
  const realMessageIds = new Set(realMessages.map((message) => message?.id).filter(Boolean))
  for (const messageId of stableRealOffsets.keys()) {
    if (!realMessageIds.has(messageId)) {
      stableRealOffsets.delete(messageId)
    }
  }

  const visibleFakeMessages = []
  const newInjectedIds = new Set()

  for (const event of visibleEvents) {
    if (hasDuplicateRealMessage(event, realMessages)) continue

    const fakeId =
      event.eventType === 'sale_banner' ? `fake_banner_${event.id}` : `fake_${event.id}`
    newInjectedIds.add(fakeId)
    visibleFakeMessages.push(buildFakeMessage(event))
  }

  injectedFakeIds.clear()
  for (const id of newInjectedIds) injectedFakeIds.add(id)

  const nextMessages = [...realMessages, ...visibleFakeMessages]
    .sort((a, b) => {
      const offsetDiff = getMessageTimelineOffsetSeconds(a) - getMessageTimelineOffsetSeconds(b)
      if (offsetDiff !== 0) return offsetDiff
      return getMessageTimestampMs(a) - getMessageTimestampMs(b)
    })
    .slice(-MAX_CHAT_MESSAGES)

  store.messages = nextMessages

  nextTick(() => {
    chatScreenRef.value?.scrollToBottom()
  })
}

watch(
  () => props.currentTimeSeconds,
  () => {
    const store = chatScreenRef.value?.store
    if (!store) return

    const hasNewVisible = props.scenarioEvents.some((event) => {
      if (event.eventType !== 'chat_message' && event.eventType !== 'sale_banner') return false
      if (event.offsetSeconds > props.currentTimeSeconds) return false
      const fakeId =
        event.eventType === 'sale_banner' ? `fake_banner_${event.id}` : `fake_${event.id}`
      return !injectedFakeIds.has(fakeId)
    })

    if (hasNewVisible) {
      syncFakeMessages()
    }
  }
)

watch(
  () => chatScreenRef.value?.store,
  (store) => {
    if (store) {
      nextTick(() => syncFakeMessages())
    }
  },
  { flush: 'post' }
)

watch(
  () => chatScreenRef.value?.store?.lastChangeId,
  (newVal, oldVal) => {
    if (newVal !== oldVal) {
      nextTick(() => syncFakeMessages())
    }
  },
  { flush: 'post' }
)

function resetFakeMessages() {
  const store = chatScreenRef.value?.store
  if (!store) return

  store.messages = store.messages.filter((m) => !isInjectedScenarioMessage(m))
  injectedFakeIds.clear()
}

function scrollToBottom() {
  chatScreenRef.value?.scrollToBottom()
}

defineExpose({ scrollToBottom, resetFakeMessages, syncFakeMessages })
</script>

<style scoped>
.hybrid-chat-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
