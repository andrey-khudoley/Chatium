<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import Header from '../shared/Header.vue'
import AlertModal from '../shared/AlertModal.vue'
import ConfirmModal from '../shared/ConfirmModal.vue'
import {
  apiGetProjectsListRoute,
  apiJoinProjectRequestRoute,
  apiCreateProjectRoute,
  apiDeleteProjectRoute
} from '../api/projects'
import { userIdsMatch } from '../shared/user-utils'
import { projectDetailPageRoute } from '../index'

declare const ctx: any

declare global {
  interface Window {
    hideAppLoader?: () => void
    triggerGlobalGlitch?: () => void
  }
}

const props = defineProps<{
  projectTitle: string
  indexUrl: string
  profileUrl: string
  loginUrl: string
  isAuthenticated: boolean
  projectsPageUrl?: string
  target?: string // Параметр target из query параметров (links, channels, bots)
}>()

// Функция для генерации URL детальной страницы проекта
const getProjectDetailUrl = (projectId: string): string => {
  // Используем правильный синтаксис для роутов с параметрами: route({ param }).url()
  // Согласно документации 002-routing.md и примеру из api/bots.ts
  let url = projectDetailPageRoute({ id: projectId }).url()

  // Если есть параметр target, добавляем его к URL
  if (props.target) {
    const separator = url.includes('?') ? '&' : '?'
    url = `${url}${separator}target=${props.target}`
  }

  return url
}

const projects = ref<
  Array<{
    id: string
    name: string
    description?: string
    membersCount: number
    members?: Array<{ userId: string; role: string }>
  }>
>([])
const loading = ref(true)
const error = ref<string | null>(null)
const activeTab = ref<'my' | 'member'>('my')

// Вычисляемые свойства для разделения проектов
const myProjects = computed(() => {
  if (!ctx.user) return []
  return projects.value.filter((project) => {
    if (project.members && Array.isArray(project.members)) {
      return project.members.some(
        (member: any) => userIdsMatch(member.userId, ctx.user?.id) && member.role === 'owner'
      )
    }
    return false
  })
})

const memberProjects = computed(() => {
  if (!ctx.user) return []
  return projects.value.filter((project) => {
    if (project.members && Array.isArray(project.members)) {
      return project.members.some(
        (member: any) => userIdsMatch(member.userId, ctx.user?.id) && member.role === 'member'
      )
    }
    return false
  })
})

const displayedProjects = computed(() => {
  return activeTab.value === 'my' ? myProjects.value : memberProjects.value
})
const showJoinModal = ref(false)
const joinProjectId = ref('')
const joiningProject = ref(false)
const joinError = ref<string | null>(null)
const joinSuccessMessage = ref<string | null>(null)
const showCreateModal = ref(false)
const newProjectName = ref('')
const newProjectDescription = ref('')
const creatingProject = ref(false)
const createError = ref<string | null>(null)
const deletingProjectId = ref<string | null>(null)

// Модальные окна для алёртов и подтверждений
const showAlertModal = ref(false)
const alertMessage = ref('')
const alertTitle = ref('')
const alertType = ref<'info' | 'error' | 'success' | 'warning'>('info')

const showConfirmModal = ref(false)
const confirmMessage = ref('')
const confirmTitle = ref('')
const confirmType = ref<'danger' | 'warning' | 'info'>('info')
const confirmCallback = ref<(() => void) | null>(null)

// Анимация печатания текста
const displayedTitle = ref('')
const displayedDescription = ref('')
const showCursor = ref(false)
const bootLoaderDone = ref(false)
const showCards = ref(false)
const cursorPosition = ref<'title' | 'description' | 'final'>('title')
const showTitleUnderline = ref(false)

let escHandler: ((e: KeyboardEvent) => void) | null = null

// Загрузка списка проектов
const loadProjects = async () => {
  loading.value = true
  error.value = null

  try {
    const result = await apiGetProjectsListRoute.run(ctx)

    if (result.success && result.projects) {
      projects.value = result.projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        membersCount: p.membersCount || 0,
        members: p.members || []
      }))
    } else {
      error.value = result.error || 'Ошибка при загрузке проектов'
    }
  } catch (e: any) {
    console.error('[ProjectsPage] Ошибка загрузки проектов:', e)
    error.value = e.message || 'Ошибка при загрузке проектов'
  } finally {
    loading.value = false
  }
}

// Проверка, является ли пользователь владельцем или админом проекта
const canDeleteProject = (project: { members?: Array<{ userId: string; role: string }> }) => {
  if (!ctx.user) return false

  // Проверяем, является ли пользователь админом
  if (ctx.user.is && ctx.user.is('Admin')) {
    return true
  }

  // Проверяем, является ли пользователь владельцем проекта
  if (project.members && Array.isArray(project.members)) {
    return project.members.some(
      (member: any) => userIdsMatch(member.userId, ctx.user?.id) && member.role === 'owner'
    )
  }

  return false
}

// Открытие модального окна присоединения
const openJoinModal = () => {
  joinProjectId.value = ''
  joinError.value = null
  joinSuccessMessage.value = null
  showJoinModal.value = true
}

