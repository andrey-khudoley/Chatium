<template>
  <div class="min-h-screen" style="background: var(--wr-bg)">
    <!-- Loading -->
    <div v-if="loading" class="min-h-screen flex items-center justify-center">
      <div
        class="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"
      ></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="min-h-screen flex items-center justify-center p-6">
      <div class="text-center max-w-md">
        <div class="w-20 h-20 rounded-2xl glass mx-auto mb-6 flex items-center justify-center">
          <i class="fas fa-exclamation-triangle wr-status-red text-3xl"></i>
        </div>
        <h1 class="text-xl font-bold mb-2 wr-text-primary">Ошибка</h1>
        <p class="wr-text-tertiary">{{ error }}</p>
      </div>
    </div>

    <!-- Scheduled mode -->
    <template v-else-if="awData">
      <!-- Waiting for schedule (no active or upcoming) -->
      <AwWaitingState
        v-if="
          !awData.schedule || (awData.schedule.status === 'scheduled' && !isWaitingRoom && !isLive)
        "
        :autowebinar="awData.autowebinar"
        :schedule="awData.schedule"
      />

      <!-- Waiting Room -->
      <AwWaitingRoomState
        v-else-if="isWaitingRoom"
        ref="stateRef"
        :autowebinar="awData.autowebinar"
        :schedule="awData.schedule"
        :scenario-events="wrScenarioEvents"
        :shown-forms="hideCta ? [] : shownFormsList"
        :hide-cta="hideCta"
        :name-confirmed="nameConfirmed"
        @open-form="handleOpenForm"
      />

      <!-- Live -->
      <AwLiveState
        v-else-if="isLive"
        ref="stateRef"
        :autowebinar="awData.autowebinar"
        :schedule="awData.schedule"
        :shown-forms="hideCta ? [] : shownFormsList"
        :hide-cta="hideCta"
        :name-confirmed="nameConfirmed"
        @open-form="handleOpenForm"
        @update-shown-forms="handleAddShownForm"
        @hide-form="handleHideForm"
      />

      <!-- Finished -->
      <AwFinishedState
        v-else-if="awData.schedule?.status === 'finished'"
        :autowebinar="awData.autowebinar"
      />
    </template>

    <!-- Debug Panel -->
    <DebugPanel
      :autowebinar-id="props.autowebinarId"
      :duration="awData?.autowebinar?.duration || 0"
      :schedule-id="awData?.schedule?.id || ''"
      :current-offset="debugCurrentOffset"
      :status="debugStatus"
      :schedule="awData?.schedule"
      @seek="handleDebugSeek"
    />

    <!-- Name Prompt Modal -->
    <NamePromptModal :show="showNamePrompt" @updated="handleNameUpdated" />

    <!-- Form Popup -->
    <EpisodeFormPopup
      :show="showFormOverlay"
      :form-data="activeFormData"
      :autowebinar-id="props.autowebinarId"
      @close="showFormOverlay = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import {
  apiAutowebinarViewerDataRoute,
  apiAutowebinarSocketRoute,
  apiAutowebinarUserSocketRoute,
  apiAutowebinarScenarioRoute
} from '../api/autowebinar-engine'
import { apiFormByIdRoute } from '../api/forms'
import NamePromptModal from '../components/NamePromptModal.vue'
import EpisodeFormPopup from '../components/episode/EpisodeFormPopup.vue'
import DebugPanel from '../components/autowebinar/DebugPanel.vue'
import AwWaitingState from '../components/autowebinar/AwWaitingState.vue'
import AwWaitingRoomState from '../components/autowebinar/AwWaitingRoomState.vue'
import AwLiveState from '../components/autowebinar/AwLiveState.vue'
import AwFinishedState from '../components/autowebinar/AwFinishedState.vue'
import { initThemeWatcher } from '../shared/theme'
import { trackFormShown, trackFormOpened } from '../shared/use-form-analytics'

const props = defineProps({
  autowebinarId: { type: String, required: true }
})

initThemeWatcher()

const loading = ref(true)
const error = ref('')
const awData = ref(null)
const showNamePrompt = ref(true)
const nameConfirmed = ref(false)
const showFormOverlay = ref(false)
const activeFormData = ref(null)
const shownFormsList = ref([])
const hideCta = ref(false)
const stateRef = ref(null)
const scenarioData = ref(null)
const now = ref(Date.now())
let awSubscription = null
let debugTimer = null

const isWaitingRoom = computed(() => {
  return awData.value?.schedule?.status === 'waiting_room'
})

const isLive = computed(() => {
  return awData.value?.schedule?.status === 'live'
})

// Debug panel data - compute offset based on schedule
const debugCurrentOffset = computed(() => {
  const schedule = awData.value?.schedule
  if (!schedule?.startedAt) return 0
  const startedAt = new Date(schedule.startedAt).getTime()
  return Math.max(0, Math.round((now.value - startedAt) / 1000))
})

const debugStatus = computed(() => {
  return awData.value?.schedule?.status || 'scheduled'
})

