<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { createComponentLogger } from '../../shared/logger'

const log = createComponentLogger('CampaignSearchSelect')

declare const ctx: app.Ctx

interface Campaign {
  id: string
  title: string
}

const props = defineProps<{
  modelValue: string | null
  placeholder?: string
  disabled?: boolean
  loadCampaigns: () => Promise<{ success: boolean; campaigns?: Campaign[]; error?: string }>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const searchQuery = ref('')
const campaigns = ref<Campaign[]>([])
const isOpen = ref(false)
const isLoading = ref(false)
const error = ref('')
const highlightedIndex = ref(-1)

const selectedCampaign = computed(() => {
  if (!props.modelValue) return null
  return campaigns.value.find((c) => c.id === props.modelValue) || null
})

const filteredCampaigns = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return campaigns.value
  return campaigns.value.filter(
    (c) => c.title.toLowerCase().includes(query) || c.id.toLowerCase().includes(query)
  )
})

const displayText = computed(() => {
  if (selectedCampaign.value) {
    return selectedCampaign.value.title
  }
  return searchQuery.value
})

const loadCampaigns = async () => {
  isLoading.value = true
  error.value = ''
  try {
    const result = await props.loadCampaigns()
    if (result.success && result.campaigns) {
      campaigns.value = result.campaigns
      log.debug('Кампании загружены', { count: result.campaigns.length })
    } else {
      error.value = result.error || 'Ошибка загрузки кампаний'
      log.error('Ошибка загрузки кампаний', result.error)
    }
  } catch (e) {
    error.value = (e as Error)?.message || 'Ошибка сети'
    log.error('Ошибка сети при загрузке кампаний', e)
  } finally {
    isLoading.value = false
  }
}

const openDropdown = () => {
  if (props.disabled) return
  isOpen.value = true
  if (campaigns.value.length === 0) {
    loadCampaigns()
  }
}

const closeDropdown = () => {
  // Небольшая задержка чтобы успел обработаться клик по элементу списка
  setTimeout(() => {
    isOpen.value = false
    highlightedIndex.value = -1
    if (!props.modelValue) {
      searchQuery.value = ''
    } else if (selectedCampaign.value) {
      searchQuery.value = selectedCampaign.value.title
    }
  }, 200)
}

const selectCampaign = (campaign: Campaign) => {
  emit('update:modelValue', campaign.id)
  searchQuery.value = campaign.title
  isOpen.value = false
  highlightedIndex.value = -1
  log.debug('Кампания выбрана', { id: campaign.id, title: campaign.title })
}

const clearSelection = () => {
  emit('update:modelValue', null)
  searchQuery.value = ''
  isOpen.value = true
  loadCampaigns()
}

const onInput = () => {
  isOpen.value = true
  if (props.modelValue) {
    emit('update:modelValue', null)
  }
}

const onKeydown = (e: KeyboardEvent) => {
  if (!isOpen.value) {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      openDropdown()
      e.preventDefault()
    }
    return
  }

  switch (e.key) {
    case 'ArrowDown':
      highlightedIndex.value = Math.min(
        highlightedIndex.value + 1,
        filteredCampaigns.value.length - 1
      )
      e.preventDefault()
      break
    case 'ArrowUp':
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1)
      e.preventDefault()
      break
    case 'Enter':
      if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredCampaigns.value.length) {
        selectCampaign(filteredCampaigns.value[highlightedIndex.value])
      }
      e.preventDefault()
      break
    case 'Escape':
      closeDropdown()
      e.preventDefault()
      break
  }
}

onMounted(() => {
  if (selectedCampaign.value) {
    searchQuery.value = selectedCampaign.value.title
  }
})

watch(
  () => props.modelValue,
  (newValue) => {
    if (!newValue) {
      searchQuery.value = ''
    } else if (selectedCampaign.value) {
      searchQuery.value = selectedCampaign.value.title
    }
  }
)
</script>

<template>
  <div class="campaign-search-select">
    <div class="select-input-wrapper" :class="{ 'is-open': isOpen, 'is-disabled': disabled }">
      <input
        v-model="searchQuery"
        type="text"
        class="select-input"
        :placeholder="placeholder || 'Поиск кампании...'"
        :disabled="disabled"
        @focus="openDropdown"
        @blur="closeDropdown"
        @input="onInput"
        @keydown="onKeydown"
      />
      <div class="select-icons">
        <button
          v-if="modelValue"
          type="button"
          class="icon-btn clear-btn"
          @click.stop="clearSelection"
          title="Очистить выбор"
        >
          <i class="fas fa-times"></i>
        </button>
        <button
          type="button"
          class="icon-btn toggle-btn"
          @click.stop="isOpen ? closeDropdown() : openDropdown()"
        >
          <i class="fas" :class="isOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
        </button>
      </div>
    </div>

    <div v-if="isOpen" class="dropdown-menu">
      <div v-if="isLoading" class="dropdown-message">
        <i class="fas fa-spinner fa-spin"></i>
        Загрузка...
      </div>
      <div v-else-if="error" class="dropdown-message error">
        <i class="fas fa-exclamation-circle"></i>
        {{ error }}
      </div>
      <div v-else-if="filteredCampaigns.length === 0" class="dropdown-message">
        <i class="fas fa-search"></i>
        {{ campaigns.length === 0 ? 'Нет доступных кампаний' : 'Ничего не найдено' }}
      </div>
      <div v-else class="dropdown-list">
        <button
          v-for="(campaign, index) in filteredCampaigns"
          :key="campaign.id"
          type="button"
          class="dropdown-item"
          :class="{
            'is-selected': modelValue === campaign.id,
            'is-highlighted': highlightedIndex === index
          }"
          @click="selectCampaign(campaign)"
        >
          <span class="campaign-title">{{ campaign.title }}</span>
          <span class="campaign-id">{{ campaign.id }}</span>
          <i v-if="modelValue === campaign.id" class="fas fa-check check-icon"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.campaign-search-select {
  position: relative;
  width: 100%;
}

.select-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  transition: border-color 0.2s ease;
}

.select-input-wrapper.is-open {
  border-color: var(--color-accent);
}

.select-input-wrapper.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.select-input {
  flex: 1;
  padding: 0.6rem 0.9rem;
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--color-text);
  background: transparent;
  border: none;
  outline: none;
}

.select-input::placeholder {
  color: var(--color-text-tertiary);
}

.select-icons {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding-right: 0.5rem;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.05);
}

.clear-btn:hover {
  color: #e74c3c;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;
}

.dropdown-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.dropdown-message.error {
  color: #e74c3c;
}

.dropdown-list {
  padding: 0.25rem 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.6rem 0.9rem;
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--color-text);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.dropdown-item:hover,
.dropdown-item.is-highlighted {
  background: rgba(255, 255, 255, 0.05);
}

.dropdown-item.is-selected {
  background: rgba(211, 35, 75, 0.1);
}

.campaign-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.campaign-id {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.check-icon {
  font-size: 0.75rem;
  color: var(--color-accent);
}
</style>
