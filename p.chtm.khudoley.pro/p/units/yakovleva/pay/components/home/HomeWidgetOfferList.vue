<script setup lang="ts">
/**
 * Reusable offer-filter section for one payment-page method.
 *
 * The parent provides the loader and owns persistence; this component only
 * renders selection UI and emits listType/selectedOffers changes.
 */
import { computed, onMounted, ref } from 'vue'
import { createComponentLogger } from '../../shared/logger'
import type { WidgetOfferListType, AllowedOffer } from '../../shared/widgetSettingsTypes'

const log = createComponentLogger('HomeWidgetOfferList')

type FilterMode = 'off' | 'whitelist' | 'blacklist'

type OfferItem = { id: string; name: string; price?: number }
type LoaderResult = {
  success?: boolean
  offers?: OfferItem[]
  error?: string
}

const props = defineProps<{
  /** Заголовок секции, например «Фильтр офферов LifePay». */
  title: string
  /** Подсказка под заголовком. */
  hint?: string
  /** Сообщение для ошибки источника, например про GC_DISABLED. */
  errorHints?: Record<string, string>
  /** Текущий тип списка (whitelist/blacklist). */
  listType: WidgetOfferListType
  /** Текущий список выбранных офферов ({id, title}[]). */
  selectedOffers: AllowedOffer[]
  /** Функция-загрузчик офферов (route.run(ctx) в родителе). */
  loader: () => Promise<LoaderResult>
}>()

const emit = defineEmits<{
  (e: 'update:listType', value: WidgetOfferListType): void
  (e: 'update:selectedOffers', value: AllowedOffer[]): void
}>()

const offers = ref<OfferItem[]>([])
const loading = ref(false)
const loadError = ref('')
const search = ref('')

/**
 * Когда пользователь нажал whitelist/blacklist при пустом списке — запоминаем
 * выбор в локальном refe, чтобы сегмент не схлопывался обратно в `off`.
 * При первом добавлении оффера значение синхронизируется с props.listType.
 */
const stagedListType = ref<'whitelist' | 'blacklist' | null>(null)

const filterMode = computed<FilterMode>(() => {
  // Staged-выбор приоритетнее всего: пользователь нажал whitelist/blacklist при
  // пустом списке, listType на сервере ещё 'off', но сегмент уже должен показать
  // выбранный режим и раскрыть выбор офферов. Без этой проверки первой ранний
  // выход по listType==='off' схлопывал бы сегмент обратно в «Выключен».
  if (stagedListType.value) return stagedListType.value
  // listType уже 'off' и нет staged — показываем off напрямую.
  if (props.listType === 'off') return 'off'
  // Непустой список → реальный listType (whitelist или blacklist).
  if (props.selectedOffers.length > 0) return props.listType
  // Пустой список без staged: legacy whitelist+[] и blacklist+[] отображаем как off.
  return 'off'
})

const filteredOffers = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return offers.value
  return offers.value.filter((o) => {
    const name = (o.name || '').toLowerCase()
    const id = (o.id || '').toLowerCase()
    return name.indexOf(q) !== -1 || id.indexOf(q) !== -1
  })
})

const selectedCount = computed(() => props.selectedOffers.length)

async function loadOffers() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await props.loader()
    if (res?.success === false) {
      const hint = props.errorHints?.[res.error || '']
      loadError.value =
        hint || res.error || 'Не удалось загрузить список офферов. Сохранённые офферы не затронуты.'
      offers.value = []
      return
    }
    offers.value = Array.isArray(res?.offers) ? res.offers : []
    log.info(`Список офферов «${props.title}» загружен`, { count: offers.value.length })
  } catch (e) {
    loadError.value = (e as Error)?.message || String(e)
    log.warning(`Не удалось загрузить офферы «${props.title}»`, loadError.value)
  } finally {
    loading.value = false
  }
}

function toggleOffer(offer: OfferItem) {
  const arr = [...props.selectedOffers]
  const idx = arr.findIndex((o) => o.id === offer.id)
  if (idx === -1) {
    arr.push({ id: offer.id, title: offer.name })
  } else {
    arr.splice(idx, 1)
  }
  // При первом добавлении оффера sync staged → реальный listType, чтобы
  // сегмент корректно отображал выбранный режим.
  if (arr.length > 0 && stagedListType.value && props.listType !== stagedListType.value) {
    emit('update:listType', stagedListType.value)
  }
  stagedListType.value = null
  emit('update:selectedOffers', arr)
}

