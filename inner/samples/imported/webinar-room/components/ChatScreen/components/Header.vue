<script setup lang="ts">
import { computed } from 'vue'
import { useChatScreenContext } from '../contexts/ChatScreenContext'

const props = defineProps<{
  onlineCount?: number
}>()

const store = useChatScreenContext()

const formattedCount = computed(() => {
  const count = props.onlineCount ?? 0
  return count.toLocaleString('ru-RU')
})

const isMobile = computed(() => window.innerWidth < 768)

const defaultTitle = computed(() => {
  return isMobile.value ? 'Чат' : 'Чат эфира'
})
</script>

<template>
  <div class="Header">
    <div class="HeaderTop">
      <div class="HeaderLeft">
        <div class="HeaderTitle">
          {{ store.chat.title || defaultTitle }}
        </div>

        <div v-if="store.chat.description" class="HeaderDescription">
          {{ store.chat.description }}
        </div>
      </div>

      <div
        v-if="props.onlineCount !== undefined"
        class="HeaderOnline"
        :title="`Сейчас смотрят: ${props.onlineCount}`"
      >
        <i class="fas fa-eye"></i>
        <span>{{ formattedCount }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.Header {
  box-sizing: border-box;
  border-bottom: 1px solid var(--wr-border-light);
  background: var(--wr-chat-header-bg);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
  padding: 12px 16px;
  font-family: var(--chat-font-family);
}

.HeaderTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.HeaderLeft {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.HeaderTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--wr-text-primary);
  letter-spacing: -0.01em;
}

.HeaderDescription {
  font-size: 12px;
  color: var(--wr-text-tertiary);
  margin-top: 3px;
}

.HeaderOnline {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--wr-btn-subtle-bg);
  flex-shrink: 0;
  cursor: default;
}

.HeaderOnline i {
  font-size: 11px;
  color: var(--wr-text-tertiary);
}

.HeaderOnline span {
  font-size: 12px;
  font-weight: 500;
  color: var(--wr-text-secondary);
  tabular-nums: tabular-nums;
}
</style>
