<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

export type JnCrtSelectOption = {
  value: string | number
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number
    options: JnCrtSelectOption[]
    disabled?: boolean
    id?: string
  }>(),
  { disabled: false }
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)

/** fixed в viewport — вне модалки, чтобы не терять фон из‑за stacking context */
const panelFixedStyle = ref({ top: '0px', left: '0px', width: '0px' })
/** не показывать панель до первого sync — иначе кадр в (0,0) */
const panelPositionReady = ref(false)

function syncPanelPosition() {
  const el = triggerRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const margin = 8
  const vw = typeof window !== 'undefined' ? window.innerWidth : 400
  let width = Math.min(r.width, vw - margin * 2)
  let left = r.left
  if (left + width > vw - margin) {
    left = vw - margin - width
  }
  if (left < margin) {
    left = margin
    width = Math.min(width, vw - margin * 2)
  }
  panelFixedStyle.value = {
    top: `${r.bottom + 2}px`,
    left: `${left}px`,
    width: `${width}px`
  }
}

let resizeObserver: ResizeObserver | null = null

watch(open, (isOpen) => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (!isOpen) {
    panelPositionReady.value = false
    return
  }
  void nextTick(() => {
    syncPanelPosition()
    panelPositionReady.value = true
    const el = triggerRef.value
    if (el && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => syncPanelPosition())
      resizeObserver.observe(el)
    }
  })
})

function onWinResizeOrScroll() {
  if (open.value) syncPanelPosition()
}

const baseId = `jn-crt-${Math.random().toString(36).slice(2, 11)}`
const triggerId = computed(() => props.id ?? `${baseId}-tr`)
const listboxId = computed(() => (props.id ? `${props.id}-listbox` : `${baseId}-lb`))

const displayLabel = computed(() => {
  const o = props.options.find((x) => x.value === props.modelValue)
  return o?.label ?? '—'
})

function toggle() {
  if (props.disabled) return
  open.value = !open.value
}

function selectValue(v: string | number) {
  emit('update:modelValue', v)
  open.value = false
}

function onDocPointerDown(e: PointerEvent) {
  if (!open.value) return
  const t = e.target as Node
  if (rootEl.value?.contains(t) || panelEl.value?.contains(t)) return
  open.value = false
}

function onDocKeydown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') {
    open.value = false
    e.stopPropagation()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
  document.addEventListener('keydown', onDocKeydown, true)
  window.addEventListener('resize', onWinResizeOrScroll)
  window.addEventListener('scroll', onWinResizeOrScroll, true)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  document.removeEventListener('keydown', onDocKeydown, true)
  window.removeEventListener('resize', onWinResizeOrScroll)
  window.removeEventListener('scroll', onWinResizeOrScroll, true)
})
</script>

<template>
  <div
    ref="rootEl"
    class="jn-crt-select"
    :class="{ 'jn-crt-select--open': open, 'jn-crt-select--disabled': disabled }"
  >
    <button
      ref="triggerRef"
      :id="triggerId"
      type="button"
      class="jn-crt-select__trigger jn-input"
      :disabled="disabled"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-controls="listboxId"
      @click="toggle"
    >
      <span class="jn-crt-select__value">{{ displayLabel }}</span>
      <span class="jn-crt-select__chev" aria-hidden="true" />
    </button>
    <Teleport to="body">
      <Transition name="jn-crt-select-panel">
        <div
          v-show="open && !disabled && panelPositionReady"
          :id="listboxId"
          ref="panelEl"
          class="jn-crt-select__panel jn-crt-select__panel--fixed custom-scrollbar"
          role="listbox"
          :style="{
            top: panelFixedStyle.top,
            left: panelFixedStyle.left,
            width: panelFixedStyle.width
          }"
          :aria-labelledby="triggerId"
          @click.stop
        >
          <div class="jn-crt-select__panel-bg" aria-hidden="true" />
          <div class="jn-crt-select__panel-inner">
            <button
              v-for="(opt, idx) in options"
              :key="String(opt.value) + '-' + idx"
              type="button"
              role="option"
              class="jn-crt-select__option"
              :class="{ 'jn-crt-select__option--current': opt.value === modelValue }"
              :aria-selected="opt.value === modelValue"
              @click="selectValue(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.jn-crt-select {
  position: relative;
  width: 100%;
  margin-bottom: 0.75rem;
  z-index: 1;
}