// Закрытие модального окна
const closeJoinModal = () => {
  if (joiningProject.value) return
  showJoinModal.value = false
  joinProjectId.value = ''
  joinError.value = null
  // Очищаем сообщение об успехе через 3 секунды
  if (joinSuccessMessage.value) {
    setTimeout(() => {
      joinSuccessMessage.value = null
    }, 3000)
  }
}

// Подача заявки на присоединение
const submitJoinRequest = async () => {
  if (!joinProjectId.value.trim()) {
    joinError.value = 'Введите ID проекта'
    return
  }

  joiningProject.value = true
  joinError.value = null
  joinSuccessMessage.value = null

  try {
    const result = await apiJoinProjectRequestRoute.run(ctx, {
      projectId: joinProjectId.value.trim()
    })

    if (result.success) {
      joinSuccessMessage.value = 'Заявка подана'
      joinProjectId.value = ''
      // Закрываем модальное окно через 1.5 секунды
      setTimeout(() => {
        closeJoinModal()
      }, 1500)
    } else {
      joinError.value = result.error || 'Ошибка при подаче заявки'
    }
  } catch (e: any) {
    console.error('[ProjectsPage] Ошибка подачи заявки:', e)
    joinError.value = e.message || 'Ошибка при подаче заявки'
  } finally {
    joiningProject.value = false
  }
}

// Открытие модального окна создания проекта
const openCreateModal = () => {
  newProjectName.value = ''
  newProjectDescription.value = ''
  createError.value = null
  showCreateModal.value = true
}

// Закрытие модального окна создания
const closeCreateModal = () => {
  if (creatingProject.value) return
  showCreateModal.value = false
  newProjectName.value = ''
  newProjectDescription.value = ''
  createError.value = null
}

// Создание проекта
const submitCreateProject = async () => {
  if (!newProjectName.value.trim()) {
    createError.value = 'Введите название проекта'
    return
  }

  creatingProject.value = true
  createError.value = null

  try {
    const result = await apiCreateProjectRoute.run(ctx, {
      name: newProjectName.value.trim(),
      description: newProjectDescription.value.trim() || null
    })

    if (result.success) {
      // Обновляем список проектов
      await loadProjects()
      // Закрываем модальное окно через небольшую задержку, чтобы дождаться завершения finally блока
      setTimeout(() => {
        closeCreateModal()
      }, 100)
    } else {
      createError.value = result.error || 'Ошибка при создании проекта'
    }
  } catch (e: any) {
    console.error('[ProjectsPage] Ошибка создания проекта:', e)
    createError.value = e.message || 'Ошибка при создании проекта'
  } finally {
    creatingProject.value = false
  }
}

// Функции для показа модальных окон
const showAlert = (
  message: string,
  title?: string,
  type: 'info' | 'error' | 'success' | 'warning' = 'info'
) => {
  alertMessage.value = message
  alertTitle.value = title || ''
  alertType.value = type
  showAlertModal.value = true
}

const showConfirm = (
  message: string,
  onConfirm: () => void,
  title?: string,
  type: 'danger' | 'warning' | 'info' = 'info'
) => {
  confirmMessage.value = message
  confirmTitle.value = title || ''
  confirmType.value = type
  confirmCallback.value = onConfirm
  showConfirmModal.value = true
}

const handleConfirm = () => {
  if (confirmCallback.value) {
    confirmCallback.value()
  }
  showConfirmModal.value = false
  confirmCallback.value = null
}

const handleCancel = () => {
  showConfirmModal.value = false
  confirmCallback.value = null
}

// Удаление проекта
const deleteProject = async (projectId: string, event: Event) => {
  event.preventDefault()
  event.stopPropagation()

  if (deletingProjectId.value) return

  showConfirm(
    'Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить.',
    async () => {
      deletingProjectId.value = projectId

      try {
        const result = await apiDeleteProjectRoute.run(ctx, {
          projectId: projectId
        })

        if (result.success) {
          // Обновляем список проектов
          await loadProjects()
        } else {
          showAlert(result.error || 'Ошибка при удалении проекта', 'Ошибка', 'error')
        }
      } catch (e: any) {
        console.error('[ProjectsPage] Ошибка удаления проекта:', e)
        showAlert(e.message || 'Ошибка при удалении проекта', 'Ошибка', 'error')
      } finally {
        deletingProjectId.value = null
      }
    },
    'Подтверждение удаления',
    'danger'
  )
}

