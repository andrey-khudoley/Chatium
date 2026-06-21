<template>
  <div
    ref="selectRoot"
    class="custom-select"
    :class="[
      sizeClass,
      {
        'custom-select--open': isOpen,
        'custom-select--disabled': disabled,
        'custom-select--focus': isOpen
      }
    ]"
  >
    <button
      ref="triggerBtn"
      type="button"
      class="custom-select__trigger"
      :disabled="disabled"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <span class="custom-select__value" :class="{ 'custom-select__placeholder': !hasValue }">
        {{ displayLabel }}
      </span>
      <span class="custom-select__arrow">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </button>

    <Teleport to="body">
      <Transition name="cs-dropdown">
        <div
          v-if="isOpen"
          ref="dropdownEl"
          class="custom-select__dropdown"
          :style="dropdownStyle"
          @mousedown.prevent
        >
          <div v-if="parsedOptions.length > 6" class="custom-select__search-wrap">
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              class="custom-select__search"
              placeholder="Поиск..."
              @keydown="onSearchKeydown"
            />
          </div>
          <div class="custom-select__options" ref="optionsContainer">
            <div
              v-for="(opt, idx) in filteredOptions"
              :key="opt.value"
              class="custom-select__option"
              :class="{
                'custom-select__option--selected': opt.value === modelValue,
                'custom-select__option--focused': idx === focusedIndex
              }"
              @click="selectOption(opt)"
              @mouseenter="focusedIndex = idx"
            >
              <span class="custom-select__option-label">{{ opt.label }}</span>
              <svg
                v-if="opt.value === modelValue"
                class="custom-select__check"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
              >
                <path
                  d="M3 7L6 10L11 4"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <div v-if="filteredOptions.length === 0" class="custom-select__no-results">
              Ничего не найдено
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, Boolean], default: '' },
  options: { type: Array, required: true },
  placeholder: { type: String, default: 'Выберите...' },
  disabled: { type: Boolean, default: false },
  size: { type: String, default: 'md' }
})

const emit = defineEmits(['update:modelValue'])

const selectRoot = ref(null)
const triggerBtn = ref(null)
const dropdownEl = ref(null)
const searchInput = ref(null)
const optionsContainer = ref(null)
const isOpen = ref(false)
const searchQuery = ref('')
const focusedIndex = ref(-1)
const dropdownStyle = ref({})

const sizeClass = computed(() => `custom-select--${props.size}`)

const parsedOptions = computed(() => {
  return props.options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return { value: opt.value ?? '', label: opt.label ?? String(opt.value ?? '') }
    }
    return { value: opt, label: String(opt) }
  })
})

const filteredOptions = computed(() => {
  if (!searchQuery.value.trim()) return parsedOptions.value
  const q = searchQuery.value.toLowerCase().trim()
  return parsedOptions.value.filter((opt) => opt.label.toLowerCase().includes(q))
})

const hasValue = computed(() => {
  return props.modelValue !== '' && props.modelValue !== null && props.modelValue !== undefined
})

const displayLabel = computed(() => {
  if (!hasValue.value) return props.placeholder
  const found = parsedOptions.value.find((o) => o.value === props.modelValue)
  return found ? found.label : String(props.modelValue)
})

function positionDropdown() {
  if (!triggerBtn.value) return
  const rect = triggerBtn.value.getBoundingClientRect()
  const viewportH = window.innerHeight
  const spaceBelow = viewportH - rect.bottom
  const spaceAbove = rect.top
  const dropHeight = Math.min(
    320,
    filteredOptions.value.length * 40 + (parsedOptions.value.length > 6 ? 48 : 0) + 12
  )
  const openBelow = spaceBelow >= dropHeight || spaceBelow >= spaceAbove

  dropdownStyle.value = {
    position: 'fixed',
    left: rect.left + 'px',
    width: rect.width + 'px',
    zIndex: '99999',
    ...(openBelow ? { top: rect.bottom + 4 + 'px' } : { bottom: viewportH - rect.top + 4 + 'px' })
  }
}

function toggle() {
  if (props.disabled) return
  if (isOpen.value) {
    close()
  } else {
    open()
  }
}

function open() {
  isOpen.value = true
  searchQuery.value = ''
  focusedIndex.value = -1
  nextTick(() => {
    positionDropdown()
    if (parsedOptions.value.length > 6 && searchInput.value) {
      searchInput.value.focus()
    }
    const selectedIdx = filteredOptions.value.findIndex((o) => o.value === props.modelValue)
    if (selectedIdx >= 0) {
      focusedIndex.value = selectedIdx
      scrollToFocused()
    }
  })
}

function close() {
  isOpen.value = false
  searchQuery.value = ''
  focusedIndex.value = -1
}

function selectOption(opt) {
  emit('update:modelValue', opt.value)
  close()
  nextTick(() => {
    triggerBtn.value?.focus()
  })
}

function scrollToFocused() {
  nextTick(() => {
    if (!optionsContainer.value) return
    const items = optionsContainer.value.querySelectorAll('.custom-select__option')
    if (items[focusedIndex.value]) {
      items[focusedIndex.value].scrollIntoView({ block: 'nearest' })
    }
  })
}

function onTriggerKeydown(e) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    if (!isOpen.value) {
      open()
    }
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    toggle()
  } else if (e.key === 'Escape') {
    close()
  }
}

function onSearchKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (focusedIndex.value < filteredOptions.value.length - 1) {
      focusedIndex.value++
      scrollToFocused()
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (focusedIndex.value > 0) {
      focusedIndex.value--
      scrollToFocused()
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (focusedIndex.value >= 0 && filteredOptions.value[focusedIndex.value]) {
      selectOption(filteredOptions.value[focusedIndex.value])
    }
  } else if (e.key === 'Escape') {
    close()
    triggerBtn.value?.focus()
  }
}

function handleOutsideClick(e) {
  if (!isOpen.value) return
  if (selectRoot.value?.contains(e.target)) return
  if (dropdownEl.value?.contains(e.target)) return
  close()
}

function handleScroll() {
  if (isOpen.value) positionDropdown()
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick, true)
  window.addEventListener('scroll', handleScroll, true)
  window.addEventListener('resize', handleScroll)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick, true)
  window.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('resize', handleScroll)
})

watch(
  () => props.options,
  () => {
    if (isOpen.value) {
      nextTick(positionDropdown)
    }
  }
)
</script>

<style scoped>
.custom-select {
  position: relative;
  display: inline-flex;
  width: 100%;
}

/* Trigger */
.custom-select__trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  border: 1.5px solid var(--wr-input-border);
  background: var(--wr-input-bg);
  color: var(--wr-text-primary);
  transition: all 0.2s ease;
  outline: none;
  text-align: left;
  font-family: inherit;
}

.custom-select__trigger:hover:not(:disabled) {
  border-color: var(--wr-border-hover);
  background: var(--wr-input-focus-bg);
}

.custom-select--focus .custom-select__trigger,
.custom-select__trigger:focus-visible {
  border-color: #f8005b;
  box-shadow: 0 0 0 3px rgba(248, 0, 91, 0.12);
  background: var(--wr-input-focus-bg);
}

.custom-select--disabled .custom-select__trigger {
  opacity: 0.5;
  cursor: not-allowed;
}

.custom-select__value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-select__placeholder {
  color: var(--wr-text-muted);
}

.custom-select__arrow {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: var(--wr-text-tertiary);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.custom-select--open .custom-select__arrow {
  transform: rotate(180deg);
}

/* Sizes */
.custom-select--xs .custom-select__trigger {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  min-height: 28px;
}

.custom-select--sm .custom-select__trigger {
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
  min-height: 32px;
}

.custom-select--md .custom-select__trigger {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  min-height: 42px;
}

.custom-select--lg .custom-select__trigger {
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 15px;
  min-height: 48px;
}
</style>

<style>
/* Dropdown (not scoped — lives in Teleport) */
.custom-select__dropdown {
  background: var(--wr-bg-card);
  border: 1px solid var(--wr-border);
  border-radius: 14px;
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.35),
    0 0 0 1px var(--wr-border-light);
  overflow: hidden;
  backdrop-filter: blur(16px);
}

:root.theme-light .custom-select__dropdown {
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.12),
    0 0 0 1px var(--wr-border-light);
}

.custom-select__search-wrap {
  padding: 8px 8px 4px;
  border-bottom: 1px solid var(--wr-border-light);
}

.custom-select__search {
  width: 100%;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--wr-input-border);
  background: var(--wr-input-bg);
  color: var(--wr-text-primary);
  font-size: 13px;
  outline: none;
  font-family: inherit;
  transition: all 0.2s ease;
}

.custom-select__search:focus {
  border-color: #f8005b;
  background: var(--wr-input-focus-bg);
  box-shadow: 0 0 0 2px rgba(248, 0, 91, 0.1);
}

.custom-select__search::placeholder {
  color: var(--wr-text-muted);
}

.custom-select__options {
  max-height: 268px;
  overflow-y: auto;
  padding: 6px;
  scrollbar-width: thin;
  scrollbar-color: var(--wr-scrollbar-thumb) transparent;
}

.custom-select__options::-webkit-scrollbar {
  width: 5px;
}

.custom-select__options::-webkit-scrollbar-track {
  background: transparent;
}

.custom-select__options::-webkit-scrollbar-thumb {
  background: var(--wr-scrollbar-thumb);
  border-radius: 10px;
}

.custom-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 13px;
  color: var(--wr-text-primary);
  cursor: pointer;
  transition: background 0.12s ease;
  user-select: none;
}

.custom-select__option:hover,
.custom-select__option--focused {
  background: var(--wr-hover-bg);
}

.custom-select__option--focused {
  background: rgba(248, 0, 91, 0.06);
}

.custom-select__option--selected {
  color: #f8005b;
  font-weight: 600;
  background: rgba(248, 0, 91, 0.08);
}

.custom-select__option--selected:hover,
.custom-select__option--selected.custom-select__option--focused {
  background: rgba(248, 0, 91, 0.12);
}

.custom-select__option-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-select__check {
  flex-shrink: 0;
  color: #f8005b;
}

.custom-select__no-results {
  padding: 16px 12px;
  text-align: center;
  color: var(--wr-text-tertiary);
  font-size: 13px;
}

/* Transitions */
.cs-dropdown-enter-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

.cs-dropdown-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.cs-dropdown-enter-from {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}

.cs-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
