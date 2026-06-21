<template>
  <div>
    <div v-if="loading" class="wr-text-tertiary text-xs">
      <i class="fas fa-spinner fa-spin"></i> Загрузка...
    </div>
    <div v-else-if="providers.length === 0" class="wr-text-tertiary text-xs">
      Нет доступных провайдеров.
      <a
        href="/app/pay?tab=providers&action=add"
        target="_blank"
        class="text-primary hover:underline"
        >Настройте платёжную систему</a
      >.
    </div>
    <div v-else class="space-y-3">
      <!-- Настроенные провайдеры -->
      <div v-if="configuredProviders.length > 0">
        <p class="wr-text-secondary text-[11px] font-medium mb-3 opacity-70">
          Настроенные провайдеры
        </p>
        <div class="grid gap-3" :class="gridClass">
          <div
            v-for="provider in configuredProviders"
            :key="provider.slug"
            @click="toggleProvider(provider.slug)"
            class="provider-card"
            :class="{ 'provider-card--selected': selectedProviders.includes(provider.slug) }"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="provider-icon">
                <img v-if="provider.iconUrl" :src="provider.iconUrl" class="provider-img" />
                <span v-else>💳</span>
              </div>
              <span class="text-sm font-semibold wr-text-primary truncate">{{
                provider.title || provider.slug
              }}</span>
            </div>
            <div class="provider-check">
              <i class="fas fa-check"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Не настроенные провайдеры -->
      <div v-if="unconfiguredProviders.length > 0">
        <p class="wr-text-secondary text-[11px] font-medium mb-3 opacity-70">
          Не настроенные провайдеры
        </p>
        <div class="grid gap-3" :class="gridClass">
          <div
            v-for="provider in unconfiguredProviders"
            :key="provider.slug"
            class="provider-card provider-card--disabled"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="provider-icon provider-icon--disabled">
                <img v-if="provider.iconUrl" :src="provider.iconUrl" class="provider-img" />
                <span v-else>💳</span>
              </div>
              <span class="text-sm font-semibold wr-text-primary truncate">{{
                provider.title || provider.slug
              }}</span>
            </div>
            <a
              href="/app/pay?tab=providers&action=add"
              target="_blank"
              @click.stop
              class="provider-setup-icon-btn"
              title="Настроить провайдер"
            >
              <i class="fas fa-plus"></i>
            </a>
          </div>
        </div>
      </div>

      <p
        v-if="showHint"
        class="wr-text-tertiary text-[10px] mt-2 pt-2"
        style="border-top: 1px solid var(--wr-border)"
      >
        <slot name="hint"></slot>
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  providers: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  columns: { type: Number, default: 1 }, // 1 для модалки, 2 для страницы
  showHint: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue'])

const selectedProviders = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const configuredProviders = computed(() => props.providers.filter((p) => p._configured !== false))

const unconfiguredProviders = computed(() => props.providers.filter((p) => p._configured === false))

const gridClass = computed(() => {
  return props.columns === 2 ? 'grid-cols-2' : 'grid-cols-1'
})

function toggleProvider(slug) {
  const idx = selectedProviders.value.indexOf(slug)
  if (idx >= 0) {
    const updated = [...selectedProviders.value]
    updated.splice(idx, 1)
    selectedProviders.value = updated
  } else {
    selectedProviders.value = [...selectedProviders.value, slug]
  }
}
</script>

<style scoped>
.provider-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  border: 2px solid transparent;
  background: var(--wr-input-bg);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.provider-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(248, 0, 91, 0.05);
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.provider-card:hover:not(.provider-card--disabled) {
  transform: translateY(-2px);
  border-color: rgba(248, 0, 91, 0.3);
}

.provider-card:hover:not(.provider-card--disabled)::before {
  opacity: 1;
}

.provider-card--selected {
  border-color: var(--wr-primary);
  background: rgba(248, 0, 91, 0.08);
}

.provider-card--disabled {
  cursor: default;
  background: var(--wr-bg-card);
}

.provider-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  transition: all 0.25s ease;
}

.provider-card:hover:not(.provider-card--disabled) .provider-icon {
  transform: scale(1.1) rotate(5deg);
}

.provider-img {
  width: 30px;
  height: 30px;
  object-fit: contain;
  border-radius: 6px;
}

.provider-icon--disabled {
  /* No additional styles */
}

.provider-icon--disabled .provider-img {
  width: 30px;
  height: 30px;
  border-radius: 6px;
}

.provider-check {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: transparent;
  border: 2px solid var(--wr-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: transparent;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.provider-card--selected .provider-check {
  background: var(--wr-primary);
  border-color: var(--wr-primary);
  color: white;
  transform: scale(1.1);
}

.provider-setup-icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f8005b;
  color: white;
  font-size: 13px;
  text-decoration: none;
  transition: all 0.2s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.provider-setup-icon-btn:hover {
  background: #d9004f;
  transform: translateY(-1px);
}
</style>