onMounted(async () => {
  console.log('[ProjectsPage] Компонент монтируется')

  if (window.hideAppLoader) {
    window.hideAppLoader()
  }

  // Обработчик Esc для закрытия модальных окон
  escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showJoinModal.value) {
        closeJoinModal()
      } else if (showCreateModal.value) {
        closeCreateModal()
      }
    }
  }
  document.addEventListener('keydown', escHandler)

  // Ждём завершения bootloader
  const startAnimations = () => {
    bootLoaderDone.value = true

    // 1. Сначала 1 секунда мигает курсор без текста
    showCursor.value = true
    cursorPosition.value = 'title'

    setTimeout(() => {
      // 2. Начинаем последовательный набор текста
      typeTextSequence()
    }, 1000)
  }

  if ((window as any).bootLoaderComplete) {
    startAnimations()
  } else {
    window.addEventListener('bootloader-complete', startAnimations)
  }

  const typeTextSequence = () => {
    const titleText = 'Проекты'
    cursorPosition.value = 'title'

    // Набираем заголовок
    let titleIndex = 0
    const titleInterval = setInterval(() => {
      if (titleIndex < titleText.length) {
        displayedTitle.value = titleText.substring(0, titleIndex + 1)
        titleIndex++
      } else {
        clearInterval(titleInterval)
        // После завершения набора заголовка показываем разделительную черту
        showTitleUnderline.value = true
        // Затем набираем описание
        typeDescription()
      }
    }, 30) // Скорость набора текста
  }

  const typeDescription = () => {
    const descriptionText = 'Управляйте своими проектами и аналитикой'
    cursorPosition.value = 'description'
    let descIndex = 0
    const descInterval = setInterval(() => {
      if (descIndex < descriptionText.length) {
        displayedDescription.value = descriptionText.substring(0, descIndex + 1)
        descIndex++
      } else {
        clearInterval(descInterval)
        // После завершения набора всех элементов:
        // Перемещаем курсор в конец заголовка и показываем карточки
        cursorPosition.value = 'final'
        showCards.value = true
      }
    }, 30)
  }

  try {
    console.log('[ProjectsPage] Начинаем загрузку проектов')
    await loadProjects()
    console.log('[ProjectsPage] Проекты загружены успешно')
  } catch (error: any) {
    console.error('[ProjectsPage] Ошибка при загрузке проектов:', error)
    error.value = error.message || 'Ошибка при загрузке проектов'
    loading.value = false
  }
})

onBeforeUnmount(() => {
  // Удаляем обработчик событий при размонтировании компонента
  if (escHandler) {
    document.removeEventListener('keydown', escHandler)
    escHandler = null
  }
})
</script>

