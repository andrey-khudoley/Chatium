<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click="closePopup"
    >
      <div class="absolute inset-0 bg-black/80 backdrop-blur-premium"></div>

      <div
        class="relative bg-dark-light border-2 border-gold rounded-3xl shadow-2xl w-[358.4px] sm:w-[448px] modal-container"
        @click.stop
      >
        <button
          @click="closePopup"
          class="absolute top-2 right-2 text-gold hover:text-gold-light transition-colors text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-gold/10 z-10"
          aria-label="Закрыть"
        >
          <i class="fas fa-times"></i>
        </button>

        <!-- GetCourse Widget Iframe -->
        <iframe
          :src="iframeUrl"
          allowfullscreen="allowfullscreen"
          class="modal-iframe"
          style="width: 100%; border: none; overflow: hidden; border-radius: 1.5rem"
        ></iframe>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { watch, computed } from 'vue'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close'])

// Получаем UTM метки из URL страницы
const getUtmParams = () => {
  const params = new URLSearchParams(window.location.search)
  const utmParams = {}

  // Собираем все UTM параметры
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
  utmKeys.forEach((key) => {
    const value = params.get(key)
    if (value) {
      utmParams[key] = value
    }
  })

  return utmParams
}

// Формируем URL iframe с UTM метками
const iframeUrl = computed(() => {
  const baseUrl = 'https://emi-courses.ru/pl/lite/widget/widget?id=1507219'
  const utmParams = getUtmParams()

  // Добавляем UTM параметры к URL
  const urlParams = new URLSearchParams(utmParams)
  const utmString = urlParams.toString()

  return utmString ? `${baseUrl}&${utmString}` : baseUrl
})

const closePopup = () => {
  emit('close')
}

// Блокировка скролла body при открытии модалки
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'

      // Трекинг открытия формы
      if (window.clrtTrack) {
        window.clrtTrack({
          url: 'event://custom/utm-sbor',
          action: 'registration_form_opened'
        })
      }
    } else {
      document.body.style.overflow = ''
    }
  }
)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Скрытие scrollbar в модалке */
.modal-container {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.modal-container::-webkit-scrollbar {
  display: none; /* Chrome/Safari/Opera */
}

/* Адаптивная высота iframe */
.modal-iframe {
  height: 548.8px;
}

@media (min-width: 640px) {
  .modal-iframe {
    height: 488.8px;
  }
}
</style>