.jn-crt-select--open {
  z-index: 2;
}

.jn-crt-select--disabled {
  opacity: 0.55;
}

.jn-crt-select__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  box-sizing: border-box;
  padding: 0.62rem 0.72rem;
  margin-bottom: 0;
  border: 1px solid var(--color-border, #2a2a2a);
  border-radius: 2px;
  background: var(--color-bg, #0a0a0a);
  color: var(--color-text, #e8e8e8);
  text-align: left;
  cursor: pointer;
  font: inherit;
  font-size: 1.04rem;
  line-height: 1.25;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.jn-crt-select__trigger:disabled {
  cursor: not-allowed;
}

.jn-crt-select__trigger:focus,
.jn-crt-select__trigger:focus-visible {
  outline: none;
  border-color: #d3234b;
  box-shadow: 0 0 0 1px rgba(211, 35, 75, 0.35);
}

.jn-crt-select__value {
  display: block;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: inherit;
  letter-spacing: inherit;
}

.jn-crt-select__chev {
  flex-shrink: 0;
  width: 0.78rem;
  height: 0.78rem;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a0a0a0' d='M2.8 4.2L6 7.4l3.2-3.2'/%3E%3C/svg%3E")
    center / contain no-repeat;
  transition: transform 0.2s ease;
}

.jn-crt-select--open .jn-crt-select__chev {
  transform: rotate(180deg);
}

.jn-crt-select__panel--fixed {
  position: fixed;
  z-index: 250000;
  max-height: min(14rem, 45vh);
  overflow-x: hidden;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  border: 1px solid #2a2a2a;
  border-radius: 2px;
  box-shadow:
    0 0 0 1px rgba(211, 35, 75, 0.12),
    0 8px 28px rgba(0, 0, 0, 0.65),
    0 0 24px rgba(211, 35, 75, 0.08);
}

.jn-crt-select__panel-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: 2px;
  pointer-events: none;
  background-color: #0a0a0a;
}

.jn-crt-select__panel-inner {
  position: relative;
  z-index: 1;
  padding: 0.2rem 0;
}

.jn-crt-select__panel-inner::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.14;
  border-radius: 2px;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 1px,
    rgba(0, 0, 0, 0.55) 1px,
    rgba(0, 0, 0, 0.55) 2px
  );
}

.jn-crt-select__panel-inner::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  opacity: 0.06;
  border-radius: 2px;
  background: radial-gradient(ellipse 120% 80% at 50% 0%, rgba(211, 35, 75, 0.25), transparent 55%);
}

.jn-crt-select__option {
  position: relative;
  z-index: 3;
  display: block;
  width: 100%;
  margin: 0;
  padding: 0.56rem 0.72rem;
  box-sizing: border-box;
  font: inherit;
  font-size: 1.02rem;
  color: #e8e8e8;
  text-align: left;
  background: transparent;
  border: none;
  border-left: 2px solid transparent;
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease,
    text-shadow 0.12s ease;
}

.jn-crt-select__option:hover,
.jn-crt-select__option:focus {
  outline: none;
  background: rgba(211, 35, 75, 0.14);
  color: #fff;
  text-shadow: 0 0 10px rgba(211, 35, 75, 0.45);
}

.jn-crt-select__option--current {
  background: rgba(211, 35, 75, 0.2);
  border-left-color: #d3234b;
  box-shadow: inset 0 0 12px rgba(211, 35, 75, 0.06);
}

.jn-crt-select-panel-enter-active,
.jn-crt-select-panel-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.jn-crt-select-panel-enter-from,
.jn-crt-select-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