<template>
  <div class="app-layout bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
    <!-- Header -->
    <Header
      v-if="bootLoaderDone"
      :pageTitle="'A/Ley Services'"
      :indexUrl="props.indexUrl"
      :profileUrl="props.profileUrl"
      :loginUrl="props.loginUrl"
      :isAuthenticated="props.isAuthenticated"
    />

    <!-- Content -->
    <main class="content-wrapper flex-1 relative z-10 min-h-0 overflow-y-auto">
      <div class="content-inner">
        <!-- Project Header -->
        <div class="project-header">
          <div class="project-header-content">
            <h1 class="project-title">Проекты</h1>
            <p class="project-description">
              Управляйте своими проектами и присоединяйтесь к проектам других пользователей
            </p>
          </div>
          <a v-if="props.indexUrl" :href="props.indexUrl" class="btn btn-secondary">
            <i class="fas fa-arrow-left"></i>
            На главную
          </a>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button @click="activeTab = 'my'" :class="['tab', { 'tab-active': activeTab === 'my' }]">
            <i class="fas fa-folder"></i>
            Мои проекты
          </button>
          <button
            @click="activeTab = 'member'"
            :class="['tab', { 'tab-active': activeTab === 'member' }]"
          >
            <i class="fas fa-users"></i>
            Участник проектов
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Загрузка проектов...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="error-container">
          <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <span>{{ error }}</span>
          </div>
        </div>

        <!-- Projects Table -->
        <section v-else class="projects-section" :class="{ 'projects-visible': showCards }">
          <div v-if="displayedProjects.length === 0" class="empty-projects">
            <i class="fas fa-folder-open"></i>
            <p>Нет доступных проектов</p>
          </div>

          <div v-else class="table-container">
            <div class="section-header">
              <h2 class="section-title">
                {{ activeTab === 'my' ? 'Мои проекты' : 'Участник проектов' }}
              </h2>
              <div class="section-actions">
                <button @click="openCreateModal" class="btn btn-primary">
                  <i class="fas fa-plus"></i>
                  Создать проект
                </button>
                <button @click="openJoinModal" class="btn btn-secondary">
                  <i class="fas fa-user-plus"></i>
                  Присоединиться
                </button>
              </div>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Описание</th>
                  <th>Участники</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(project, index) in displayedProjects" :key="project.id">
                  <td>
                    <a :href="getProjectDetailUrl(project.id)" class="cell-content-link">
                      <i
                        class="fas fa-folder"
                        style="margin-right: 0.5rem; color: var(--color-accent)"
                      ></i>
                      {{ project.name }}
                    </a>
                  </td>
                  <td>
                    <div class="cell-content">
                      {{ project.description || '—' }}
                    </div>
                  </td>
                  <td>
                    <div class="cell-content">
                      <i
                        class="fas fa-users"
                        style="margin-right: 0.5rem; color: var(--color-accent)"
                      ></i>
                      {{ project.membersCount }}
                      {{
                        project.membersCount === 1
                          ? 'участник'
                          : project.membersCount < 5
                            ? 'участника'
                            : 'участников'
                      }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>

    <!-- Footer -->
    <footer v-if="bootLoaderDone" class="app-footer">
      <div class="footer-content">
        <div class="footer-left">ИП Худолей Андрей Германович</div>
        <div class="footer-center">Все права сохранены © 2025</div>
        <div class="footer-right">
          <button class="footer-link">
            Сделано с <i class="fas fa-heart footer-heart"></i> на Chatium
          </button>
        </div>
      </div>
    </footer>

    <!-- Create Project Modal -->
    <Transition name="modal">
      <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
        <div class="modal-content" @click.stop>
          <div class="modal-scanlines"></div>

          <div class="modal-header">
            <h2 class="modal-title">Создать проект</h2>
            <button @click="closeCreateModal" class="modal-close-btn" :disabled="creatingProject">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">
                <i class="fas fa-folder"></i>
                Название проекта
              </label>
              <input
                v-model="newProjectName"
                type="text"
                class="form-input"
                placeholder="Введите название проекта"
                :disabled="creatingProject"
                @keyup.enter="submitCreateProject"
              />

              <div v-if="createError" class="form-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>{{ createError }}</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">
                <i class="fas fa-align-left"></i>
                Описание (необязательно)
              </label>
              <textarea
                v-model="newProjectDescription"
                class="form-input form-textarea"
                placeholder="Введите описание проекта"
                :disabled="creatingProject"
                rows="4"
              ></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button
              @click="submitCreateProject"
              class="modal-btn modal-btn-submit"
              :disabled="creatingProject || !newProjectName.trim()"
            >
              <span v-if="creatingProject">
                <i class="fas fa-spinner fa-spin"></i>
                Создание...
              </span>
              <span v-else>Создать</span>
            </button>
            <button
              @click="closeCreateModal"
              class="modal-btn modal-btn-cancel"
              :disabled="creatingProject"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Join Project Modal -->
    <Transition name="modal">
      <div v-if="showJoinModal" class="modal-overlay" @click="closeJoinModal">
        <div class="modal-content" @click.stop>
          <div class="modal-scanlines"></div>

          <div class="modal-header">
            <h2 class="modal-title">Присоединиться к проекту</h2>
            <button @click="closeJoinModal" class="modal-close-btn" :disabled="joiningProject">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">
                <i class="fas fa-key"></i>
                ID проекта
              </label>
              <input
                v-model="joinProjectId"
                type="text"
                class="form-input"
                placeholder="Введите ID проекта"
                :disabled="joiningProject"
                @keyup.enter="submitJoinRequest"
              />
              <p class="form-hint">Введите ID проекта, к которому вы хотите присоединиться</p>

              <div v-if="joinError" class="form-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>{{ joinError }}</span>
              </div>

              <div v-if="joinSuccessMessage" class="form-success">
                <i class="fas fa-check-circle"></i>
                <span>{{ joinSuccessMessage }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button
              @click="submitJoinRequest"
              class="modal-btn modal-btn-submit"
              :disabled="joiningProject || !joinProjectId.trim()"
            >
              <span v-if="joiningProject">
                <i class="fas fa-spinner fa-spin"></i>
                Отправка...
              </span>
              <span v-else>Отправить заявку</span>
            </button>
            <button
              @click="closeJoinModal"
              class="modal-btn modal-btn-cancel"
              :disabled="joiningProject"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Alert Modal -->
    <AlertModal
      :show="showAlertModal"
      :message="alertMessage"
      :title="alertTitle"
      :type="alertType"
      @close="showAlertModal = false"
    />

    <!-- Confirm Modal -->
    <ConfirmModal
      :show="showConfirmModal"
      :message="confirmMessage"
      :title="confirmTitle"
      :type="confirmType"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>

<style scoped>
:root {
  --color-bg: #0a0a0a;
  --color-bg-secondary: #141414;
  --color-bg-tertiary: #1a1a1a;
  --color-text: #e8e8e8;
  --color-text-secondary: #a0a0a0;
  --color-text-tertiary: #707070;
  --color-border: #2a2a2a;
  --color-border-light: #3a3a3a;
  --color-accent: #d3234b;
  --color-accent-hover: #e6395f;
  --color-accent-light: rgba(211, 35, 75, 0.15);
  --transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

body {
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  margin: 0;
  background: var(--color-bg);
  letter-spacing: 0.03em;
}

/* Стилизация выделения текста */
::selection {
  background: #e0335a;
  color: #ffffff;
}

::-moz-selection {
  background: #e0335a;
  color: #ffffff;
}

/* App Layout */
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  position: relative;
  height: 100vh;
}

/* Header fixed */
.header {
  position: fixed !important;
  top: 0;
  left: 0;
  right: 0;
  z-index: 300;
  background: var(--color-bg);
}

/* Content Wrapper */
.content-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  position: relative;
  z-index: 100;
  padding: 80px 0;
  overflow-y: auto;
}

.content-inner {
  width: 100%;
  max-width: 1200px;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  position: relative;
  z-index: 10;
}

/* Hero Section */
.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.5rem;
  padding: 2rem 0;
  position: relative;
  z-index: 10;
}

.hero-icon-wrapper {
  width: 5rem;
  height: 5rem;
  border-radius: 0;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 8px 24px rgba(211, 35, 75, 0.4),
    0 4px 12px rgba(211, 35, 75, 0.3),
    0 0 30px rgba(211, 35, 75, 0.2),
    inset 0 0 0 2px rgba(0, 0, 0, 0.3);
  margin-bottom: 0.5rem;
  position: relative;
  cursor: pointer;
  overflow: hidden;
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
}

