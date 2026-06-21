<template>
  <section class="panel-section">
    <header class="panel-section-head">
      <span class="prompt">›</span>
      <h2>Создать запрос</h2>
      <span class="head-meta muted">Универсальная отправка операций к подключённым гейтвеям</span>
    </header>

    <div class="grid-form">
      <label class="field field-full">
        <span class="field-label">Операция <span class="field-required">*</span></span>
        <select
          class="field-input"
          :value="currentKey"
          @change="onChangeOperation($event.target.value)"
        >
          <optgroup v-for="group in groups" :key="group.gatewayId" :label="group.label">
            <option v-for="op in group.operations" :key="op.op" :value="opKey(op.gatewayId, op.op)">
              {{ op.httpMethod }} · {{ op.op }} — {{ op.title }}
            </option>
          </optgroup>
        </select>
      </label>

      <div v-if="descriptor" class="field-full op-meta">
        <span class="gateway-badge" :class="'gateway-' + descriptor.gatewayId">
          {{ gatewayLabelOf(descriptor.gatewayId) }}
        </span>
        <code class="op-meta-method">{{ descriptor.httpMethod }}</code>
        <code class="op-meta-op">{{ descriptor.op }}</code>
        <p class="op-meta-desc muted">{{ descriptor.description }}</p>
      </div>
    </div>

    <form v-if="descriptor" class="grid-form" @submit.prevent="$emit('submit')">
      <!-- GC-операции: иерархический рендер из argsTree (FormRow[]). -->
      <HomeGcRequestForm
        v-if="isGcOp"
        class="field-full"
        :form-rows="gcFormRows"
        :args-values="gcArgsValues"
        :errors="gcErrors"
        :root-kind="gcRootKind"
        @update:args-values="$emit('update:gcArgsValues', $event)"
      />

      <!-- LifePay/Lava.Top: плоский рендер по descriptor.fields. -->
      <template v-for="f in flatFields" :key="f.name">
        <label class="field" :class="{ 'field-full': isWideField(f) }">
          <span class="field-label">
            {{ f.label || f.name }}
            <span v-if="f.required" class="field-required">*</span>
            <span v-else class="field-optional muted">(опционально)</span>
          </span>

          <select
            v-if="f.type === 'select'"
            :value="form[f.name] || ''"
            @change="updateField(f.name, $event.target.value)"
            class="field-input"
            :required="f.required"
          >
            <option v-for="opt in f.options || []" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>

          <textarea
            v-else-if="f.type === 'json' || f.type === 'textarea'"
            :value="form[f.name] || ''"
            @input="updateField(f.name, $event.target.value)"
            class="field-input field-textarea"
            :placeholder="f.placeholder"
            :required="f.required"
            rows="6"
          ></textarea>

          <input
            v-else
            :value="form[f.name] || ''"
            @input="updateField(f.name, $event.target.value)"
            :type="htmlInputType(f.type)"
            :inputmode="f.type === 'number' ? 'decimal' : undefined"
            :step="f.type === 'number' ? f.numberStep || 'any' : undefined"
            :min="f.type === 'number' ? f.numberMin : undefined"
            :placeholder="f.placeholder"
            :required="f.required"
            class="field-input"
          />

          <span v-if="f.hint" class="field-hint">{{ f.hint }}</span>
          <span v-if="errors[f.name]" class="form-msg is-err">
            <i class="fas fa-circle-exclamation"></i> {{ errors[f.name] }}
          </span>
        </label>
      </template>

      <div v-if="!isGcOp && descriptor.fields.length === 0" class="field-full muted op-no-fields">
        <i class="fas fa-circle-info"></i> Эта операция не требует аргументов.
      </div>

      <div class="form-actions field-full">
        <button type="submit" class="btn-primary" :disabled="loading || hasErrors">
          <i class="fas" :class="loading ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>
          {{ loading ? 'Отправка...' : 'Отправить запрос' }}
        </button>
        <button v-if="result" type="button" class="btn-secondary" @click="$emit('reset-result')">
          <i class="fas fa-eraser"></i> Очистить результат
        </button>
      </div>
    </form>

    <div
      v-if="result"
      class="bill-result"
      :class="result.ok ? 'bill-result-ok' : 'bill-result-err'"
    >
      <p class="bill-meta">
        <span class="gateway-badge" :class="'gateway-' + (result.gatewayId || 'unknown')">
          {{ gatewayLabelOf(result.gatewayId) }}
        </span>
        <code>{{ result.op }}</code>
      </p>
      <p v-if="result.ok" class="form-msg is-ok">
        <i class="fas fa-circle-check"></i> Ответ получен
      </p>
      <p v-else class="form-msg is-err">
        <i class="fas fa-circle-exclamation"></i>
        Ошибка: {{ result.error?.code }} — {{ result.error?.message }}
      </p>
      <p v-if="result.requestId" class="bill-meta">
        requestId: <code>{{ result.requestId }}</code>
        <button
          class="btn-mini"
          @click="$emit('lookup', result.requestId)"
          title="Открыть в журнале"
        >
          <i class="fas fa-magnifying-glass"></i> найти
        </button>
        <button class="btn-mini" @click="$emit('copy-text', result.requestId)" title="Скопировать">
          <i class="far fa-copy"></i>
        </button>
      </p>

      <details v-if="result.ok && result.data" class="bill-success">
        <summary>Тело ответа (data)</summary>
        <pre class="json-block">{{ formatJson(result.data) }}</pre>
      </details>

      <div v-if="paymentUrl" class="bill-success">
        <p>
          paymentUrl: <code class="paymenturl">{{ paymentUrl }}</code>
        </p>
        <div class="qr-block">
          <p class="muted"><i class="fas fa-qrcode"></i> QR-код для оплаты</p>
          <div ref="qrContainer" class="qr-container"></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
