<script setup lang="ts">
// Презентация сьюита «Gateway /v1/{op}» (внутри вкладки HTTP страницы тестов).
// Состояние/логика — из composable useV1Ops через родителя; чистые помощники —
// из shared/v1OpsView. CSS глобальный (классы .tp-v1ops-* инжектятся на странице тестов).
import type { OperationSummary } from '../../shared/operationsCatalogShared'
import {
  type V1OpRow,
  type V1OpsPreflightSnapshot,
  type V1OpRunResult,
  v1OpStatusBadge,
  formatMs,
  formatJsonForDisplay,
  formatGcUpstreamForDisplay,
  v1OpsPreflightRunStatusShortLabel,
  isV1OpRowRunnable
} from '../../shared/v1OpsView'

const props = defineProps<{
  operationsList: OperationSummary[]
  v1OpsFatalError: string | null
  v1OpsPreflight: V1OpsPreflightSnapshot | null
  v1OpsPreflightLoading: boolean
  v1OpsPreflightError: string | null
  v1OpsMetrics: { total: number; passed: number; failed: number; skipped: number; pending: number }
  v1OpsRowsByPhase: Array<{ phase: 1 | 2 | 3 | 4; label: string; rows: V1OpRow[] }>
  v1OpsLastRunAt: string | null
  v1OpsExpanded: Record<string, boolean>
  v1OpsRunningAll: boolean
  v1OpsSingleRunning: string | null
  v1OpsAnyRunnable: boolean
  v1OpsAdminUrl: string
}>()

defineEmits<{
  (e: 'run-suite'): void
  (e: 'run-single', op: string): void
  (e: 'toggle-row', op: string): void
}>()

function statusBadge(result: V1OpRunResult | undefined) {
  return v1OpStatusBadge(result)
}

function isRunnable(row: V1OpRow): boolean {
  return isV1OpRowRunnable(row)
}
</script>

