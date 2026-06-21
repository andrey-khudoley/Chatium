<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { PomodoroAfterLongRest, PomodoroPhaseCompleteAction } from '../../lib/pomodoro-types'
import { normalizePhaseChangeSoundId } from '../../lib/pomodoro-types'
import { POMODORO_PHASE_CHANGE_SOUND_OPTIONS, playPomodoroPhaseChangeSound } from '../../lib/pomodoro-phase-sounds'

type SettingsDraft = {
  workMinutes: number
  restMinutes: number
  longRestMinutes: number
  cyclesUntilLongRest: number
  pauseAfterWork: boolean
  pauseAfterRest: boolean
  afterLongRest: PomodoroAfterLongRest
  autoStartRest: boolean
  autoStartNextCycle: boolean
  phaseChangeSound: number
  afterWorkAction: PomodoroPhaseCompleteAction
  afterRestAction: PomodoroPhaseCompleteAction
}

const props = defineProps<{
  isOpen: boolean
  saving: boolean
  modelValue: SettingsDraft
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'save', payload: SettingsDraft): void
}>()

const draft = reactive<SettingsDraft>({
  workMinutes: 25,
  restMinutes: 5,
  longRestMinutes: 20,
  cyclesUntilLongRest: 4,
  pauseAfterWork: false,
  pauseAfterRest: false,
  afterLongRest: 'pause',
  autoStartRest: false,
  autoStartNextCycle: false,
  phaseChangeSound: 3,
  afterWorkAction: 'overtime',
  afterRestAction: 'overtime',
})

function clamp(v: number, min: number, max: number): number {
  const n = Number.isFinite(v) ? Math.floor(v) : min
  return Math.max(min, Math.min(max, n))
}

function syncDraft(source: SettingsDraft): void {
  draft.workMinutes = clamp(source.workMinutes, 1, 180)
  draft.restMinutes = clamp(source.restMinutes, 1, 180)
  draft.longRestMinutes = clamp(source.longRestMinutes, 1, 180)
  draft.cyclesUntilLongRest = clamp(source.cyclesUntilLongRest, 1, 12)
  draft.pauseAfterWork = !!source.pauseAfterWork
  draft.pauseAfterRest = !!source.pauseAfterRest
  draft.afterLongRest = source.afterLongRest === 'stop' ? 'pause' : source.afterLongRest
  draft.autoStartRest = !!source.autoStartRest
  draft.autoStartNextCycle = !!source.autoStartNextCycle
  draft.phaseChangeSound = normalizePhaseChangeSoundId(source.phaseChangeSound)
  draft.afterWorkAction = source.autoStartRest ? 'auto' : source.pauseAfterWork ? 'pause' : 'overtime'
  draft.afterRestAction = source.autoStartNextCycle ? 'auto' : source.pauseAfterRest ? 'pause' : 'overtime'
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) syncDraft(props.modelValue)
  },
  { immediate: true }
)

function onBackdropClick(event: MouseEvent): void {
  if (event.target !== event.currentTarget || props.saving) return
  emit('close')
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && !props.saving) emit('close')
}

function submit(): void {
  const afterWorkAction = draft.afterWorkAction
  const afterRestAction = draft.afterRestAction
  emit('save', {
    workMinutes: draft.workMinutes,
    restMinutes: draft.restMinutes,
    longRestMinutes: draft.longRestMinutes,
    cyclesUntilLongRest: draft.cyclesUntilLongRest,
    autoStartRest: afterWorkAction === 'auto',
    pauseAfterWork: afterWorkAction === 'pause',
    autoStartNextCycle: afterRestAction === 'auto',
    pauseAfterRest: afterRestAction === 'pause',
    afterLongRest: draft.afterLongRest === 'stop' ? 'pause' : draft.afterLongRest,
    phaseChangeSound: draft.phaseChangeSound
  })
}

function previewPhaseSound(): void {
  playPomodoroPhaseChangeSound(draft.phaseChangeSound)
}
</script>