.hero-icon-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 2;
  animation: scanline-flicker 8s linear infinite;
}

@keyframes scanline-flicker {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 0.5;
  }
}

.hero-icon-wrapper.hero-icon-visible:hover {
  animation: glitch-icon 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

@keyframes glitch-icon {
  0%,
  100% {
    transform: scale(1) translate(0);
    filter: none;
    box-shadow:
      0 8px 24px rgba(211, 35, 75, 0.4),
      0 4px 12px rgba(211, 35, 75, 0.3);
  }
  10% {
    transform: scale(1) translate(-1.5px, 0);
    filter: drop-shadow(4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(-4px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
  20% {
    transform: scale(1) translate(1.5px, 0);
    filter: drop-shadow(-4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(4px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
  30% {
    transform: scale(1) translate(-1px, 0);
    filter: drop-shadow(4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(-4px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
  40% {
    transform: scale(1) translate(1px, 0);
    filter: drop-shadow(-4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(4px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
  50% {
    transform: scale(1) translate(-1.5px, 0);
    filter: drop-shadow(4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(-4px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
  60% {
    transform: scale(1) translate(1.5px, 0);
    filter: drop-shadow(-4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(4px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
  70% {
    transform: scale(1) translate(-1px, 0);
    filter: drop-shadow(4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(-4px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
  80% {
    transform: scale(1) translate(1px, 0);
    filter: drop-shadow(-4px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(4px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
  90% {
    transform: scale(1) translate(-0.5px, 0);
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.9)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.9));
    box-shadow: none;
  }
}

.hero-icon {
  font-size: 2rem;
  color: white;
  position: relative;
  z-index: 3;
}

.hero-heading {
  font-size: 2.5rem;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0.08em;
  margin: 0;
  margin-bottom: 0.5rem;
  min-height: 3rem;
  color: var(--color-text);
  position: relative;
  z-index: 10;
  text-shadow: 0 0 8px rgba(232, 232, 232, 0.3);
}

.hero-heading::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
  border-radius: 2px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.hero-heading.show-underline::after {
  opacity: 1;
}

.typing-cursor {
  display: inline-block;
  margin-left: 0.25rem;
  animation: terminal-cursor-blink 1s step-end infinite;
  color: var(--color-accent);
  text-shadow: 0 0 8px rgba(211, 35, 75, 0.5);
  font-size: 1em;
  line-height: 1;
  vertical-align: baseline;
}

@keyframes terminal-cursor-blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.hero-description {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  font-weight: 400;
  margin: 0;
  margin-bottom: 2rem;
  min-height: 1.6rem;
  max-width: 600px;
  letter-spacing: 0.05em;
  text-shadow: 0 0 6px rgba(160, 160, 160, 0.2);
}

.hero-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}

.hero-actions.hero-actions-visible {
  opacity: 1;
  transform: translateY(0);
}

.btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  font-size: 0.9375rem;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
  text-decoration: none;
}

.btn-primary {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-primary:hover {
  background: var(--color-accent-light);
  border-color: var(--color-accent-hover);
}

.btn-secondary {
  border-color: var(--color-border);
  color: var(--color-text-secondary);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--color-border-light);
  color: var(--color-text);
}

.loading-container,
.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  flex-direction: column;
  gap: 1rem;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: rgba(211, 35, 75, 0.1);
  border: 2px solid var(--color-accent);
  color: var(--color-accent);
  font-size: 1rem;
}

/* Cards Section */
.projects-section {
  width: 100%;
  position: relative;
  z-index: 10;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.projects-section.projects-visible {
  opacity: 1;
  pointer-events: auto;
}

@keyframes crt-tv-cards-power-on {
  0% {
    transform: scaleY(0.01) perspective(600px) rotateX(0deg);
    filter: brightness(1.5) contrast(1.3);
    clip-path: polygon(0 50%, 100% 50%, 100% 50%, 0 50%);
    opacity: 1;
  }
  0.5% {
    transform: scaleY(0.03) perspective(590px) rotateX(0.5deg);
    filter: brightness(1.45) contrast(1.32) drop-shadow(0.5px 0 0 rgba(255, 0, 0, 0.15))
      drop-shadow(-0.5px 0 0 rgba(0, 0, 255, 0.15));
    clip-path: polygon(0 49%, 100% 49.5%, 100% 50.5%, 0 51%);
    opacity: 1;
  }
  100% {
    transform: scaleY(1) perspective(0) rotateX(0deg) scaleX(1);
    filter: brightness(1) blur(0) contrast(1);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
    opacity: 1;
  }
}

.empty-projects {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--color-text-secondary);
}

.empty-projects i {
  font-size: 4rem;
  color: var(--color-text-tertiary);
  margin-bottom: 1.5rem;
  display: block;
}

/* Table Container */
.table-container {
  background: var(--color-bg-secondary);
  border: 2px solid var(--color-border);
  padding: 1.5rem;
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
  overflow-x: auto;
  overflow-y: visible;
  position: relative;
}

/* Project Header */
.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 2rem;
}

.project-header-content {
  flex: 1;
}

.project-title {
  font-size: 2rem;
  font-weight: 400;
  margin: 0 0 0.75rem 0;
  color: var(--color-text);
  letter-spacing: 0.05em;
}

.project-description {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.6;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid var(--color-border);
  margin-bottom: 2rem;
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.tabs::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.tab {
  padding: 0.75rem 1.5rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  white-space: nowrap;
}

.tab:hover {
  color: var(--color-text);
}

.tab-active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

/* Section Header */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 400;
  margin: 0;
  color: var(--color-text);
  letter-spacing: 0.05em;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
  table-layout: fixed;
}

.data-table thead {
  background: rgba(0, 0, 0, 0.3);
}

.data-table th {
  padding: 1rem;
  text-align: left;
  color: var(--color-text);
  font-weight: 400;
  letter-spacing: 0.03em;
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
}

.data-table th:nth-child(1) {
  width: 35%;
}

.data-table th:nth-child(2) {
  width: 45%;
}

.data-table th:nth-child(3) {
  width: 20%;
}

.data-table td {
  padding: 1rem;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
  position: relative;
}

.data-table td .cell-content {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  width: 100%;
}

.data-table td .cell-content-link {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text);
  text-decoration: none;
  transition: color 0.25s ease;
}

.data-table td .cell-content-link:hover {
  color: var(--color-accent);
}

.data-table tbody tr:hover {
  background: rgba(211, 35, 75, 0.05);
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
  overflow: visible;
}

.cards-grid .nav-card {
  opacity: 0;
  transform: scaleY(0.01);
  transform-origin: center;
  filter: brightness(0.8);
  animation: crt-tv-card-power-on 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

@keyframes crt-tv-card-power-on {
  0% {
    opacity: 0;
    transform: scaleY(0.01) perspective(500px) rotateX(0deg);
    filter: brightness(1.5) contrast(1.3);
    clip-path: polygon(0 50%, 100% 50%, 100% 50%, 0 50%);
  }
  100% {
    opacity: 1;
    transform: scaleY(1) perspective(0) rotateX(0deg) scaleX(1);
    filter: brightness(1) blur(0) contrast(1);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  }
}

.project-card-wrapper {
  position: relative;
}

/* Navigation Cards */
.nav-card {
  display: block;
  text-decoration: none;
  color: inherit;
  height: 100%;
  transition: var(--transition);
  position: relative;
  perspective: 1000px;
  z-index: 10;
  cursor: pointer;
  overflow: visible;
  padding-top: 4px;
}

.nav-card-content {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 2px solid var(--color-border);
  border-radius: 0;
  padding: 2.5rem;
  height: calc(100% - 4px);
  display: flex;
  flex-direction: column;
  transition:
    transform 0.6s cubic-bezier(0.34, 1.3, 0.64, 1),
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    filter 0.3s ease;
  position: relative;
  z-index: 11;
  box-shadow:
    0 0 0 0 rgba(0, 0, 0, 0),
    0 0 0 0 rgba(0, 0, 0, 0),
    inset 0 0 0 0 rgba(255, 255, 255, 0);
  overflow: hidden;
  transform-style: preserve-3d;
  cursor: pointer;
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
}

/* CRT scanlines эффект для карточек */
.nav-card-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 10;
  opacity: 0.5;
  animation: scanline-move 8s linear infinite;
}

@keyframes scanline-move {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(4px);
  }
}

/* Эффект мерцания старого монитора */
.nav-card-content::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    180deg,
    rgba(211, 35, 75, 0.02) 0%,
    transparent 50%,
    rgba(211, 35, 75, 0.02) 100%
  );
  pointer-events: none;
  z-index: 9;
  animation: crt-flicker 3s ease-in-out infinite;
  opacity: 0;
}

@keyframes crt-flicker {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 0.3;
  }
}

.nav-card:hover .nav-card-content::after {
  animation:
    crt-flicker-intense 0.15s ease-in-out infinite,
    crt-flicker 3s ease-in-out infinite;
}

@keyframes crt-flicker-intense {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.4;
  }
}

.nav-card-project .nav-card-content {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
}

.nav-card:hover .nav-card-content {
  transform: translateY(-4px) rotateX(0.8deg) rotateY(-0.4deg);
  border-color: var(--color-border-light);
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.4),
    0 4px 8px rgba(0, 0, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  animation: card-glitch 4s ease-in-out infinite;
}

.nav-card-project:hover .nav-card-content {
  border-color: rgba(211, 35, 75, 0.5);
  box-shadow:
    0 8px 20px rgba(211, 35, 75, 0.15),
    0 4px 10px rgba(0, 0, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 0 30px rgba(211, 35, 75, 0.1);
}

/* RGB-разделение и искривление для карточек при hover */
@keyframes card-glitch {
  0%,
  90%,
  100% {
    filter: none;
  }
  91% {
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.5)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.5));
  }
  92% {
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.5)) drop-shadow(2px 0 0 rgba(0, 255, 255, 0.5));
  }
  93% {
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.5)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.5));
  }
  94%,
  96%,
  98% {
    filter: none;
  }
  95% {
    filter: drop-shadow(1px 0 0 rgba(255, 0, 255, 0.4)) drop-shadow(-1px 0 0 rgba(0, 255, 255, 0.4));
  }
  97% {
    filter: drop-shadow(-1px 0 0 rgba(255, 0, 255, 0.4)) drop-shadow(1px 0 0 rgba(0, 255, 255, 0.4));
  }
}

.nav-card-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  color: var(--color-text);
  font-size: 1.25rem;
  background: var(--color-bg-tertiary);
  border: 2px solid var(--color-border);
  transition:
    transform 0.5s ease-out,
    border-color 0.25s ease,
    box-shadow 0.25s ease;
  position: relative;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    inset 0 0 0 1px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}

.nav-card-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.12) 0px,
    rgba(0, 0, 0, 0.12) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 0;
}

.nav-card-icon i {
  position: relative;
  z-index: 2;
}

.nav-card-icon::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--color-accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
  z-index: 2;
}

.nav-card:hover .nav-card-icon::after {
  transform: scaleX(1);
}

.nav-card-icon-project {
  background: linear-gradient(
    135deg,
    var(--color-accent-medium) 0%,
    var(--color-accent-light) 100%
  );
  border-color: rgba(211, 35, 75, 0.4);
  color: var(--color-accent);
}

.nav-card:hover .nav-card-icon {
  border-color: var(--color-border-light);
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transform: translateY(-2px);
}

.nav-card-project:hover .nav-card-icon-project {
  background: linear-gradient(135deg, rgba(211, 35, 75, 0.3) 0%, rgba(211, 35, 75, 0.2) 100%);
  border-color: var(--color-accent);
  box-shadow:
    0 4px 12px rgba(211, 35, 75, 0.3),
    0 2px 6px rgba(211, 35, 75, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.nav-card-title {
  font-size: 1.125rem;
  font-weight: 400;
  color: var(--color-text);
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
  letter-spacing: 0.03em;
  position: relative;
  z-index: 3;
  text-shadow: 0 0 6px rgba(232, 232, 232, 0.2);
}

.nav-card-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  flex-grow: 1;
  margin: 0 0 1.5rem 0;
  position: relative;
  z-index: 3;
  letter-spacing: 0.02em;
  text-shadow: 0 0 4px rgba(160, 160, 160, 0.15);
}

.nav-card-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  position: relative;
  z-index: 3;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  letter-spacing: 0.02em;
  transition: color 0.25s ease;
}

.meta-item i {
  color: var(--color-accent);
  font-size: 0.875rem;
  transition: color 0.25s ease;
  opacity: 0.8;
}

.nav-card:hover .meta-item {
  color: var(--color-text);
}

.nav-card:hover .meta-item i {
  color: var(--color-accent-hover);
  opacity: 1;
}

.nav-card-arrow {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: var(--color-text-tertiary);
  font-size: 1rem;
  transition:
    transform 0.5s ease-out,
    color 0.25s ease;
  margin-top: auto;
  position: relative;
  z-index: 3;
}

.nav-card:hover .nav-card-arrow {
  transform: translateX(4px);
  color: var(--color-accent);
}

/* Footer */
.app-footer {
  background: transparent;
  padding: 1.5rem 0;
  flex-shrink: 0;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 300;
}

.app-footer::before {
  content: '';
  position: absolute;
  bottom: 10px;
  left: 10px;
  width: 20px;
  height: 20px;
  border-left: 2px solid rgba(211, 35, 75, 0.3);
  border-bottom: 2px solid rgba(211, 35, 75, 0.3);
  pointer-events: none;
}

.app-footer::after {
  content: '';
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 20px;
  height: 20px;
  border-right: 2px solid rgba(211, 35, 75, 0.3);
  border-bottom: 2px solid rgba(211, 35, 75, 0.3);
  pointer-events: none;
}

.footer-content {
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.03em;
  position: relative;
}

.footer-left:hover,
.footer-center:hover {
  animation: glitch-footer 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

@keyframes glitch-footer {
  0%,
  100% {
    transform: translate(0);
    text-shadow: none;
  }
  10% {
    transform: translate(-1.5px, 0);
    text-shadow:
      1px 0 #ff00ff,
      -1px 0 #00ffff;
  }
  20% {
    transform: translate(1.5px, 0);
    text-shadow:
      -1px 0 #ff00ff,
      1px 0 #00ffff;
  }
  30% {
    transform: translate(-1px, 0);
    text-shadow:
      1.5px 0 #ff00ff,
      -1.5px 0 #00ffff;
  }
  40% {
    transform: translate(1px, 0);
    text-shadow:
      -1.5px 0 #ff00ff,
      1.5px 0 #00ffff;
  }
  50% {
    transform: translate(-1.5px, 0);
    text-shadow:
      1px 0 #ff00ff,
      -1px 0 #00ffff;
  }
  60% {
    transform: translate(1.5px, 0);
    text-shadow:
      -1px 0 #ff00ff,
      1px 0 #00ffff;
  }
  70% {
    transform: translate(-1px, 0);
    text-shadow:
      1px 0 #ff00ff,
      -1px 0 #00ffff;
  }
  80% {
    transform: translate(1px, 0);
    text-shadow:
      -1px 0 #ff00ff,
      1px 0 #00ffff;
  }
  90% {
    transform: translate(-0.5px, 0);
    text-shadow:
      0.5px 0 #ff00ff,
      -0.5px 0 #00ffff;
  }
}

.footer-left {
  flex: 1;
  text-align: left;
  color: var(--color-text-secondary);
}

.footer-center {
  flex: 0 0 auto;
  text-align: center;
  color: var(--color-text-secondary);
}

.footer-right {
  flex: 1;
  text-align: right;
}

.footer-link {
  color: var(--color-text-secondary);
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.25s ease;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  position: relative;
  z-index: 10;
}

.footer-link:hover {
  color: var(--color-text);
  animation: glitch-footer 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

.footer-heart {
  color: #dd3057;
  font-size: 0.875rem;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  padding: 1rem;
}

.modal-content {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 2px solid var(--color-accent);
  padding: 0;
  max-width: 600px;
  width: 100%;
  position: relative;
  box-shadow:
    0 0 40px rgba(211, 35, 75, 0.4),
    0 0 80px rgba(211, 35, 75, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
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
}

.modal-scanlines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 1;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2rem 2.5rem;
  border-bottom: 1px solid var(--color-border);
  position: relative;
  z-index: 2;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--color-text);
  margin: 0;
  letter-spacing: 0.08em;
}

.modal-close-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 0;
  background: transparent;
  border: 2px solid var(--color-border);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition);
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 4px),
    0 calc(100% - 4px)
  );
}