<template>
  <div class="tp-suite tp-v1ops">
    <div class="tp-suite-hd">
      <h2><i class="fas fa-bolt tp-icon-hd"></i> Gateway /v1/{op}</h2>
      <code class="tp-code">POST /api/tests/v1-ops/run</code>
    </div>
    <p class="tp-block-desc">
      Один запуск на каждый из {{ props.operationsList.length }} роутов <code>/v1/{op}</code>.
      Заголовки школы — из Heap (<code>gc_test_school_host</code>,
      <code>gc_test_school_api_key</code>). Порядок и фазы — по
      <code>docs/gateway/gateway-testing-strategy.md</code>. Между исходящими вызовами — пауза ≥ 1 с
      (1 rps).
    </p>

    <div v-if="props.v1OpsFatalError" class="tp-err">
      <i class="fas fa-exclamation-triangle"></i> {{ props.v1OpsFatalError }}
    </div>

    <div v-if="props.v1OpsPreflight" class="tp-v1ops-readiness">
      <div class="tp-v1ops-readiness-row">
        <span class="tp-v1ops-readiness-h">Уровень A (Heap, manual §5.8):</span>
        <span
          class="tp-v1ops-readiness-tag"
          :class="
            props.v1OpsPreflight.levelA.schoolHostSet
              ? 'tp-v1ops-readiness-tag--ok'
              : 'tp-v1ops-readiness-tag--warn'
          "
          >gc_test_school_host {{ props.v1OpsPreflight.levelA.schoolHostSet ? '✓' : '—' }}</span
        >
        <span
          class="tp-v1ops-readiness-tag"
          :class="
            props.v1OpsPreflight.levelA.schoolApiKeySet
              ? 'tp-v1ops-readiness-tag--ok'
              : 'tp-v1ops-readiness-tag--warn'
          "
          >gc_test_school_api_key
          {{ props.v1OpsPreflight.levelA.schoolApiKeySet ? '✓' : '—' }}</span
        >
        <span
          class="tp-v1ops-readiness-tag"
          :class="
            props.v1OpsPreflight.levelA.developerKeySet
              ? 'tp-v1ops-readiness-tag--ok'
              : 'tp-v1ops-readiness-tag--warn'
          "
          >gc_developer_api_key {{ props.v1OpsPreflight.levelA.developerKeySet ? '✓' : '—' }}</span
        >
      </div>
      <div class="tp-v1ops-readiness-row">
        <span class="tp-v1ops-readiness-h">Готовность сценариев:</span>
        <span class="tp-v1ops-readiness-tag tp-v1ops-readiness-tag--ok">
          готовы {{ props.v1OpsPreflight.summary.ready }}
        </span>
        <span class="tp-v1ops-readiness-tag tp-v1ops-readiness-tag--warn">
          нужны Heap {{ props.v1OpsPreflight.summary.warnHeap }}
        </span>
        <span class="tp-v1ops-readiness-tag tp-v1ops-readiness-tag--warn">
          ждут предшественника {{ props.v1OpsPreflight.summary.warnDeps }}
        </span>
        <span class="tp-v1ops-readiness-tag tp-v1ops-readiness-tag--blocked">
          запрещены availability {{ props.v1OpsPreflight.summary.blockedAvailability }}
        </span>
        <a v-if="props.v1OpsAdminUrl" :href="props.v1OpsAdminUrl" class="tp-v1ops-readiness-link">
          <i class="fas fa-cog"></i> Открыть админку (manual §5.9)
        </a>
      </div>
    </div>
    <div
      v-else-if="props.v1OpsPreflightLoading"
      class="tp-v1ops-readiness tp-v1ops-readiness--loading"
    >
      <i class="fas fa-circle-notch fa-spin"></i> Подготовка статуса сьюита…
    </div>
    <div v-else-if="props.v1OpsPreflightError" class="tp-err">
      <i class="fas fa-exclamation-triangle"></i> Ошибка префлайта: {{ props.v1OpsPreflightError }}
    </div>

    <div class="tp-v1ops-metrics">
      <span class="tp-v1ops-metric"
        ><i class="fas fa-list-ol"></i> {{ props.v1OpsMetrics.total }} всего</span
      >
      <span class="tp-v1ops-metric tp-v1ops-metric--ok"
        ><i class="fas fa-check-circle"></i> {{ props.v1OpsMetrics.passed }} прошли</span
      >
      <span class="tp-v1ops-metric tp-v1ops-metric--fail"
        ><i class="fas fa-times-circle"></i> {{ props.v1OpsMetrics.failed }} упали</span
      >
      <span class="tp-v1ops-metric tp-v1ops-metric--skip"
        ><i class="fas fa-minus-circle"></i> {{ props.v1OpsMetrics.skipped }} пропущено</span
      >
      <span class="tp-v1ops-metric"
        ><i class="fas fa-clock"></i> {{ props.v1OpsMetrics.pending }} без прогона</span
      >
      <span v-if="props.v1OpsLastRunAt" class="tp-v1ops-metric tp-v1ops-time">
        <i class="fas fa-stopwatch"></i> {{ props.v1OpsLastRunAt }}
      </span>
    </div>

    <div v-for="phase in props.v1OpsRowsByPhase" :key="phase.phase" class="tp-v1ops-phase">
      <div class="tp-v1ops-phase-hd">
        <span class="tp-v1ops-phase-num">Фаза {{ phase.phase }}</span>
        <span class="tp-v1ops-phase-label">{{ phase.label }}</span>
        <span class="tp-v1ops-phase-count">{{ phase.rows.length }} сценариев</span>
      </div>
      <ul class="tp-tests" role="list">
        <li
          v-for="row in phase.rows"
          :key="row.entry.op"
          class="tp-test tp-v1ops-row"
          :class="`tp-v1ops-row--${row.visualStatus}`"
        >
          <div class="tp-test-accent" :class="`tp-v1ops-accent--${row.visualStatus}`"></div>
          <div class="tp-test-content">
            <div class="tp-test-main">
              <span class="tp-badge" :class="`tp-badge--${statusBadge(row.result).status}`">
                {{ statusBadge(row.result).text }}
              </span>
              <span class="tp-test-name">
                <span class="tp-v1ops-method">{{ row.entry.httpMethod }}</span>
                <code class="tp-v1ops-op">/v1/{{ row.entry.op }}</code>
                <span class="tp-v1ops-tag tp-v1ops-tag--contour">{{ row.entry.contour }}</span>
                <span class="tp-v1ops-tag" :class="`tp-v1ops-tag--av-${row.entry.availability}`">{{
                  row.entry.availability
                }}</span>
                <span
                  v-if="row.preflight && row.preflight.runStatus !== 'ready'"
                  class="tp-v1ops-tag"
                  :class="`tp-v1ops-tag--st-${row.preflight.runStatus}`"
                  >{{ v1OpsPreflightRunStatusShortLabel(row.preflight.runStatus) }}</span
                >
              </span>
              <button
                type="button"
                class="tp-test-run"
                :title="
                  row.preflight && row.preflight.runStatus !== 'ready'
                    ? row.preflight.blockReason
                    : 'Запустить сценарий'
                "
                :disabled="
                  props.v1OpsRunningAll || props.v1OpsSingleRunning !== null || !isRunnable(row)
                "
                @click="$emit('run-single', row.entry.op)"
              >
                <i
                  v-if="props.v1OpsSingleRunning === row.entry.op"
                  class="fas fa-circle-notch fa-spin"
                ></i>
                <i
                  v-else-if="row.preflight && row.preflight.runStatus === 'blocked-availability'"
                  class="fas fa-ban"
                ></i>
                <i
                  v-else-if="row.preflight && row.preflight.runStatus !== 'ready'"
                  class="fas fa-pause"
                ></i>
                <i v-else class="fas fa-play"></i>
              </button>
            </div>
            <div class="tp-v1ops-meta">
              <!-- UGC: в шаблоне не использовать ?. — старый компилятор даёт пустой ReferenceError при ре-рендере после fetch -->
              <span v-if="row.result && row.result.clientHttpStatus" class="tp-v1ops-meta-item"
                >HTTP {{ row.result.clientHttpStatus }}</span
              >
              <span v-if="row.result" class="tp-v1ops-meta-item">{{
                formatMs(row.result.durationMs)
              }}</span>
              <span
                v-if="row.result && row.result.errorCode"
                class="tp-v1ops-meta-item tp-v1ops-meta-err"
                >{{ row.result.errorCode }}</span
              >
              <span
                v-if="row.result && row.result.gatewayRequestId"
                class="tp-v1ops-meta-item tp-v1ops-meta-req"
                >req: {{ row.result.gatewayRequestId }}</span
              >
            </div>
            <p
              v-if="row.preflight && row.preflight.runStatus === 'blocked-availability'"
              class="tp-v1ops-block tp-v1ops-block--blocked"
            >
              <i class="fas fa-ban"></i>
              {{ row.preflight.blockReason }}
            </p>
            <p
              v-else-if="row.preflight && row.preflight.runStatus === 'warn-heap'"
              class="tp-v1ops-block tp-v1ops-block--warn"
            >
              <i class="fas fa-key"></i>
              {{ row.preflight.blockReason }}
              <a v-if="props.v1OpsAdminUrl" :href="props.v1OpsAdminUrl" class="tp-v1ops-block-link">
                <i class="fas fa-cog"></i> Задать в админке
              </a>
            </p>
            <p
              v-else-if="row.preflight && row.preflight.runStatus === 'warn-deps'"
              class="tp-v1ops-block tp-v1ops-block--warn"
            >
              <i class="fas fa-link"></i>
              {{ row.preflight.blockReason }}
            </p>
            <p v-if="row.result && row.result.skipReason" class="tp-test-err">
              <i class="fas fa-info-circle"></i> {{ row.result.skipReason }}
            </p>
            <p v-if="row.entry.op && row.result && row.result.hint" class="tp-v1ops-hint">
              {{ row.result.hint }}
            </p>
            <p v-else-if="row.preflight && row.preflight.hint && !row.result" class="tp-v1ops-hint">
              {{ row.preflight.hint }}
            </p>
            <p v-else-if="!row.result && !row.preflight" class="tp-v1ops-hint tp-v1ops-hint--idle">
              {{ row.entry.op }} — ожидает запуска
            </p>
            <button
              v-if="
                (row.result && row.result.sentArgs) ||
                (row.result && row.result.parsedResponse !== undefined) ||
                (row.result && row.result.gcUpstream)
              "
              type="button"
              class="tp-v1ops-toggle"
              @click="$emit('toggle-row', row.entry.op)"
            >
              <i
                :class="
                  props.v1OpsExpanded[row.entry.op] ? 'fas fa-chevron-up' : 'fas fa-chevron-down'
                "
              ></i>
              {{
                props.v1OpsExpanded[row.entry.op]
                  ? 'Скрыть детали'
                  : 'Показать детали (args, gateway, GetCourse)'
              }}
            </button>
            <div v-if="props.v1OpsExpanded[row.entry.op] && row.result" class="tp-v1ops-payload">
              <div v-if="row.result.sentArgs" class="tp-v1ops-payload-block">
                <div class="tp-v1ops-payload-h">Отправленные args</div>
                <pre>{{ formatJsonForDisplay(row.result.sentArgs) }}</pre>
              </div>
              <div v-if="row.result.parsedResponse !== undefined" class="tp-v1ops-payload-block">
                <div class="tp-v1ops-payload-h">Ответ gateway /v1/{{ row.entry.op }} (обёртка)</div>
                <pre>{{ formatJsonForDisplay(row.result.parsedResponse) }}</pre>
              </div>
              <div v-if="row.result.gcUpstream" class="tp-v1ops-payload-block">
                <div class="tp-v1ops-payload-h">Сырой ответ GetCourse (школа)</div>
                <pre>{{ formatGcUpstreamForDisplay(row.result.gcUpstream) }}</pre>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <button
      type="button"
      class="tp-btn tp-suite-run"
      :title="
        !props.v1OpsAnyRunnable
          ? 'Нет ни одного готового сценария: задайте уровень A в Heap (manual §5.8) и недостающие gc_itest_* (§5.9).'
          : 'Запустить сьюит'
      "
      :disabled="
        props.v1OpsRunningAll || props.v1OpsSingleRunning !== null || !props.v1OpsAnyRunnable
      "
      @click="$emit('run-suite')"
    >
      <i v-if="props.v1OpsRunningAll" class="fas fa-circle-notch fa-spin"></i>
      <i v-else class="fas fa-play"></i>
      {{
        props.v1OpsRunningAll
          ? 'Прогон сьюита /v1/{op}...'
          : `Запустить сьюит /v1/{op} (${props.operationsList.length} роутов)`
      }}
    </button>
  </div>
</template>
