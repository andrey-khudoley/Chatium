<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="handleOverlayClick">
        <div class="modal-container" @click.stop>
          <!-- Header -->
          <div class="modal-header">
            <h2>Выбор видео из Kinescope</h2>
            <button @click="close" class="close-btn">
              <Icon name="cross" :size="20" />
            </button>
          </div>

          <!-- Search & Filters -->
          <div class="filters-section">
            <div class="search-wrapper">
              <Icon name="search" :size="18" class="search-icon" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Поиск по названию..."
                class="search-input"
                @input="handleSearchInput"
              />
            </div>

            <CustomSelect
              v-model="selectedProjectId"
              :options="projectOptions"
              placeholder="Все проекты"
              size="md"
              @update:modelValue="handleProjectChange"
            />
          </div>

          <!-- Videos Grid -->
          <div v-if="loading" class="loading-state">
            <Spinner />
            <p>Загрузка видео...</p>
          </div>

          <div v-else-if="error" class="error-state">
            <p>{{ error }}</p>
            <button @click="loadVideos" class="btn-retry">Повторить</button>
          </div>

          <div v-else-if="videos.length === 0" class="empty-state">
            <p>Видео не найдены</p>
          </div>

          <div v-else class="videos-container">
            <!-- Videos List -->
            <div class="videos-list">
              <div
                v-for="video in videos"
                :key="video.id"
                class="video-item"
                :class="{ selected: selectedVideoId === video.id }"
                @click="selectVideo(video)"
              >
                <div class="video-item-main">
                  <div class="video-item-icon">
                    <Icon name="play" :size="20" />
                  </div>
                  <div class="video-item-content">
                    <h4 class="video-item-title">{{ video.title }}</h4>
                    <div class="video-item-meta">
                      <span v-if="video.duration" class="meta-duration">
                        {{ formatDuration(video.duration) }}
                      </span>
                      <span v-if="video.project" class="meta-project">
                        {{ video.project.name }}
                      </span>
                      <span v-if="video.created_at" class="meta-date">
                        {{ formatDate(video.created_at) }}
                      </span>
                    </div>
                  </div>
                </div>
                <div v-if="selectedVideoId === video.id" class="video-item-check">
                  <Icon name="check" :size="20" />
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="pagination && pagination.total_pages > 1" class="pagination">
            <button
              @click="goToPage(pagination.current_page - 1)"
              :disabled="pagination.current_page === 1"
              class="btn-page"
            >
              <Icon name="angel-left" :size="18" />
            </button>

            <span class="page-info">
              Страница {{ pagination.current_page }} из {{ pagination.total_pages }}
            </span>

            <button
              @click="goToPage(pagination.current_page + 1)"
              :disabled="pagination.current_page === pagination.total_pages"
              class="btn-page"
            >
              <Icon name="angel-right" :size="18" />
            </button>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button @click="close" class="btn-cancel">Отмена</button>
            <button @click="confirm" :disabled="!selectedVideoId" class="btn-confirm">
              Выбрать
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Icon from '../Icon/Icon.vue'
import Spinner from '../Spinner.vue'
import CustomSelect from '../CustomSelect.vue'
import {
  apiKinescopeProjectsRoute,
  apiKinescopeVideosRoute
} from '../../api/episodes-kinescope-routes'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'select'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const videos = ref([])
const projects = ref([])
const loading = ref(false)
const error = ref(null)
const searchQuery = ref('')
const selectedProjectId = ref('')
const selectedVideoId = ref(null)
const selectedVideo = ref(null)
const currentPage = ref(1)
const pagination = ref(null)

const projectOptions = computed(() => [
  { value: '', label: 'Все проекты' },
  ...projects.value.map((p) => ({ value: p.id, label: p.name }))
])

let searchTimeout = null

const loadVideos = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await apiKinescopeVideosRoute
      .query({
        page: currentPage.value,
        per_page: 20,
        project_id: selectedProjectId.value || undefined,
        query: searchQuery.value || undefined
      })
      .run(ctx)

    videos.value = response.data
    pagination.value = response.pagination
  } catch (err) {
    error.value = err.message || 'Не удалось загрузить видео'
  } finally {
    loading.value = false
  }
}

const loadProjects = async () => {
  try {
    projects.value = await apiKinescopeProjectsRoute.run(ctx)
  } catch (err) {
    console.error('Failed to load projects:', err)
  }
}

const handleSearchInput = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadVideos()
  }, 500)
}

const handleProjectChange = () => {
  currentPage.value = 1
  loadVideos()
}

const goToPage = (page) => {
  currentPage.value = page
  loadVideos()
}

const selectVideo = (video) => {
  selectedVideoId.value = video.id
  selectedVideo.value = video
}