// Универсальная вкладка «Создать запрос»: select операций (групп — по гейтвеям) +
// динамическая форма + результат с бейджем гейтвея.
// Не-GC операции (LifePay/Lava.Top) — плоская форма по OPERATIONS_CLIENT_CATALOG.
// GC-операции — иерархическая форма HomeGcRequestForm по argsTree (FormRow[]).
// QR-код рендерится локально, если в descriptor.paymentUrlPath указан путь к
// строке URL внутри data ответа.
//
// Двусторонняя связь — через update:form / update:currentKey / update:gcArgsValues.
// Submit, lookup и очистка результата — emit. CSS глобальный (sbpHomeCss*).
import {
  groupOperationsForUi,
  findClientOperation,
  gatewayLabel,
  operationKey,
  validateForm,
  buildGcOperationDescriptor
} from '../../shared/operationsClientCatalog'
import { isGatewayId } from '../../shared/invokeApi'
import HomeGcRequestForm from './HomeGcRequestForm.vue'

export default {
  name: 'HomeCreateRequestTab',
  components: { HomeGcRequestForm },
  props: {
    currentKey: { type: String, required: true },
    form: { type: Object, required: true },
    loading: { type: Boolean, default: false },
    result: { type: Object, default: null },
    gcOperations: { type: Array, default: () => [] },
    // Иерархическая форма GC: единственный источник истины для formRows/rootKind —
    // computed в `sbpHomePageMixin.ts`; здесь принимаем готовые props.
    isGcOp: { type: Boolean, default: false },
    gcFormRows: { type: Array, default: () => [] },
    gcRootKind: { type: String, default: 'object' },
    gcArgsValues: { type: Object, default: () => ({}) },
    gcErrors: { type: Object, default: () => ({}) }
  },
  emits: [
    'submit',
    'reset-result',
    'lookup',
    'copy-text',
    'update:form',
    'update:currentKey',
    'update:gcArgsValues'
  ],
  computed: {
    groups() {
      return groupOperationsForUi(this.gcOperations)
    },
    descriptor() {
      const idx = (this.currentKey || '').indexOf(':')
      if (idx <= 0) return null
      const gw = this.currentKey.slice(0, idx)
      const op = this.currentKey.slice(idx + 1)
      if (!isGatewayId(gw)) return null
      if (gw === 'gc') {
        const entry = (this.gcOperations || []).find((e) => e.op === op)
        return entry ? buildGcOperationDescriptor(entry) : null
      }
      return findClientOperation(gw, op)
    },
    /**
     * Плоские поля для рендера ветки не-GC: для GC возвращаем пустой массив,
     * чтобы `v-for` не пытался итерировать `descriptor.fields` GC-операции
     * (для GC рендер идёт через `<HomeGcRequestForm>` по `gcFormRows`).
     */
    flatFields() {
      if (this.isGcOp) return []
      return (this.descriptor && this.descriptor.fields) || []
    },
    errors() {
      // Для GC-операций ошибки приходят пропом из родителя (вычислены через
      // buildFieldErrors по дереву argsTree, ключи — точечные пути). Для
      // LifePay/Lava.Top — текущая validateForm по плоским полям.
      if (this.isGcOp) return this.gcErrors || {}
      if (!this.descriptor) return {}
      return validateForm(this.descriptor, this.form || {})
    },
    hasErrors() {
      return Object.keys(this.errors).length > 0
    },
    paymentUrl() {
      if (!this.descriptor || !this.descriptor.paymentUrlPath) return ''
      if (!this.result || !this.result.ok || !this.result.data) return ''
      const v = this.result.data?.[this.descriptor.paymentUrlPath]
      return typeof v === 'string' && v ? v : ''
    }
  },
  watch: {
    paymentUrl: {
      handler(val) {
        if (val) this.$nextTick(() => this.renderQr(val))
      },
      immediate: false
    }
  },
  methods: {
    opKey(gatewayId, op) {
      return operationKey(gatewayId, op)
    },
    gatewayLabelOf(gatewayId) {
      if (!gatewayId) return '—'
      return gatewayLabel(gatewayId)
    },
    isWideField(field) {
      return field.type === 'textarea' || field.type === 'json' || field.type === 'url'
    },
    htmlInputType(t) {
      if (t === 'number') return 'number'
      if (t === 'email') return 'email'
      if (t === 'url') return 'url'
      if (t === 'tel') return 'tel'
      return 'text'
    },
    updateField(name, value) {
      this.$emit('update:form', { ...(this.form || {}), [name]: value })
    },
    onChangeOperation(newKey) {
      this.$emit('update:currentKey', newKey)
    },
    formatJson(value) {
      try {
        return JSON.stringify(value, null, 2)
      } catch (_e) {
        return String(value)
      }
    },
    renderQr(paymentUrl) {
      if (!paymentUrl || typeof window === 'undefined') return
      const container = this.$refs.qrContainer
      if (!container) return
      container.innerHTML = ''
      if (!window.QRCode) {
        container.textContent = 'QR-код недоступен — qrcode.js не загружен. Используйте paymentUrl.'
        return
      }
      const canvas = document.createElement('canvas')
      container.appendChild(canvas)
      window.QRCode.toCanvas(canvas, paymentUrl, { width: 240, margin: 1 }, (err) => {
        if (err) container.innerHTML = 'Ошибка построения QR: ' + String(err)
      })
    }
  }
}
</script>
