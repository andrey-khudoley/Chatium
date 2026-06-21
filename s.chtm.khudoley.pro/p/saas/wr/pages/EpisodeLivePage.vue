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

    <!-- ===================== STATE: SCHEDULED (waiting) ===================== -->
    <WaitingState
      v-else-if="currentEpisode && currentEpisode.status === 'scheduled'"
      :episode="currentEpisode"
    />

    <!-- ===================== STATE: WAITING ROOM (chat + countdown) ===================== -->
    <WaitingRoomState
      ref="stateRef"
      v-else-if="currentEpisode && currentEpisode.status === 'waiting_room'"
      :episode="currentEpisode"
      :shown-forms="hideCta ? [] : shownFormsList"
      :hide-cta="hideCta"
      :name-confirmed="nameConfirmed"
      :paid-form-ids="paidFormIds"
      @open-form="handleOpenForm"
    />

    <!-- ===================== STATE: LIVE ===================== -->
    <LiveState
      ref="stateRef"
      v-else-if="currentEpisode && currentEpisode.status === 'live'"
      :episode="currentEpisode"
      :shown-forms="hideCta ? [] : shownFormsList"
      :hide-cta="hideCta"
      :name-confirmed="nameConfirmed"
      :paid-form-ids="paidFormIds"
      @open-form="handleOpenForm"
    />

    <!-- ===================== STATE: FINISHED ===================== -->
    <FinishedState
      v-else-if="currentEpisode && currentEpisode.status === 'finished'"
      :episode="currentEpisode"
    />

    <!-- Floating Reactions -->
    <FloatingReactions
      v-if="
        currentEpisode &&
        (currentEpisode.status === 'live' || currentEpisode.status === 'waiting_room')
      "
      ref="reactionsRef"
      :episode-id="currentEpisode.id"
    />

    <!-- Name Prompt Modal -->
    <NamePromptModal :show="showNamePrompt" @updated="handleNameUpdated" />

    <EpisodeFormPopup
      :show="showFormOverlay"
      :form-data="activeFormData"
      :episode-id="currentEpisode?.id"
      @close="showFormOverlay = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import {
  apiEpisodeByIdRoute,
  apiEpisodeGetSocketIdRoute,
  apiEpisodeVisitRoute
} from '../api/episodes'
import { apiChatUserSocketRoute } from '../api/chat-admin-routes'
import { apiFormGetShownRoute, apiFormByIdRoute } from '../api/forms'
import { apiPaidFormIdsRoute } from '../api/paid-forms'
import WaitingState from '../components/episode/WaitingState.vue'
import WaitingRoomState from '../components/episode/WaitingRoomState.vue'
import LiveState from '../components/episode/LiveState.vue'
import FinishedState from '../components/episode/FinishedState.vue'
import NamePromptModal from '../components/NamePromptModal.vue'
import FloatingReactions from '../components/episode/FloatingReactions.vue'
import EpisodeFormPopup from '../components/episode/EpisodeFormPopup.vue'
import { initThemeWatcher } from '../shared/theme'
import { trackFormShown, trackFormOpened } from '../shared/use-form-analytics'

const props = defineProps({
  episode: { type: Object, required: true }
})

initThemeWatcher()

const loading = ref(false)
const error = ref('')
const currentEpisode = ref(props.episode)
const showNamePrompt = ref(true)
const nameConfirmed = ref(false)
let subscription = null
const reactionsRef = ref(null)
const showFormOverlay = ref(false)
const activeFormData = ref(null)
const shownFormsList = ref([])
const paidFormIds = ref([])

const queryParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
const hideCta = ref(queryParams.get('p') === '1')
const paidChecked = ref(false)
const stateRef = ref(null)
let userSubscription = null

async function loadShownForms() {
  try {
    const forms = await apiFormGetShownRoute({ episodeId: currentEpisode.value.id }).run(ctx)
    // Фильтруем оплаченные формы с типом payment
    shownFormsList.value = forms.filter(
      (f) => !(f.submitAction === 'payment' && paidFormIds.value.includes(f.id))
    )

    // Записываем события показа для форм, которые пользователь видит впервые
    shownFormsList.value.forEach((form) => {
      const storageKey = `form_shown_${currentEpisode.value.id}_${form.id}`
      if (!localStorage.getItem(storageKey)) {
        trackFormShown(currentEpisode.value.id, form.id, form.title, form.submitAction)
        localStorage.setItem(storageKey, 'true')
      }
    })
  } catch (e) {
    console.error('Failed to load shown forms:', e)
  }
}

