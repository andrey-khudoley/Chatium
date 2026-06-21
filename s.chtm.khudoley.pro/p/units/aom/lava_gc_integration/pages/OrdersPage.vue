<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import { getOrdersMetricsRoute } from '../api/admin/orders-metrics'
import { getOrdersFilterOptionsRoute } from '../api/admin/orders-filter-options'
import { getOrdersListRoute } from '../api/admin/orders-list'
import { createComponentLogger } from '../shared/logger'

const log = createComponentLogger('OrdersPage')

declare const ctx: app.Ctx

declare global {
  interface Window {
    hideAppLoader?: () => void
    bootLoaderComplete?: boolean
  }
}

const props = defineProps<{
  projectTitle: string
  indexUrl: string
  profileUrl: string
  loginUrl: string
  isAuthenticated: boolean
  isAdmin?: boolean
  adminUrl?: string
  testsUrl?: string
}>()

type CurrencyRow = { currency: string; amount: number }

const bootLoaderDone = ref(false)
const loading = ref(false)
const ordersListLoading = ref(false)
const errorMsg = ref('')
const ordersListError = ref('')

const ORDERS_PAGE_SIZE = 50

type OrderRow = {
  id: string
  gc_order_id: string
  status: string
  amount: number
  currency: string
  gc_product_title: string
  gc_offer_title: string
  buyer_email: string
  lava_contract_id: string
  payment_url: string
  created_at: number
}

const ordersRows = ref<OrderRow[]>([])
const ordersTotal = ref(0)
const ordersPage = ref(1)

const formedCount = ref(0)
const paidCount = ref(0)
const formedByCurrency = ref<CurrencyRow[]>([])
const paidByCurrency = ref<CurrencyRow[]>([])

const productOptions = ref<Array<{ id: string; label: string }>>([])
const offerOptions = ref<Array<{ id: string; label: string }>>([])

const filterProductId = ref('')
const filterOfferId = ref('')

const MS_DAY = 86400000
const defaultTo = () => Date.now()
const defaultFrom = () => defaultTo() - 30 * MS_DAY

const fromLocal = ref('')
const toLocal = ref('')

function toDatetimeLocal(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function fromDatetimeLocal(s: string): number {
  const t = new Date(s).getTime()
  return Number.isFinite(t) ? t : NaN
}

function toDatetimeLocalUpperBoundMs(s: string): number {
  const t = fromDatetimeLocal(s)
  if (!Number.isFinite(t)) return NaN
  // datetime-local в UI задаёт минуту без секунд; включаем всю выбранную минуту.
  return t + 59_999
}

const summaryRows = computed(() => [
  { label: 'Заказов сформировано (контрактов)', value: String(formedCount.value) },
  { label: 'Заказов оплачено (status = paid)', value: String(paidCount.value) },
  {
    label: 'Сумма сформировано',
    value: formatMultiCurrency(formedByCurrency.value)
  },
  {
    label: 'Сумма оплачено',
    value: formatMultiCurrency(paidByCurrency.value)
  }
])

const ordersTotalPages = computed(() =>
  Math.max(1, Math.ceil(ordersTotal.value / ORDERS_PAGE_SIZE))
)

const currencyBreakdown = computed(() => {
  const m = new Map<string, { formed: number; paid: number }>()
  for (const r of formedByCurrency.value) {
    m.set(r.currency, { formed: r.amount, paid: m.get(r.currency)?.paid ?? 0 })
  }
  for (const r of paidByCurrency.value) {
    const prev = m.get(r.currency) ?? { formed: 0, paid: 0 }
    prev.paid = r.amount
    m.set(r.currency, prev)
  }
  return [...m.entries()]
    .map(([currency, v]) => ({ currency, ...v }))
    .sort((a, b) => a.currency.localeCompare(b.currency, 'ru'))
})

function formatMultiCurrency(rows: CurrencyRow[]): string {
  if (!rows.length) return '—'
  return rows.map((r) => `${formatMoney(r.amount, r.currency)} ${r.currency}`).join(' · ')
}

function formatDateTime(ms: number): string {
  if (!ms) return '—'
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(new Date(ms))
  } catch {
    return String(ms)
  }
}

