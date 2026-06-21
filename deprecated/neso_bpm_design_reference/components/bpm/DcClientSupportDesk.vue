<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DcClientContactPanel from './DcClientContactPanel.vue'
import DcClientConversationPanel from './DcClientConversationPanel.vue'
import DcClientThreadList from './DcClientThreadList.vue'
import type {
  ClientMessageEntry,
  ClientProfile,
  ClientThread
} from '../../shared/clientSupportDemo'

const props = defineProps<{
  title: string
  subtitle?: string
  threads: ClientThread[]
  messages: Record<string, ClientMessageEntry[]>
  profiles: Record<string, ClientProfile>
}>()

const activeFilter = ref<'all' | 'unread' | 'mine'>('all')
const search = ref('')
const selectedThreadId = ref('')

watch(
  () => props.threads,
  () => {
    if (
      !selectedThreadId.value ||
      !props.threads.find((thread) => thread.id === selectedThreadId.value)
    ) {
      selectedThreadId.value = props.threads[0]?.id || ''
    }
  },
  { immediate: true, deep: true }
)

const visibleThreads = computed(() => {
  const q = search.value.trim().toLowerCase()

  return props.threads.filter((thread) => {
    if (activeFilter.value === 'unread' && thread.unread <= 0) return false
    if (activeFilter.value === 'mine' && !thread.mine) return false
    if (!q) return true

    return (
      thread.clientName.toLowerCase().includes(q) ||
      thread.managerName.toLowerCase().includes(q) ||
      thread.preview.toLowerCase().includes(q)
    )
  })
})

const selectedThread = computed(() => {
  const fallback = visibleThreads.value[0] || props.threads[0]
  return props.threads.find((thread) => thread.id === selectedThreadId.value) || fallback
})

const selectedMessages = computed(() => {
  const id = selectedThread.value?.id
  if (!id) return []
  return props.messages[id] || []
})

const selectedProfile = computed(() => {
  const id = selectedThread.value?.id
  if (!id) return undefined

  return (
    props.profiles[id] || {
      id,
      name: selectedThread.value?.clientName || 'Клиент',
      externalId: 'N/A',
      phone: 'Не указан',
      email: 'Не указан',
      owner: selectedThread.value?.managerName || 'Не указан',
      dealStatus: 'Нет данных',
      tags: ['support'],
      lists: ['general'],
      variables: []
    }
  )
})

const filters = computed(() => [
  { id: 'all', label: 'Все', count: props.threads.length },
  {
    id: 'unread',
    label: 'Непрочитанные',
    count: props.threads.filter((thread) => thread.unread > 0).length
  },
  { id: 'mine', label: 'Мои', count: props.threads.filter((thread) => thread.mine).length }
])
</script>

<template>
  <section class="dc-client-support-desk">
    <header class="dc-client-support-desk__header">
      <div>
        <h3>{{ title }}</h3>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>

      <div class="dc-client-support-desk__state">
        <span>Линия поддержки</span>
        <strong>Online</strong>
      </div>
    </header>

    <div class="dc-client-support-desk__workspace" v-if="selectedThread && selectedProfile">
      <DcClientThreadList
        title="Клиенты"
        search-placeholder="Найти клиента по id или имени"
        :search-value="search"
        :filters="filters"
        :active-filter="activeFilter"
        :threads="visibleThreads"
        :selected-thread-id="selectedThread.id"
        @select-thread="selectedThreadId = $event"
        @change-filter="activeFilter = $event"
        @update-search="search = $event"
      />

      <DcClientConversationPanel :thread="selectedThread" :entries="selectedMessages" />

      <DcClientContactPanel :profile="selectedProfile" />
    </div>
  </section>
</template>

<style scoped>
.dc-client-support-desk {
  border-radius: var(--radius-lg);
  border: 1px solid color-mix(in srgb, var(--border-soft) 74%, transparent);
  background: color-mix(in srgb, var(--surface-1) 92%, #fff);
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 760px;
}

.dc-client-support-desk__header {
  min-height: 56px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-soft) 70%, transparent);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--surface-2) 95%, #fff);
}

.dc-client-support-desk__header h3 {
  margin: 0;
  font-size: 0.9rem;
}

.dc-client-support-desk__header p {
  margin: 3px 0 0;
  font-size: 0.69rem;
  color: var(--text-tertiary);
}

.dc-client-support-desk__state {
  display: grid;
  justify-items: end;
  gap: 2px;
}

.dc-client-support-desk__state span {
  font-size: 0.62rem;
  color: var(--text-tertiary);
}

.dc-client-support-desk__state strong {
  font-size: 0.68rem;
  color: color-mix(in srgb, var(--status-success) 82%, var(--text-primary));
}

.dc-client-support-desk__workspace {
  min-height: 0;
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr) 330px;
  background: color-mix(in srgb, var(--surface-1) 97%, #fff);
}

@media (max-width: 1320px) {
  .dc-client-support-desk__workspace {
    grid-template-columns: 320px minmax(0, 1fr);
  }
}

@media (max-width: 1120px) {
  .dc-client-support-desk {
    min-height: 980px;
  }

  .dc-client-support-desk__workspace {
    grid-template-columns: 1fr;
  }
}
</style>