async function sendEpisodeVisitEvent(episodeId) {
  const storageKey = `webinar_visit_${episodeId}`

  if (localStorage.getItem(storageKey)) {
    return
  }

  try {
    const result = await apiEpisodeVisitRoute.run(ctx, { episodeId })

    if (result.success) {
      localStorage.setItem(storageKey, 'true')
    }
  } catch (error) {
    console.error('Failed to send episode visit event:', error)
  }
}

onMounted(async () => {
  try {
    const id = currentEpisode.value.id

    // Загружаем список оплаченных форм
    if (ctx.user) {
      try {
        const paidResult = await apiPaidFormIdsRoute.run(ctx)
        paidFormIds.value = paidResult.paidFormIds || []
      } catch (e) {}
    }

    paidChecked.value = true

    await sendEpisodeVisitEvent(id)

    await loadShownForms()

    if (
      currentEpisode.value?.status === 'finished' &&
      currentEpisode.value?.finishAction === 'redirect' &&
      currentEpisode.value?.resultUrl
    ) {
      window.location.href = currentEpisode.value.resultUrl
      return
    }

    const socketData = await apiEpisodeGetSocketIdRoute({ id }).run(ctx)
    if (socketData.encodedSocketId) {
      const socketClient = await getOrCreateBrowserSocketClient()
      subscription = socketClient.subscribeToData(socketData.encodedSocketId)
      subscription.listen((msg) => {
        if (msg.type === 'episode_updated' && msg.episode) {
          currentEpisode.value = { ...currentEpisode.value, ...msg.episode }
        }
        if (msg.type === 'chat_access_changed') {
          currentEpisode.value = { ...currentEpisode.value, chatAccessMode: msg.chatAccessMode }
        }
        if (msg.type === 'show_custom_form' && msg.formId) {
          if (!hideCta.value) {
            apiFormByIdRoute({ id: msg.formId })
              .run(ctx)
              .then(async (formData) => {
                if (
                  formData.submitAction === 'payment' &&
                  paidFormIds.value.includes(formData.id)
                ) {
                  return
                }
                const storageKey = `form_shown_${id}_${formData.id}`
                if (!localStorage.getItem(storageKey)) {
                  trackFormShown(id, formData.id, formData.title, formData.submitAction)
                  localStorage.setItem(storageKey, 'true')
                }
                await stateRef.value?.exitFullscreen?.()
                activeFormData.value = formData
                showFormOverlay.value = true
              })
              .catch((e) => console.error('Failed to load form:', e))
          }
          loadShownForms()
        }
        if (msg.type === 'reaction' && msg.emoji) {
          if (!!msg.fromUser) {
            if (msg.fromUser !== ctx.user?.id) {
              reactionsRef.value?.handleSocketReaction(msg.emoji)
            }
          } else {
            reactionsRef.value?.handleSocketReaction(msg.emoji)
          }
        }
      })
    }
  } catch (e) {
    error.value = e.message || 'Не удалось загрузить эфир'
  }
})

async function handleNameUpdated() {
  showNamePrompt.value = false
  nameConfirmed.value = true
  await stateRef.value?.reloadChat()
}

async function handleOpenForm(formId) {
  if (!formId) return

  let form = shownFormsList.value.find((f) => f.id === formId)

  if (!form) {
    try {
      form = await apiFormByIdRoute({ id: formId }).run(ctx)
    } catch (e) {
      console.error('Failed to load form by id:', e)
      return
    }
  }

  if (currentEpisode.value?.id) {
    trackFormOpened(currentEpisode.value.id, form.id, form.title, form.submitAction)
  }

  await stateRef.value?.exitFullscreen?.()
  activeFormData.value = form
  showFormOverlay.value = true
}

watch(
  () => currentEpisode.value,
  (newEpisode, oldEpisode) => {
    if (
      newEpisode?.status === 'finished' &&
      newEpisode?.finishAction === 'redirect' &&
      newEpisode?.resultUrl
    ) {
      window.location.href = newEpisode.resultUrl
    }
  },
  { deep: true }
)

onUnmounted(() => {
  subscription?.close?.()
  userSubscription?.close?.()
})
</script>