function clip(s: string, max: number): string {
  const t = s?.trim() ?? ''
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function formatMoney(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency.length === 3 && currency !== '—' ? currency : 'RUB',
      maximumFractionDigits: 2
    }).format(n)
  } catch {
    return `${n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${currency}`
  }
}

async function loadFilterOptions() {
  try {
    const res = (await getOrdersFilterOptionsRoute.run(ctx)) as {
      success?: boolean
      products?: Array<{ id: string; label: string }>
      offers?: Array<{ id: string; label: string }>
    }
    if (res.success && res.products && res.offers) {
      productOptions.value = res.products
      offerOptions.value = res.offers
    }
  } catch (e) {
    log.warning('filter options', { error: String(e) })
  }
}

async function loadOrdersList(page: number) {
  ordersListError.value = ''
  const fromMs = fromDatetimeLocal(fromLocal.value)
  const toMs = toDatetimeLocalUpperBoundMs(toLocal.value)
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs > toMs) {
    return
  }
  ordersListLoading.value = true
  try {
    const res = (await getOrdersListRoute
      .query({
        from: String(fromMs),
        to: String(toMs),
        lavaProductId: filterProductId.value.trim(),
        lavaOfferId: filterOfferId.value.trim(),
        page: String(page)
      })
      .run(ctx)) as {
      success?: boolean
      error?: string
      total?: number
      rows?: OrderRow[]
      page?: number
    }
    if (!res.success) {
      ordersListError.value = res.error ?? 'Ошибка списка заказов'
      ordersRows.value = []
      ordersTotal.value = 0
      return
    }
    ordersTotal.value = res.total ?? 0
    ordersPage.value = res.page ?? page
    ordersRows.value = (res.rows ?? []).map((r) => ({
      id: r.id,
      gc_order_id: r.gc_order_id ?? '',
      status: r.status ?? '',
      amount: r.amount ?? 0,
      currency: r.currency ?? '',
      gc_product_title: r.gc_product_title ?? '',
      gc_offer_title: r.gc_offer_title ?? '',
      buyer_email: r.buyer_email ?? '',
      lava_contract_id: r.lava_contract_id ?? '',
      payment_url: r.payment_url ?? '',
      created_at: r.created_at ?? 0
    }))
  } catch (e) {
    ordersListError.value = String(e)
    ordersRows.value = []
    ordersTotal.value = 0
  } finally {
    ordersListLoading.value = false
  }
}

async function applyFilters() {
  loading.value = true
  errorMsg.value = ''
  ordersListError.value = ''
  const fromMs = fromDatetimeLocal(fromLocal.value)
  const toMs = toDatetimeLocalUpperBoundMs(toLocal.value)
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
    errorMsg.value = 'Укажите корректный интервал «от» и «до».'
    loading.value = false
    return
  }
  if (fromMs > toMs) {
    errorMsg.value = '«От» не может быть позже «до».'
    loading.value = false
    return
  }
  try {
    const res = (await getOrdersMetricsRoute
      .query({
        from: String(fromMs),
        to: String(toMs),
        lavaProductId: filterProductId.value.trim(),
        lavaOfferId: filterOfferId.value.trim()
      })
      .run(ctx)) as {
      success?: boolean
      error?: string
      formedCount?: number
      paidCount?: number
      formedByCurrency?: CurrencyRow[]
      paidByCurrency?: CurrencyRow[]
    }
    if (!res.success) {
      errorMsg.value = res.error ?? 'Ошибка загрузки'
      return
    }
    formedCount.value = res.formedCount ?? 0
    paidCount.value = res.paidCount ?? 0
    formedByCurrency.value = res.formedByCurrency ?? []
    paidByCurrency.value = res.paidByCurrency ?? []
    await loadOrdersList(1)
  } catch (e) {
    errorMsg.value = String(e)
  } finally {
    loading.value = false
  }
}

function goOrdersPrev() {
  if (ordersPage.value <= 1) return
  void loadOrdersList(ordersPage.value - 1)
}