<template>
  <teleport to="body">
    <div v-if="props.isOpen" class="settings-overlay" @click="onBackdropClick" @keydown="onKeyDown" tabindex="0">
      <section class="settings-modal crt-form-panel">
        <div class="modal-scanlines"></div>
        <header class="settings-head">
          <h3><i class="fa-solid fa-sliders" /> Настройки</h3>
          <button class="modal-close" type="button" :disabled="props.saving" @click="emit('close')">
            <i class="fa-solid fa-xmark" />
          </button>
        </header>

        <div class="settings-body">
          <div class="settings-section">
            <div class="section-title">
              <i class="fa-solid fa-clock" /> Таймеры
            </div>
            <div class="settings-row-grid">
              <label class="field-label">
                <span class="field-name">Работа</span>
                <div class="field-input-wrap">
                  <input v-model.number="draft.workMinutes" class="field-input" type="number" min="1" max="180" />
                  <span class="field-unit">мин</span>
                </div>
              </label>
              <label class="field-label">
                <span class="field-name">Отдых</span>
                <div class="field-input-wrap">
                  <input v-model.number="draft.restMinutes" class="field-input" type="number" min="1" max="180" />
                  <span class="field-unit">мин</span>
                </div>
              </label>
              <label class="field-label">
                <span class="field-name">Длинный отдых</span>
                <div class="field-input-wrap">
                  <input v-model.number="draft.longRestMinutes" class="field-input" type="number" min="1" max="180" />
                  <span class="field-unit">мин</span>
                </div>
              </label>
              <label class="field-label">
                <span class="field-name">Циклов до длинного</span>
                <div class="field-input-wrap">
                  <input v-model.number="draft.cyclesUntilLongRest" class="field-input" type="number" min="1" max="12" />
                  <span class="field-unit">шт</span>
                </div>
              </label>
            </div>
          </div>

          <div class="settings-divider"></div>

          <div class="settings-section">
            <div class="section-title">
              <i class="fa-solid fa-volume-high" /> Сигнал при смене этапа
            </div>
            <p class="sound-hint">
              От тихого до заметного — при переходе между работой и отдыхом и при окончании фазы по таймеру.
            </p>
            <div class="sound-row">
              <label class="field-label sound-select-label">
                <span class="field-name">Пресет</span>
                <select v-model.number="draft.phaseChangeSound" class="field-input field-select">
                  <option v-for="opt in POMODORO_PHASE_CHANGE_SOUND_OPTIONS" :key="opt.id" :value="opt.id">
                    {{ opt.id }}. {{ opt.label }} — {{ opt.hint }}
                  </option>
                </select>
              </label>
              <button
                class="pomo-modal-btn pomo-modal-btn--ghost sound-preview-btn"
                type="button"
                :disabled="props.saving"
                @click="previewPhaseSound"
              >
                <i class="fa-solid fa-play" /> Прослушать
              </button>
            </div>
          </div>

          <div class="settings-divider"></div>

          <div class="settings-section">
            <div class="section-title">
              <i class="fa-solid fa-robot" /> После завершения этапа
            </div>
            <label class="field-label">
              <span class="field-name">После работы</span>
              <select v-model="draft.afterWorkAction" class="field-input field-select">
                <option value="auto">Автоматический переход на следующий этап</option>
                <option value="pause">Пауза после завершения этапа</option>
                <option value="overtime">Продолжение отсчёта (отрицательный таймер)</option>
              </select>
            </label>
            <label class="field-label">
              <span class="field-name">После отдыха</span>
              <select v-model="draft.afterRestAction" class="field-input field-select">
                <option value="auto">Автоматический переход на следующий этап</option>
                <option value="pause">Пауза после завершения этапа</option>
                <option value="overtime">Продолжение отсчёта (отрицательный таймер)</option>
              </select>
            </label>
          </div>

          <div class="settings-divider"></div>

          <div class="settings-section">
            <div class="section-title">
              <i class="fa-solid fa-hand" /> После длинного отдыха
            </div>
            <label class="field-label">
              <span class="field-name">Режим</span>
              <select v-model="draft.afterLongRest" class="field-input field-select">
                <option value="auto">Автоматический переход на следующий этап</option>
                <option value="pause">Пауза после завершения этапа</option>
                <option value="overtime">Продолжение отсчёта (отрицательный таймер)</option>
              </select>
            </label>
          </div>
        </div>

        <footer class="settings-actions">
          <button class="pomo-modal-btn pomo-modal-btn--ghost" type="button" :disabled="props.saving" @click="emit('close')">
            Отмена
          </button>
          <button class="pomo-modal-btn pomo-modal-btn--primary" type="button" :disabled="props.saving" @click="submit">
            {{ props.saving ? 'Сохранение...' : 'Сохранить' }}
          </button>
        </footer>
      </section>
    </div>
  </teleport>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 5, 5, .8);
  z-index: 80;
  display: grid;
  place-items: center;
  padding: .8rem;
  backdrop-filter: blur(2px);
}

