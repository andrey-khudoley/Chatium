<template>
  <Modal
    :is-open="isOpen"
    :title="`Модерация: ${userName}`"
    size="medium"
    @close="$emit('close')"
  >
    <div class="moderation-modal-content">
        <!-- Выбор типа модерации -->
        <div class="form-group">
          <label>Тип</label>
          <div class="moderation-types">
            <button 
              :class="['type-btn', { active: moderationType === 'mute' }]"
              @click="moderationType = 'mute'"
            >
              <i class="fas fa-volume-mute"></i>
              <span>Мьют</span>
              <small>Запретить писать</small>
            </button>
            <button 
              :class="['type-btn', { active: moderationType === 'ban' }]"
              @click="moderationType = 'ban'"
            >
              <i class="fas fa-ban"></i>
              <span>Бан</span>
              <small>Исключить из чата</small>
            </button>
          </div>
        </div>

        <!-- Выбор длительности -->
        <div class="form-group">
          <label>Длительность</label>
          <div class="duration-presets">
            <button 
              v-for="preset in durationPresets" 
              :key="preset.value"
              :class="['preset-btn', { active: selectedDuration === preset.value }]"
              @click="selectedDuration = preset.value"
            >
              {{ preset.label }}
            </button>
          </div>
          
          <!-- Кастомная длительность -->
          <div v-if="selectedDuration === 'custom'" class="custom-duration">
            <input 
              v-model.number="customDuration" 
              type="number" 
              min="1"
              placeholder="Введите число"
              class="duration-input"
            />
            <select v-model="customDurationUnit" class="duration-unit">
              <option value="minutes">Минут</option>
              <option value="hours">Часов</option>
              <option value="days">Дней</option>
            </select>
          </div>
        </div>

        <!-- Причина -->
        <div class="form-group">
          <label>Причина (необязательно)</label>
          <textarea 
            v-model="reason" 
            rows="3"
            placeholder="Укажите причину модерации..."
            class="reason-textarea"
          ></textarea>
        </div>

        <!-- Итоговое время -->
        <div v-if="finalDurationMinutes && finalDurationMinutes > 0" class="moderation-summary">
          <i class="fas fa-clock"></i>
          <span>{{ moderationType === 'mute' ? 'Мьют' : 'Бан' }} до {{ formatExpiryDate(finalDurationMinutes) }}</span>
        </div>
        <div v-else class="moderation-summary permanent">
          <i class="fas fa-infinity"></i>
          <span>{{ moderationType === 'mute' ? 'Мьют' : 'Бан' }} навсегда</span>
        </div>
    </div>

    <template #footer>
      <button @click="$emit('close')" class="btn-secondary">
        Отмена
      </button>
      <button 
        @click="applyModeration" 
        :disabled="applying"
        class="btn-danger"
      >
        <i v-if="applying" class="fas fa-spinner fa-spin"></i>
        <span v-else>Применить</span>
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import Modal from './Modal.vue'
import { apiModerationSetRoute } from '../api/moderation'

const props = defineProps({
  isOpen: Boolean,
  feedId: String,
  userId: String,
  userName: String,
})

const emit = defineEmits(['close', 'applied'])

const moderationType = ref('mute')
const selectedDuration = ref('60')
const customDuration = ref(1)
const customDurationUnit = ref('hours')
const reason = ref('')
const applying = ref(false)

const durationPresets = [
  { label: '30 минут', value: '30' },
  { label: '1 час', value: '60' },
  { label: '6 часов', value: '360' },
  { label: '1 день', value: '1440' },
  { label: '7 дней', value: '10080' },
  { label: 'Навсегда', value: 'permanent' },
  { label: 'Другое', value: 'custom' },
]

const finalDurationMinutes = computed(() => {
  if (selectedDuration.value === 'permanent') return null
  if (selectedDuration.value === 'custom') {
    const multiplier = {
      minutes: 1,
      hours: 60,
      days: 1440,
    }
    return customDuration.value * (multiplier[customDurationUnit.value] || 1)
  }
  return parseInt(selectedDuration.value)
})

function formatExpiryDate(minutes) {
  if (!minutes) return ''
  const expiryDate = new Date(Date.now() + minutes * 60 * 1000)
  return expiryDate.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function applyModeration() {
  applying.value = true
  try {
    await apiModerationSetRoute.run(ctx, {
      feedId: props.feedId,
      userId: props.userId,
      type: moderationType.value,
      reason: reason.value,
      duration: finalDurationMinutes.value,
    })
    
    emit('applied')
    emit('close')
  } catch (err) {
    console.error('Failed to apply moderation:', err)
    alert(err.message || 'Не удалось применить модерацию')
  } finally {
    applying.value = false
  }
}
</script>

<style scoped>
.moderation-modal-content {
  /* Контент без padding - уже есть в Modal.vue */
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
}

.moderation-types {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.type-btn:hover {
  background: var(--bg-hover);
  border-color: var(--primary-color);
}

.type-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.type-btn i {
  font-size: 24px;
}

.type-btn span {
  font-weight: 600;
}

.type-btn small {
  font-size: 11px;
  opacity: 0.8;
}

.duration-presets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
}

.preset-btn {
  padding: 10px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: var(--bg-hover);
  border-color: var(--primary-color);
}

.preset-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.custom-duration {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.duration-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
}

.duration-unit {
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}

.reason-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

.moderation-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--warning-bg, #fff3cd);
  border-left: 4px solid var(--warning-color, #ffc107);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary);
}

.moderation-summary.permanent {
  background: var(--danger-bg, #f8d7da);
  border-left-color: var(--danger-color, #dc3545);
}

.moderation-summary i {
  color: var(--warning-color, #ffc107);
  font-size: 18px;
}

.moderation-summary.permanent i {
  color: var(--danger-color, #dc3545);
}

.btn-secondary,
.btn-danger {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.btn-danger {
  background: var(--danger-color, #dc3545);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: var(--danger-hover, #c82333);
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .moderation-types {
    grid-template-columns: 1fr;
  }
  
  .duration-presets {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>