function goOrdersNext() {
  if (ordersPage.value >= ordersTotalPages.value) return
  void loadOrdersList(ordersPage.value + 1)
}

function startBoot() {
  bootLoaderDone.value = true
  fromLocal.value = toDatetimeLocal(defaultFrom())
  toLocal.value = toDatetimeLocal(defaultTo())
  void loadFilterOptions()
  void applyFilters()
}

const onBootloaderComplete = () => startBoot()

onMounted(() => {
  log.info('mounted')
  if (window.hideAppLoader) window.hideAppLoader()
  if (window.bootLoaderComplete) startBoot()
  else window.addEventListener('bootloader-complete', onBootloaderComplete)
})

onUnmounted(() => {
  window.removeEventListener('bootloader-complete', onBootloaderComplete)
})
</script>

<template>
  <div
    class="orders-app app-layout bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col min-h-screen"
  >
    <GlobalGlitch />
    <Header
      v-if="bootLoaderDone"
      :projectTitle="props.projectTitle"
      :indexUrl="props.indexUrl"
      :profileUrl="props.profileUrl"
      :loginUrl="props.loginUrl"
      :isAuthenticated="props.isAuthenticated"
      :isAdmin="props.isAdmin"
      :adminUrl="props.adminUrl"
      :testsUrl="props.testsUrl"
    />

    <main class="orders-main flex-1 relative z-10 min-h-0 overflow-y-auto">
      <div class="orders-wrap mx-auto max-w-5xl px-4 py-8 pb-16">
        <header class="orders-hero mb-8">
          <div class="orders-hero__badge">
            <span class="orders-hero__dot" aria-hidden="true" />
            MONITOR · LAVA_GC
          </div>
          <h1 class="orders-title">Текущие заказы</h1>
          <p class="orders-lead">
            Метрики по таблице контрактов оплаты: фильтр по
            <code class="orders-code">created_at</code> (от / до) и по техническим
            <code class="orders-code">lava_product_id</code> /
            <code class="orders-code">lava_offer_id</code> через Heap
            <code class="orders-code">where</code>.
          </p>
        </header>

        <section v-if="bootLoaderDone" class="orders-panel crt-panel">
          <div class="crt-panel__head">
            <i class="fas fa-sliders-h crt-panel__head-icon" aria-hidden="true" />
            <span>Фильтры</span>
          </div>
          <div class="orders-filters">
            <label class="orders-field">
              <span class="orders-field__label">От (локальное время)</span>
              <input v-model="fromLocal" class="orders-input" type="datetime-local" />
            </label>
            <label class="orders-field">
              <span class="orders-field__label">До</span>
              <input v-model="toLocal" class="orders-input" type="datetime-local" />
            </label>
            <label class="orders-field orders-field--grow">
              <span class="orders-field__label">Product (lava_product_id)</span>
              <select v-model="filterProductId" class="orders-input orders-select">
                <option value="">Все продукты</option>
                <option v-for="p in productOptions" :key="p.id" :value="p.id">
                  {{ p.label }} — {{ p.id }}
                </option>
              </select>
            </label>
            <label class="orders-field orders-field--grow">
              <span class="orders-field__label">Offer (lava_offer_id)</span>
              <select v-model="filterOfferId" class="orders-input orders-select">
                <option value="">Все офферы</option>
                <option v-for="o in offerOptions" :key="o.id" :value="o.id">
                  {{ o.label }} — {{ o.id }}
                </option>
              </select>
            </label>
            <button
              type="button"
              class="orders-apply crt-btn"
              :disabled="loading"
              @click="applyFilters"
            >
              <span class="crt-btn__shine" aria-hidden="true" />
              <i class="fas fa-bolt" aria-hidden="true" />
              {{ loading ? 'Запрос…' : 'Применить' }}
            </button>
          </div>
          <p v-if="errorMsg" class="orders-error" role="alert">{{ errorMsg }}</p>
        </section>

        <section
          v-if="bootLoaderDone"
          class="orders-kpi mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div class="kpi-card crt-panel">
            <div class="kpi-card__label">Сформировано</div>
            <div class="kpi-card__value">{{ formedCount }}</div>
            <div class="kpi-card__sub">контрактов в выборке</div>
          </div>
          <div class="kpi-card crt-panel kpi-card--accent">
            <div class="kpi-card__label">Оплачено</div>
            <div class="kpi-card__value">{{ paidCount }}</div>
            <div class="kpi-card__sub">status = paid</div>
          </div>
          <div class="kpi-card crt-panel">
            <div class="kpi-card__label">Сумма сформ.</div>
            <div class="kpi-card__value kpi-card__value--sm">
              {{ formatMultiCurrency(formedByCurrency) }}
            </div>
          </div>
          <div class="kpi-card crt-panel">
            <div class="kpi-card__label">Сумма оплач.</div>
            <div class="kpi-card__value kpi-card__value--sm">
              {{ formatMultiCurrency(paidByCurrency) }}
            </div>
          </div>
        </section>

        <section v-if="bootLoaderDone" class="mt-10 crt-panel crt-panel--table">
          <div class="crt-panel__head">
            <i class="fas fa-table crt-panel__head-icon" aria-hidden="true" />
            <span>Сводная таблица</span>
          </div>
          <div class="orders-table-wrap">
            <table class="orders-table">
              <thead>
                <tr>
                  <th>Показатель</th>
                  <th>Значение</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in summaryRows" :key="idx">
                  <td>{{ row.label }}</td>
                  <td class="orders-table__mono">{{ row.value }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section
          v-if="bootLoaderDone && currencyBreakdown.length"
          class="mt-8 crt-panel crt-panel--table"
        >
          <div class="crt-panel__head">
            <i class="fas fa-coins crt-panel__head-icon" aria-hidden="true" />
            <span>По валютам</span>
          </div>
          <div class="orders-table-wrap">
            <table class="orders-table">
              <thead>
                <tr>
                  <th>Валюта</th>
                  <th>Сумма сформировано</th>
                  <th>Сумма оплачено</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in currencyBreakdown" :key="row.currency">
                  <td>{{ row.currency }}</td>
                  <td class="orders-table__mono">{{ formatMoney(row.formed, row.currency) }}</td>
                  <td class="orders-table__mono">{{ formatMoney(row.paid, row.currency) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="bootLoaderDone" class="mt-8 crt-panel crt-panel--table">
          <div class="crt-panel__head">
            <i class="fas fa-list-ul crt-panel__head-icon" aria-hidden="true" />
            <span>Список заказов</span>
          </div>
          <p v-if="ordersListError" class="orders-error orders-error--inner" role="alert">
            {{ ordersListError }}
          </p>
          <div class="orders-pagination">
            <span class="orders-pagination__info">
              Всего записей: {{ ordersTotal }} · страница {{ ordersPage }} из
              {{ ordersTotalPages }} (по {{ ORDERS_PAGE_SIZE }} шт.)
              <span v-if="ordersListLoading" class="orders-pagination__loading">загрузка…</span>
            </span>
            <div class="orders-pagination__btns">
              <button
                type="button"
                class="orders-page-btn"
                :disabled="ordersListLoading || ordersPage <= 1"
                @click="goOrdersPrev"
              >
                Назад
              </button>
              <button
                type="button"
                class="orders-page-btn"
                :disabled="ordersListLoading || ordersPage >= ordersTotalPages"
                @click="goOrdersNext"
              >
                Вперёд
              </button>
            </div>
          </div>
          <div class="orders-table-wrap">
            <table class="orders-table orders-table--dense">
              <thead>
                <tr>
                  <th>Заказ GC</th>
                  <th>Статус</th>
                  <th>Сумма</th>
                  <th>Продукт</th>
                  <th>Оффер</th>
                  <th>Email</th>
                  <th>Создан</th>
                  <th>Оплата</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!ordersRows.length && !ordersListLoading && !ordersListError">
                  <td colspan="8" class="orders-table__empty">Нет записей в выбранном диапазоне</td>
                </tr>
                <tr v-for="row in ordersRows" :key="row.id">
                  <td class="orders-table__mono">{{ row.gc_order_id || '—' }}</td>
                  <td>
                    <span class="orders-status">{{ row.status }}</span>
                  </td>
                  <td class="orders-table__mono">{{ formatMoney(row.amount, row.currency) }}</td>
                  <td class="orders-table__clip" :title="row.gc_product_title">
                    {{ clip(row.gc_product_title, 36) }}
                  </td>
                  <td class="orders-table__clip" :title="row.gc_offer_title">
                    {{ clip(row.gc_offer_title, 36) }}
                  </td>
                  <td class="orders-table__clip orders-table__email" :title="row.buyer_email">
                    {{ clip(row.buyer_email, 28) }}
                  </td>
                  <td class="orders-table__mono orders-table__nowrap">
                    {{ formatDateTime(row.created_at) }}
                  </td>
                  <td>
                    <a
                      v-if="row.payment_url"
                      :href="row.payment_url"
                      class="orders-link-pay"
                      target="_blank"
                      rel="noopener noreferrer"
                      >перейти</a
                    >
                    <span v-else class="orders-table__muted">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>

    <AppFooter v-if="bootLoaderDone" />
  </div>
</template>

<style scoped>
.orders-main {
  padding-top: 0.5rem;
}

.orders-hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.65rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-text-tertiary, #707070);
  margin-bottom: 0.75rem;
}

.orders-hero__dot {
  width: 6px;
  height: 6px;
  background: var(--color-accent, #d3234b);
  box-shadow: 0 0 8px rgba(211, 35, 75, 0.8);
  animation: crt-pulse 2s ease-in-out infinite;
}

@keyframes crt-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.orders-title {
  font-size: 1.75rem;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0 0 0.75rem;
  text-shadow: 0 0 12px rgba(232, 232, 232, 0.15);
}

.orders-lead {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.65;
  color: var(--color-text-secondary, #a0a0a0);
  max-width: 52rem;
}

.orders-code {
  font-size: 0.75rem;
  padding: 0.1rem 0.35rem;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--color-border, #2a2a2a);
  color: #c8e6c9;
}

.crt-panel {
  position: relative;
  background: linear-gradient(145deg, rgba(20, 20, 22, 0.96) 0%, rgba(8, 8, 10, 0.98) 100%);
  border: 1px solid var(--color-border, #2a2a2a);
  clip-path: polygon(
    0 8px,
    8px 8px,
    8px 0,
    calc(100% - 8px) 0,
    calc(100% - 8px) 8px,
    100% 8px,
    100% calc(100% - 8px),
    calc(100% - 8px) calc(100% - 8px),
    calc(100% - 8px) 100%,
    8px 100%,
    8px calc(100% - 8px),
    0 calc(100% - 8px)
  );
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.03),
    0 12px 40px rgba(0, 0, 0, 0.35);
}

.crt-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.06) 0px,
    rgba(0, 0, 0, 0.06) 1px,
    transparent 1px,
    transparent 3px
  );
  opacity: 0.45;
}

.crt-panel__head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--color-border, #2a2a2a);
  background: rgba(0, 0, 0, 0.35);
  color: var(--color-text-secondary, #a0a0a0);
}

.crt-panel__head-icon {
  color: var(--color-accent, #d3234b);
}

.crt-panel--table .crt-panel__head {
  margin-bottom: 0;
}

.orders-filters {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem 1rem 1.25rem;
  align-items: flex-end;
}

.orders-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 200px;
}

.orders-field--grow {
  flex: 1 1 220px;
}

.orders-field__label {
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-tertiary, #707070);
}

.orders-input,
.orders-select {
  font-family: inherit;
  font-size: 0.875rem;
  padding: 0.5rem 0.65rem;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--color-border, #2a2a2a);
  color: var(--color-text, #e8e8e8);
  min-height: 2.5rem;
}

.orders-input:focus,
.orders-select:focus {
  outline: none;
  border-color: rgba(211, 35, 75, 0.55);
  box-shadow: 0 0 0 1px rgba(211, 35, 75, 0.25);
}

.crt-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.55rem 1.25rem;
  min-height: 2.5rem;
  font-family: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(180deg, #c41e3a 0%, #8f1530 100%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  clip-path: polygon(
    0 4px,
    4px 4px,
    4px 0,
    calc(100% - 4px) 0,
    calc(100% - 4px) 4px,
    100% 4px,
    100% calc(100% - 4px),
    calc(100% - 4px) calc(100% - 4px),
    calc(100% - 4px) 100%,
    4px 100%,
    4px calc(100% - 4px),
    0 calc(100% - 4px)
  );
  transition:
    filter 0.2s ease,
    transform 0.15s ease;
}

.crt-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.crt-btn:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.crt-btn__shine {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255, 255, 255, 0.08) 50%,
    transparent 60%
  );
  opacity: 0.7;
}