.settings-modal {
  width: min(440px, 95vw);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-bg-secondary);
  /* Не используем border: вместе с clip-path внешняя обводка часто обрезается (особенно снизу). Рамка — inset box-shadow внутри формы. */
  border: none;
  padding: 0;
  position: relative;
  clip-path: polygon(
    0 6px, 6px 6px, 6px 0,
    calc(100% - 6px) 0, calc(100% - 6px) 6px, 100% 6px,
    100% calc(100% - 6px), calc(100% - 6px) calc(100% - 6px), calc(100% - 6px) 100%,
    6px 100%, 6px calc(100% - 6px), 0 calc(100% - 6px)
  );
  box-shadow:
    inset 0 0 0 1px var(--color-border-light),
    0 16px 48px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(0, 0, 0, 0.3),
    0 0 40px rgba(211, 35, 75, 0.06);
}

.modal-scanlines {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.04) 0px,
    rgba(0, 0, 0, 0.04) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 0;
}

.settings-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .6rem;
  padding: .7rem .85rem;
  border-bottom: 1px solid var(--color-border);
  position: relative;
  z-index: 1;
}

.settings-head h3 {
  margin: 0;
  font-size: .85rem;
  letter-spacing: .08em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: .45rem;
  color: var(--color-text);
}

.settings-head h3 i {
  color: var(--color-accent);
  font-size: .8rem;
}

.modal-close {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all .2s ease;
  clip-path: polygon(
    0 2px, 2px 2px, 2px 0,
    calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px,
    100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%,
    2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px)
  );
}

.modal-close:hover {
  border-color: var(--color-accent);
  color: var(--color-text);
}

.settings-body {
  padding: .75rem .85rem;
  position: relative;
  z-index: 1;
}

.settings-section {
  display: grid;
  gap: .45rem;
}

.section-title {
  font-weight: 600;
  text-transform: uppercase;
  font-size: .7rem;
  letter-spacing: .1em;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: .4rem;
  margin-bottom: .15rem;
}

.section-title i {
  color: var(--color-accent);
  font-size: .65rem;
  opacity: .8;
}

.settings-divider {
  height: 1px;
  background: var(--color-border);
  margin: .6rem 0;
}

.sound-hint {
  margin: 0 0 .35rem;
  font-size: .68rem;
  line-height: 1.35;
  color: var(--color-text-secondary);
}

.sound-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: .45rem;
}

.sound-select-label {
  flex: 1 1 200px;
  min-width: 0;
}

.sound-preview-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: .35rem;
}

.settings-row-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: .4rem;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: .2rem;
  font-size: .78rem;
}

.field-name {
  color: var(--color-text-secondary);
  font-size: .7rem;
  text-transform: uppercase;
  letter-spacing: .06em;
}

.field-input-wrap {
  display: flex;
  align-items: center;
  gap: .3rem;
}

.field-input {
  width: 100%;
  padding: .35rem .5rem;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-family: inherit;
  font-size: .8rem;
  transition: border-color .2s ease;
}

.field-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px rgba(211, 35, 75, 0.3);
}

.field-unit {
  font-size: .68rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.field-select {
  appearance: none;
  cursor: pointer;
  padding-right: 1.5rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%23a0a0a0' fill='none' stroke-width='1.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right .4rem center;
  background-size: 12px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: .45rem;
  cursor: pointer;
  font-size: .78rem;
  padding: .15rem 0;
}

.toggle-checkbox {
  appearance: none;
  width: 14px;
  height: 14px;
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-tertiary);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: all .15s ease;
}

.toggle-checkbox:checked {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.toggle-checkbox:checked::after {
  content: '';
  position: absolute;
  top: 1px; left: 4px;
  width: 4px; height: 8px;
  border: solid #fff;
  border-width: 0 1.5px 1.5px 0;
  transform: rotate(45deg);
}

.toggle-text {
  color: var(--color-text);
}

.settings-actions {
  padding: .65rem .85rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: .4rem;
  position: relative;
  z-index: 1;
}

.pomo-modal-btn {
  padding: .45rem .9rem;
  font-size: .78rem;
  font-family: inherit;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  transition: all .2s ease;
  clip-path: polygon(
    0 3px, 3px 3px, 3px 0,
    calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
    100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
    3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
  );
}

.pomo-modal-btn:disabled {
  opacity: .45;
  cursor: not-allowed;
}

.pomo-modal-btn--ghost:hover:not(:disabled) {
  border-color: var(--color-border-light);
}

.pomo-modal-btn--primary {
  background: var(--color-accent);
  border-color: transparent;
  color: #fff;
  font-weight: 600;
}

.pomo-modal-btn--primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
  box-shadow: 0 0 12px rgba(211, 35, 75, 0.3);
}
</style>