// WR scenario events (filtered for waiting room phase)
const wrScenarioEvents = computed(() => {
  if (!scenarioData.value) return []
  // During WR, use wrOffsetSeconds for timing
  return scenarioData.value.events
    .filter(
      (evt) =>
        evt.eventType === 'chat_message' &&
        evt.rawOffsetSeconds < scenarioData.value.streamStartOffset
    )
    .map((evt) => ({
      ...evt,
      offsetSeconds: evt.wrOffsetSeconds
    }))
})

async function loadViewerData() {
  try {
    // Check localStorage for preferred scheduleId (24h session)
    const storageKey = `aw_schedule_${props.autowebinarId}`
    let preferredScheduleId = null

    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          // Check if stored session is still valid (< 24h)
          if (
            parsed.scheduleId &&
            parsed.timestamp &&
            Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000
          ) {
            preferredScheduleId = parsed.scheduleId
          } else {
            // Clean up expired session
            localStorage.removeItem(storageKey)
          }
        } catch (e) {
          localStorage.removeItem(storageKey)
        }
      }
    }

    // Pass preferredScheduleId to API
    const query = preferredScheduleId ? { scheduleId: preferredScheduleId } : {}
    const data = await apiAutowebinarViewerDataRoute({ id: props.autowebinarId })
      .query(query)
      .run(ctx)
    awData.value = data

    // Save scheduleId to localStorage
    if (data.schedule?.id && typeof localStorage !== 'undefined') {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          scheduleId: data.schedule.id,
          timestamp: Date.now()
        })
      )
    }
  } catch (e) {
    error.value = e.message || 'Не удалось загрузить автовебинар'
  }
}

onMounted(async () => {
  try {
    await loadViewerData()

    // Start timer for debug panel offset calculation
    debugTimer = setInterval(() => {
      now.value = Date.now()
    }, 1000)

    // Load scenario events (both WR and live states need it)
    try {
      const data = await apiAutowebinarScenarioRoute({ autowebinarId: props.autowebinarId }).run(
        ctx
      )
      scenarioData.value = data
    } catch (e) {
      console.error('Failed to load scenario:', e)
    }

    // Subscribe to autowebinar socket for schedule updates
    const socketData = await apiAutowebinarSocketRoute({ autowebinarId: props.autowebinarId }).run(
      ctx
    )
    if (socketData.encodedSocketId) {
      const socketClient = await getOrCreateBrowserSocketClient()
      awSubscription = socketClient.subscribeToData(socketData.encodedSocketId)
      awSubscription.listen((msg) => {
        if (msg.type === 'schedule_updated') {
          if (awData.value?.schedule && msg.scheduleId === awData.value.schedule.id) {
            awData.value = {
              ...awData.value,
              schedule: {
                ...awData.value.schedule,
                status: msg.status,
                startedAt: msg.startedAt || awData.value.schedule.startedAt
              }
            }
          } else {
            loadViewerData()
          }
        }
        // Socket events for show_form/hide_form/reaction are no longer used for scheduled mode
        // (everything is client-side now), but keep handling for backwards compatibility
        if (msg.type === 'reaction' && msg.emoji) {
          stateRef.value?.handleReaction?.(msg.emoji)
        }
      })
    }
  } catch (e) {
    error.value = e.message || 'Не удалось загрузить автовебинар'
  }

  loading.value = false
})

function handleNameUpdated() {
  showNamePrompt.value = false
  nameConfirmed.value = true
  stateRef.value?.reloadChat?.()
}

function handleAddShownForm(formData) {
  if (!shownFormsList.value.find((f) => f.id === formData.id)) {
    shownFormsList.value = [...shownFormsList.value, formData]
  }
}

function handleHideForm(formId) {
  shownFormsList.value = shownFormsList.value.filter((f) => f.id !== formId)
  if (activeFormData.value?.id === formId) {
    showFormOverlay.value = false
  }
}

async function handleOpenForm(formId) {
  if (!formId) return
  let form = shownFormsList.value.find((f) => f.id === formId)
  if (!form) {
    try {
      form = await apiFormByIdRoute({ id: formId }).run(ctx)
      handleAddShownForm(form)
    } catch (e) {
      console.error('Failed to load form:', e)
      return
    }
  }
  trackFormOpened(props.autowebinarId, form.id, form.title, form.submitAction)
  await stateRef.value?.exitFullscreen?.()
  activeFormData.value = form
  showFormOverlay.value = true
}

function handleDebugSeek(newOffset) {
  // Update local startedAt based on newOffset
  const currentNow = Date.now()
  if (awData.value?.schedule) {
    // Recalculate schedule.startedAt
    const newStartedAt = new Date(currentNow - newOffset * 1000)
    awData.value = {
      ...awData.value,
      schedule: {
        ...awData.value.schedule,
        startedAt: newStartedAt
      }
    }
  }

  // Force update now.value to trigger computed recalculation
  now.value = Date.now()

  // Notify child component
  stateRef.value?.debugSeek?.(newOffset)
}

onUnmounted(() => {
  awSubscription?.close?.()
  if (debugTimer) clearInterval(debugTimer)
})
</script>