.orders-error {
  padding: 0 1rem 1rem;
  margin: 0;
  font-size: 0.8125rem;
  color: #ff8a80;
}

.kpi-card {
  padding: 1rem 1.1rem 1.15rem;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.kpi-card--accent {
  border-color: rgba(211, 35, 75, 0.45);
  box-shadow:
    inset 0 0 30px rgba(211, 35, 75, 0.06),
    0 12px 40px rgba(0, 0, 0, 0.35);
}

.kpi-card__label {
  font-size: 0.65rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-tertiary, #707070);
  margin-bottom: 0.35rem;
}

.kpi-card__value {
  font-size: 1.75rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  line-height: 1.2;
  word-break: break-word;
}

.kpi-card__value--sm {
  font-size: 0.9rem;
  line-height: 1.35;
}

.kpi-card__sub {
  margin-top: 0.35rem;
  font-size: 0.65rem;
  color: var(--color-text-tertiary, #707070);
  letter-spacing: 0.08em;
}

.orders-table-wrap {
  position: relative;
  overflow-x: auto;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.orders-table th,
.orders-table td {
  padding: 0.65rem 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(42, 42, 42, 0.85);
}

.orders-table th {
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-tertiary, #707070);
  background: rgba(0, 0, 0, 0.35);
}

.orders-table tbody tr:hover td {
  background: rgba(211, 35, 75, 0.04);
}

.orders-table__mono {
  font-variant-numeric: tabular-nums;
  color: #b2dfdb;
}

.orders-error--inner {
  padding: 0.75rem 1rem 0;
}

.orders-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary, #a0a0a0);
}

.orders-pagination__info {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.orders-pagination__loading {
  color: var(--color-text-tertiary, #707070);
  font-style: italic;
}

.orders-pagination__btns {
  display: inline-flex;
  gap: 0.5rem;
}

.orders-page-btn {
  font-family: inherit;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.4rem 0.85rem;
  cursor: pointer;
  color: var(--color-text, #e8e8e8);
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--color-border, #2a2a2a);
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.orders-page-btn:hover:not(:disabled) {
  border-color: rgba(211, 35, 75, 0.45);
  color: #fff;
}

.orders-page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.orders-table--dense th,
.orders-table--dense td {
  padding: 0.45rem 0.65rem;
  font-size: 0.75rem;
}

.orders-table--dense th {
  font-size: 0.6rem;
}

.orders-table__empty {
  text-align: center;
  color: var(--color-text-tertiary, #707070);
  padding: 1.25rem 1rem !important;
}

.orders-table__clip {
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.orders-table__nowrap {
  white-space: nowrap;
}

.orders-table__muted {
  color: var(--color-text-tertiary, #707070);
}

.orders-status {
  font-size: 0.72rem;
  letter-spacing: 0.04em;
}

.orders-link-pay {
  color: #80cbc4;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.orders-link-pay:hover {
  color: #b2dfdb;
}
</style>

<style>
/* глобальные переменные страницы заказов (совпадают с index/admin) */
.orders-app {
  --color-bg: #0a0a0a;
  --color-text: #e8e8e8;
  --color-text-secondary: #a0a0a0;
  --color-text-tertiary: #707070;
  --color-border: #2a2a2a;
  --color-accent: #d3234b;
}
</style>