const confirm = () => {
  if (selectedVideoId.value) {
    emit('select', {
      id: selectedVideoId.value,
      video: selectedVideo.value
    })
    close()
  }
}

const close = () => {
  isOpen.value = false
  // Reset state after animation
  setTimeout(() => {
    selectedVideoId.value = null
    selectedVideo.value = null
    searchQuery.value = ''
    selectedProjectId.value = ''
    currentPage.value = 1
  }, 300)
}

const handleOverlayClick = () => {
  close()
}

const formatDuration = (seconds) => {
  if (!seconds) return '—'
  const totalSeconds = Math.floor(seconds) // Округляем до целого
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Load projects and videos when modal opens
watch(isOpen, (newValue) => {
  if (newValue) {
    loadProjects()
    loadVideos()
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  overflow-y: auto;
}

.modal-container {
  background: var(--wr-bg-card);
  border-radius: 16px;
  width: 100%;
  max-width: 1000px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid var(--wr-border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--wr-text-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--wr-text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--wr-bg-hover);
  color: var(--wr-text-primary);
}

.filters-section {
  display: flex;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--wr-border-color);
  background: var(--wr-bg-primary);
}

.filters-section :deep(.custom-select) {
  width: 240px;
  flex-shrink: 0;
}

.search-wrapper {
  flex: 1;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--wr-text-secondary);
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 40px;
  border: 1px solid var(--wr-border-color);
  border-radius: 10px;
  background: var(--wr-bg-secondary);
  color: var(--wr-text-primary);
  font-size: 15px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--wr-accent);
  box-shadow: 0 0 0 3px rgba(var(--wr-accent-rgb, 59, 130, 246), 0.1);
}

.videos-container {
  flex: 1;
  overflow-y: auto;
  min-height: 400px;
}

.videos-list {
  display: flex;
  flex-direction: column;
}

.video-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--wr-border-color);
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}

.video-item:hover {
  background: var(--wr-bg-hover);
}

.video-item.selected {
  background: rgba(var(--wr-accent-rgb, 59, 130, 246), 0.08);
  border-left: 3px solid var(--wr-accent);
}

.video-item-main {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.video-item-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wr-bg-secondary);
  border-radius: 10px;
  color: var(--wr-text-secondary);
  transition: all 0.2s;
}

.video-item-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.video-item:hover .video-item-icon {
  background: var(--wr-accent);
  color: white;
}

.video-item.selected .video-item-icon {
  background: var(--wr-accent);
  color: white;
}

.video-item-content {
  flex: 1;
  min-width: 0;
}

.video-item-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--wr-text-primary);
  margin: 0 0 6px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-item-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.video-item-meta > span {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--wr-text-secondary);
}

.meta-duration {
  font-weight: 500;
}

.meta-project {
  padding: 2px 8px;
  background: var(--wr-bg-secondary);
  border-radius: 6px;
  font-size: 12px;
}

.video-item-check {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wr-accent);
  color: white;
  border-radius: 50%;
  margin-left: 16px;
}

.video-item-check :deep(svg) {
  width: 16px;
  height: 16px;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  color: var(--wr-text-secondary);
}

.loading-state p,
.error-state p,
.empty-state p {
  margin: 12px 0 0 0;
  font-size: 16px;
}

.btn-retry {
  margin-top: 16px;
  padding: 10px 24px;
  background: var(--wr-accent);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-retry:hover {
  background: var(--wr-accent-hover);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px 24px;
  border-top: 1px solid var(--wr-border-color);
}

.btn-page {
  padding: 8px 12px;
  background: var(--wr-bg-secondary);
  border: 1px solid var(--wr-border-color);
  border-radius: 8px;
  color: var(--wr-text-primary);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-page:hover:not(:disabled) {
  background: var(--wr-bg-hover);
  border-color: var(--wr-accent);
}

.btn-page:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: var(--wr-text-secondary);
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px 24px;
  border-top: 1px solid var(--wr-border-color);
}

.btn-cancel,
.btn-confirm {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: var(--wr-bg-secondary);
  border: 1px solid var(--wr-border-color);
  color: var(--wr-text-primary);
}

.btn-cancel:hover {
  background: var(--wr-bg-hover);
}

.btn-confirm {
  background: var(--wr-accent);
  border: none;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: var(--wr-accent-hover);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Animation */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9) translateY(20px);
}

/* Responsive */
@media (max-width: 768px) {
  .filters-section {
    flex-direction: column;
  }

  .modal-container {
    max-height: 100vh;
    border-radius: 0;
  }

  .video-item {
    padding: 12px 16px;
  }

  .video-item-main {
    gap: 12px;
  }

  .video-item-icon {
    width: 36px;
    height: 36px;
  }

  .video-item-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
