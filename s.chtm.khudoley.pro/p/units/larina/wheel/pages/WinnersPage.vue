<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { createComponentLogger } from '../shared/logger'
import { getTheme } from '../config/themes'
import { wheelWinnersRoute } from '../api/wheel/winners'
import { getFullUrl, ROUTES } from '../config/routes'

// @ts-ignore — ctx — глобальный объект платформы
declare const ctx: app.Ctx

const log = createComponentLogger('WinnersPage')

// ---------------------------------------------------------------------------
// Типы
// ---------------------------------------------------------------------------
interface WinnerRow {
  emailMasked: string
  prize: string
  timestamp: number
}

// ---------------------------------------------------------------------------
// SSR props
// ---------------------------------------------------------------------------
const props = withDefaults(
  defineProps<{
    winners?: WinnerRow[]
    hasMore?: boolean
    themeId?: string
    brandLabel?: string
  }>(),
  {
    winners: () => [],
    hasMore: false,
    themeId: 'gold',
    brandLabel: ''
  }
)

// ---------------------------------------------------------------------------
// Тема (объект из config/themes по id)
// ---------------------------------------------------------------------------
const t = computed(() => getTheme(props.themeId))
const BODY_FONT = "'Manrope', system-ui, sans-serif"

// ---------------------------------------------------------------------------
// Состояние пагинации
// ---------------------------------------------------------------------------
const winners = ref<WinnerRow[]>(props.winners)
const hasMore = ref<boolean>(props.hasMore)
const loading = ref<boolean>(false)
const loadError = ref<string>('')

// ---------------------------------------------------------------------------
// Ссылка назад к колесу
// ---------------------------------------------------------------------------
const indexUrl = getFullUrl(ROUTES.index)

// ---------------------------------------------------------------------------
// Инлайн-стили из темы (повторяют визуальный язык WheelPage)
// ---------------------------------------------------------------------------
const pageStyle = computed(() => ({
  position: 'relative',
  minHeight: '100svh',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: '40px 20px 60px',
  background: t.value.pageBg,
  fontFamily: BODY_FONT,
  color: t.value.heading
}))

const brandLabelStyle = computed(() => ({
  fontSize: '11px',
  letterSpacing: '3px',
  textTransform: 'uppercase',
  fontWeight: '500',
  color: t.value.brandLabel,
  marginBottom: '8px',
  textAlign: 'center'
}))

const headingStyle = computed(() => ({
  fontFamily: t.value.headFont,
  fontWeight: String(t.value.headW),
  fontSize: 'clamp(28px,7vw,40px)',
  lineHeight: '1.1',
  textAlign: 'center',
  margin: '0 0 8px',
  color: t.value.heading
}))

const backLinkStyle = computed(() => ({
  fontFamily: BODY_FONT,
  fontSize: '13px',
  color: t.value.sub,
  textDecoration: 'none',
  letterSpacing: '.3px',
  marginBottom: '28px',
  display: 'inline-block'
}))

const tableWrapStyle = computed(() => ({
  width: '100%',
  maxWidth: '640px',
  borderRadius: '16px',
  overflow: 'hidden',
  border: `1px solid ${t.value.divider}`,
  boxShadow: '0 8px 32px rgba(0,0,0,.3)'
}))

const tableStyle = computed(() => ({
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: BODY_FONT,
  fontSize: '14px'
}))

const theadTrStyle = computed(() => ({
  background: t.value.hub
}))

const thStyle = computed(() => ({
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: '600',
  fontSize: '11px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: t.value.hubText
}))

function rowStyle(i: number): Record<string, string> {
  return {
    background: i % 2 === 0 ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.08)',
    borderBottom: `1px solid ${t.value.divider}`
  }
}

const tdStyle = computed(() => ({
  padding: '11px 16px',
  color: t.value.heading,
  verticalAlign: 'middle'
}))

const prizeTdStyle = computed(() => ({
  padding: '11px 16px',
  color: t.value.prizeText,
  fontWeight: '600',
  verticalAlign: 'middle'
}))