function setMode(mode: FilterMode) {
  if (mode === 'off') {
    stagedListType.value = null
    if (props.listType !== 'off') emit('update:listType', 'off')
    if (props.selectedOffers.length > 0) emit('update:selectedOffers', [])
    return
  }
  // whitelist | blacklist
  if (props.selectedOffers.length === 0) {
    // запомним выбор до того, как пользователь выберет первый оффер
    stagedListType.value = mode
  } else if (props.listType !== mode) {
    stagedListType.value = null
    emit('update:listType', mode)
  }
}

function clearSelection() {
  // staged хранит только whitelist/blacklist; при 'off' (фильтр выключен) staged не нужен.
  stagedListType.value = props.listType === 'off' ? null : props.listType
  emit('update:selectedOffers', [])
}

onMounted(() => {
  loadOffers()
})
</script>

<template>
  <div>
    <div class="st-offer-head">
      <h3><i class="fas fa-filter"></i> {{ title }}</h3>
      <span v-if="filterMode !== 'off'" class="st-offer-counter">
        выбрано <code>{{ selectedCount }}</code>
      </span>
    </div>
    <p v-if="hint" class="st-offer-hint">{{ hint }}</p>

    <div class="st-segmented" role="tablist" aria-label="Режим фильтра офферов">
      <button
        type="button"
        class="st-segmented-btn"
        :class="filterMode === 'off' ? 'is-active' : ''"
        role="tab"
        :aria-selected="filterMode === 'off'"
        @click="setMode('off')"
      >
        <i class="fas fa-circle-xmark"></i> Выключен
      </button>
      <button
        type="button"
        class="st-segmented-btn"
        :class="filterMode === 'whitelist' ? 'is-active' : ''"
        role="tab"
        :aria-selected="filterMode === 'whitelist'"
        @click="setMode('whitelist')"
      >
        <i class="fas fa-check"></i> Только выбранные
      </button>
      <button
        type="button"
        class="st-segmented-btn"
        :class="filterMode === 'blacklist' ? 'is-active' : ''"
        role="tab"
        :aria-selected="filterMode === 'blacklist'"
        @click="setMode('blacklist')"
      >
        <i class="fas fa-ban"></i> Кроме выбранных
      </button>
    </div>

    <p v-if="filterMode === 'off'" class="st-offer-empty">
      <i class="fas fa-circle-info" style="margin-right: 0.35rem"></i>
      Фильтр не применяется — виджет покажется на всех страницах.
    </p>

    <template v-else>
      <div class="st-offer-toolbar">
        <input
          v-model="search"
          type="text"
          class="st-input"
          placeholder="Поиск по названию или id…"
        />
        <button type="button" class="btn-secondary" :disabled="loading" @click="loadOffers">
          <i class="fas fa-rotate"></i>
          {{ loading ? 'Загрузка…' : 'Обновить' }}
        </button>
        <button
          v-if="selectedCount > 0"
          type="button"
          class="btn-secondary"
          @click="clearSelection"
          :title="'Снять выделение со всех ' + selectedCount + ' офферов'"
        >
          <i class="fas fa-eraser"></i> Сбросить
        </button>
      </div>

      <div v-if="loadError" class="st-offer-warn">
        <i class="fas fa-triangle-exclamation"></i> {{ loadError }}
      </div>

      <div v-if="filteredOffers.length > 0" class="st-offer-grid">
        <label
          v-for="offer in filteredOffers"
          :key="offer.id"
          class="st-offer-item"
          :class="selectedOffers.some((o) => o.id === offer.id) ? 'is-selected' : ''"
          :title="offer.id"
        >
          <input
            type="checkbox"
            :checked="selectedOffers.some((o) => o.id === offer.id)"
            @change="toggleOffer(offer)"
          />
          <span class="st-offer-item__body">
            <span class="st-offer-item__name">{{ offer.name || offer.id }}</span>
            <span class="st-offer-item__meta">
              <span>id: {{ offer.id }}</span>
              <span v-if="typeof offer.price === 'number'">{{ offer.price }} ₽</span>
            </span>
          </span>
        </label>
      </div>
      <div v-else-if="!loading && !loadError" class="st-offer-empty">
        {{ offers.length === 0 ? 'Список офферов пуст.' : 'Совпадений нет.' }}
      </div>
    </template>
  </div>
</template>