.modal-close-btn:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: rgba(211, 35, 75, 0.1);
}

.modal-close-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-body {
  padding: 2rem 2.5rem;
  position: relative;
  z-index: 2;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  color: var(--color-text);
  letter-spacing: 0.03em;
}

.form-label i {
  color: var(--color-accent);
}

.form-input {
  padding: 0.875rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid var(--color-border);
  color: var(--color-text);
  font-size: 0.9375rem;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.05em;
  transition: var(--transition);
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}

.form-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 10px rgba(211, 35, 75, 0.3);
}

.form-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(0, 0, 0, 0.2);
}

.form-input::placeholder {
  color: var(--color-text-tertiary);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
  font-family: 'Courier New', monospace;
}

.form-hint {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin: 0;
  letter-spacing: 0.02em;
}

.form-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(211, 35, 75, 0.1);
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
  font-size: 0.875rem;
}

.form-success {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid #4ade80;
  color: #4ade80;
  font-size: 0.875rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem 2.5rem;
  border-top: 1px solid var(--color-border);
  position: relative;
  z-index: 2;
}

.modal-btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  font-size: 0.9375rem;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-btn-submit {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.modal-btn-submit:hover:not(:disabled) {
  background: var(--color-accent-light);
  border-color: var(--color-accent-hover);
}

.modal-btn-cancel {
  border-color: var(--color-border);
  color: var(--color-text-secondary);
}

.modal-btn-cancel:hover:not(:disabled) {
  border-color: var(--color-border-light);
  color: var(--color-text);
}

/* Modal transitions */
.modal-enter-active {
  transition: opacity 0.3s ease-out;
}

.modal-leave-active {
  transition: opacity 0.3s ease-in;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content {
  animation: modal-appear 0.4s cubic-bezier(0.34, 1.3, 0.64, 1);
}

.modal-leave-active .modal-content {
  animation: modal-disappear 0.4s cubic-bezier(0.34, 1.3, 0.64, 1);
}

@keyframes modal-appear {
  from {
    transform: scale(0.8) translateY(20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

@keyframes modal-disappear {
  from {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
  to {
    transform: scale(0.8) translateY(20px);
    opacity: 0;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .content-inner {
    padding: 0 1rem;
    gap: 3rem;
  }

  .content-wrapper {
    padding: 2rem 0;
  }

  .hero-section {
    gap: 1.25rem;
    padding: 1rem 0;
  }

  .hero-heading {
    font-size: 2rem;
  }

  .hero-description {
    font-size: 0.9375rem;
  }

  .cards-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .nav-card-content {
    padding: 2rem;
  }

  .nav-card-icon {
    width: 2.75rem;
    height: 2.75rem;
    font-size: 1.125rem;
    margin-bottom: 1.25rem;
  }

  .nav-card-title {
    font-size: 1rem;
  }

  .nav-card-description {
    font-size: 0.8125rem;
  }

  .footer-content {
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.8125rem;
  }

  .footer-left,
  .footer-center,
  .footer-right {
    text-align: center;
    flex: none;
  }
}

@media (max-width: 480px) {
  .content-inner {
    padding: 0 0.75rem;
    gap: 2.5rem;
  }

  .content-wrapper {
    padding: 1.5rem 0;
  }

  .hero-section {
    gap: 1rem;
  }

  .hero-heading {
    font-size: 1.75rem;
    letter-spacing: 0.08em;
  }

  .hero-description {
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .nav-card-content {
    padding: 1.75rem;
  }

  .footer-content {
    font-size: 0.75rem;
  }
}
</style>