const dateTdStyle = computed(() => ({
  padding: '11px 16px',
  color: t.value.muted,
  fontSize: '12px',
  verticalAlign: 'middle',
  whiteSpace: 'nowrap'
}))

const emptyStyle = computed(() => ({
  fontFamily: BODY_FONT,
  fontSize: '15px',
  color: t.value.sub,
  textAlign: 'center',
  margin: '48px 0',
  maxWidth: '320px'
}))

const loadMoreBtnStyle = computed(() => ({
  marginTop: '20px',
  padding: '13px 32px',
  borderRadius: '100px',
  border: 'none',
  cursor: loading.value ? 'default' : 'pointer',
  fontFamily: BODY_FONT,
  fontWeight: '700',
  fontSize: '14px',
  letterSpacing: '1.2px',
  textTransform: 'uppercase',
  color: t.value.buttonText,
  background: t.value.button,
  opacity: loading.value ? '0.55' : '1',
  transition: 'opacity .25s'
}))

// ---------------------------------------------------------------------------
// Форматирование даты
// ---------------------------------------------------------------------------
function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString('ru', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (_) {
    return String(ts)
  }
}

// ---------------------------------------------------------------------------
// Пагинация: кнопка «Показать ещё»
// ---------------------------------------------------------------------------
async function loadMore() {
  if (loading.value) return
  loading.value = true
  loadError.value = ''
  try {
    const offset = winners.value.length
    const res = await wheelWinnersRoute.query({ limit: '50', offset: String(offset) }).run(ctx)
    const data = res as {
      success: boolean
      winners?: WinnerRow[]
      hasMore?: boolean
      error?: string
    }
    if (data.success && data.winners) {
      winners.value = [...winners.value, ...data.winners]
      hasMore.value = data.hasMore ?? false
    } else {
      loadError.value = data.error || 'Ошибка загрузки'
    }
  } catch (_) {
    loadError.value = 'Ошибка сети'
  } finally {
    loading.value = false
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
onMounted(() => {
  log.debug('mount')
})

onBeforeUnmount(() => {
  log.debug('unmount')
})
</script>

<template>
  <div :style="pageStyle">
    <div
      style="
        width: 100%;
        max-width: 640px;
        display: flex;
        flex-direction: column;
        align-items: center;
      "
    >
      <!-- Брендовая подпись -->
      <div v-if="brandLabel" :style="brandLabelStyle">{{ brandLabel }}</div>

      <!-- Заголовок -->
      <h1 :style="headingStyle">Список победителей</h1>

      <!-- Ссылка назад -->
      <a :href="indexUrl" :style="backLinkStyle">&#8592; К колесу</a>

      <!-- Таблица победителей -->
      <div v-if="winners.length > 0" :style="tableWrapStyle">
        <table :style="tableStyle">
          <thead>
            <tr :style="theadTrStyle">
              <th :style="thStyle">Email</th>
              <th :style="thStyle">Приз</th>
              <th :style="thStyle">Дата</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in winners" :key="i" :style="rowStyle(i)">
              <td :style="tdStyle">{{ row.emailMasked }}</td>
              <td :style="prizeTdStyle">{{ row.prize }}</td>
              <td :style="dateTdStyle">{{ formatDate(row.timestamp) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Пустой список -->
      <p v-else :style="emptyStyle">Пока нет победителей</p>

      <!-- Ошибка загрузки -->
      <p
        v-if="loadError"
        :style="{
          fontFamily: BODY_FONT,
          fontSize: '13px',
          color: '#e07070',
          margin: '12px 0 0',
          textAlign: 'center'
        }"
      >
        {{ loadError }}
      </p>

      <!-- Кнопка «Показать ещё» -->
      <button v-if="hasMore" :style="loadMoreBtnStyle" :disabled="loading" @click="loadMore">
        {{ loading ? 'Загрузка…' : 'Показать ещё' }}
      </button>
    </div>
  </div>
</template>
