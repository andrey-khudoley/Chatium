<template>
  <div class="flex flex-col h-screen">
    <!-- Top Header (hidden on mobile) -->
    <Header
      v-show="!isMobileMenuOpen"
      ref="headerRef"
      :basePath="cachedBasePath"
      :activeSectionId="activeSectionId"
      :sections="topSections"
      :isViewMode="isViewMode"
      @section-change="handleSectionChange"
      @edit="handleEdit"
      @icon-change="handleIconChange"
      @navigate="handleNavigate"
      @toggle-menu="isMobileMenuOpen = true"
      @toggle-view-mode="toggleViewMode"
      @add-section="showCreateSection"
      @add-page="showCreatePage"
      class="hidden md:block"
    />

    <!-- Mobile Header (always visible on mobile) -->
    <div
      class="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3"
    >
      <div class="flex items-center space-x-2">
        <img
          src="https://fs.cdn-chatium.io/get/image_gc_dQ8uxvoDUR.512x512.png"
          alt="Chatium"
          class="w-6 h-6 rounded"
        />
        <span class="text-sm font-semibold text-gray-900">{{
          ctx.t('Chatium Documentation')
        }}</span>
      </div>
      <button @click="isMobileMenuOpen = true" class="text-gray-600 hover:text-gray-900">
        <i class="fas fa-bars text-lg"></i>
      </button>
    </div>

    <div class="flex flex-1 max-w-7xl mx-auto w-full">
      <!-- Sidebar (hidden on mobile) -->
      <Sidebar
        v-show="!isMobileMenuOpen"
        ref="sidebarRef"
        :currentDocId="currentDocumentId"
        :activeSectionId="activeSectionId"
        :tree="documentTree"
        :currentPath="currentDocumentPath"
        :unsavedPages="unsavedPages"
        :isViewMode="isViewMode"
        @navigate="handleNavigate"
        @delete-document="deleteDocument"
        @create-child="createChildDocument"
        @edit="handleEdit"
        @icon-change="handleIconChange"
        @reload-tree="loadTree"
        class="hidden md:block"
      />

      <!-- Mobile Menu Overlay -->
      <div v-if="isMobileMenuOpen" class="fixed inset-0 z-40 flex flex-col bg-white md:hidden">
        <!-- Mobile Header with close button -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <div class="flex items-center space-x-2">
            <img
              src="https://fs.cdn-chatium.io/get/image_gc_dQ8uxvoDUR.512x512.png"
              alt="Chatium"
              class="w-6 h-6 rounded"
            />
            <span class="text-lg font-bold text-gray-900">{{ ctx.t('Menu') }}</span>
          </div>
          <button @click="isMobileMenuOpen = false" class="text-gray-600 hover:text-gray-900">
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>

        <!-- Mobile Sections Navigation -->
        <nav class="border-b border-gray-200 p-4 overflow-y-auto">
          <div class="space-y-2">
            <a
              v-for="section in topSections"
              :key="section.id"
              @click.prevent="handleMobileSectionChange(section.id)"
              :class="[
                'block px-4 py-2 rounded-lg transition-colors',
                activeSectionId === section.id
                  ? 'bg-blue-100 text-blue-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-100'
              ]"
            >
              {{ section.title }}
            </a>
          </div>
        </nav>

        <!-- Mobile Sidebar -->
        <div class="flex-1 overflow-y-auto">
          <Sidebar
            ref="mobileSidebarRef"
            :currentDocId="currentDocumentId"
            :activeSectionId="activeSectionId"
            :tree="documentTree"
            :currentPath="currentDocumentPath"
            :unsavedPages="unsavedPages"
            :isViewMode="isViewMode"
            @navigate="handleMobileNavigate"
            @delete-document="deleteDocument"
            @create-child="createChildDocument"
            @edit="handleEdit"
            @icon-change="handleIconChange"
            @reload-tree="loadTree"
          />
        </div>
      </div>

      <!-- Main Content -->
      <div v-if="currentDocumentId" ref="contentRef" class="flex-1 bg-white overflow-y-auto pl-6">
        <EditorView
          :key="currentDocumentId"
          :documentId="currentDocumentId"
          :isViewMode="isViewMode"
          @reload-tree="loadTree"
          @unsaved-state-changed="handleUnsavedStateChanged"
          @navigate="handleNavigate"
        />
      </div>

      <!-- Welcome Screen -->
      <div
        v-else
        :class="[
          'flex-1 flex items-center justify-center bg-white overflow-y-auto',
          allDocuments.length > 0 ? 'pl-6' : ''
        ]"
      >
        <div class="text-center">
          <!-- Show logo only when database is NOT empty -->
          <img
            v-if="allDocuments.length > 0"
            src="https://fs.cdn-chatium.io/get/image_gc_dQ8uxvoDUR.512x512.png"
            alt="Chatium Documentation"
            class="w-20 h-20 mx-auto mb-4 rounded-lg"
          />
          <h1 class="text-3xl font-bold mb-2" style="color: #333">
            {{ ctx.t('Chatium Documentation') }}
          </h1>
          <p class="mb-6" style="color: #333">
            <template v-if="allDocuments.length === 0 && ctx.user?.is('Admin')">
              {{ ctx.t('The database is empty. Start by creating sample documentation.') }}
            </template>
            <template v-else>
              {{ ctx.t('Select a document from the sidebar') }}
            </template>
          </p>

          <!-- Start Button for empty database -->
          <button
            v-if="allDocuments.length === 0 && ctx.user?.is('Admin')"
            @click="handleSeedDatabase"
            :disabled="isSeedingDatabase"
            class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i v-if="isSeedingDatabase" class="fas fa-spinner fa-spin mr-2"></i>
            {{ isSeedingDatabase ? ctx.t('Creating...') : ctx.t('Start') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit/Create Modal -->
    <EditModal
      :isOpen="showEditModal"
      :nodeType="editingNode?.type"
      :nodeId="editingNode?.id"
      :data="editingNode?.data"
      :documents="allDocuments"
      @close="closeEditModal"
      @save="handleSaveEdit"
      @delete="handleDeleteFromModal"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import {
  apiDocumentsTreeRoute,
  apiDocumentCreateRoute,
  apiDocumentDeleteRoute,
  apiDocumentUpdateRoute,
  apiDocumentsListRoute,
  apiDocumentsSeedRoute
} from '../api/documents'
import { indexPageRoute, documentPageRoute, slugPathRoute, apiGetBasePathRoute } from '../index'
import { apiConfigGetRoute } from '../api/config'
import Header from '../components/Header.vue'
import Sidebar from '../components/Sidebar.vue'
import EditorView from './EditorView.vue'
import EditModal from '../components/EditModal.vue'

const props = defineProps({
  initialDocumentId: String,
  initialSlugPath: String,
  initialDocument: String, // JSON string
  initialAllDocuments: String // JSON string
})

// Track previous URL to detect hash-only changes
let previousUrl = window.location.href

const currentDocumentId = ref(props.initialDocumentId)
const activeSectionId = ref(null)
const sidebarRef = ref(null)
const mobileSidebarRef = ref(null)
const headerRef = ref(null)
const allDocuments = ref(props.initialAllDocuments ? JSON.parse(props.initialAllDocuments) : [])
const documentTree = ref([])
const currentDocumentPath = ref([])
const isMobileMenuOpen = ref(false)
const isViewMode = ref(true) // Track if currently in view mode
const contentRef = ref(null)
const savedScrollPosition = ref(0) // Saved scroll position for view mode

const topSections = computed(() => {
  // Return all top-level sections (where parentId is null)
  return allDocuments.value.filter((d) => {
    const parentId = d.parentId?.id || d.parentId
    return parentId === null || parentId === undefined
  })
})
const showEditModal = ref(false)
const editingNode = ref(null)
const isCreatingNew = ref(false) // Track if creating new document
const unsavedPages = ref({})
const cachedBasePath = ref(null) // Cached base path - loaded once on mount
const urlType = ref('slug') // URL type from config: 'slug' or 'id'
const isSeedingDatabase = ref(false) // Track if seeding is in progress

onMounted(async () => {
  // Load base path once and cache it
  const basePathData = await apiGetBasePathRoute.run(ctx)
  cachedBasePath.value = basePathData.basePath

  // Load URL type configuration from API
  try {
    const configResult = await apiConfigGetRoute({ key: 'url_type' }).run(ctx)
    urlType.value = configResult?.value || 'slug'
  } catch (error) {
    console.error('Failed to load url_type config:', error)
    urlType.value = 'slug' // default fallback
  }

  // Only load data if not provided as SSR
  if (!props.initialAllDocuments) {
    await loadData()
  }

  await loadTree()

  // If a document is loaded initially, find its root section and build path
  if (props.initialDocumentId) {
    // Build currentDocumentPath for SSR loaded document
    const path = buildDocumentPath(props.initialDocumentId)
    currentDocumentPath.value = path

    const rootSectionId = findRootSection(props.initialDocumentId)
    if (rootSectionId) {
      activeSectionId.value = rootSectionId
    }
  }

  // Otherwise, default to first section (top-level)
  if (!activeSectionId.value && topSections.value.length > 0) {
    activeSectionId.value = topSections.value[0].id
  }

  window.addEventListener('popstate', handlePopState)
  window.addEventListener('keydown', handleKeyboardShortcut)
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', handlePopState)
  window.removeEventListener('keydown', handleKeyboardShortcut)
})

function handlePopState(event) {
  const currentUrl = window.location.href
  const previousUrlObj = new URL(previousUrl)
  const currentUrlObj = new URL(currentUrl)

  // Ignore if only hash changed (anchor navigation within page)
  if (
    previousUrlObj.pathname === currentUrlObj.pathname &&
    previousUrlObj.search === currentUrlObj.search
  ) {
    previousUrl = currentUrl
    return
  }

  previousUrl = currentUrl

  // Parse document ID from URL based on current patterns
  const path = window.location.pathname
  const basePath = ctx.workspace.path || ''

  // Pattern 1: /basePath/id/{documentId}
  const idMatch = path.match(new RegExp(`^${basePath}/id/(.+)$`))
  if (idMatch) {
    currentDocumentId.value = idMatch[1]
    return
  }

  // Pattern 2: /basePath/{slugPath} - would need server lookup
  // For now, don't change document on popstate for slug-based URLs
  // as they should be handled by initial page load
}

function handleKeyboardShortcut(event) {
  // Cmd+E (Mac) or Ctrl+E (Windows/Linux)
  if ((event.metaKey || event.ctrlKey) && event.key === 'e') {
    event.preventDefault()
    toggleViewMode()
  }
}

async function handleNavigate(documentId) {
  currentDocumentId.value = documentId

  if (documentId) {
    // Build path from allDocuments without API call
    const path = buildDocumentPath(documentId)
    currentDocumentPath.value = path

    const rootSectionId = findRootSection(documentId)
    if (rootSectionId) {
      activeSectionId.value = rootSectionId
    }

    // Use cached base path
    const basePath = cachedBasePath.value

    // Build URL based on configuration
    let newUrl
    let urlSlugPath = null
    if (urlType.value === 'id') {
      // Always use ID-based URLs
      newUrl = `${basePath}/id/${documentId}`
    } else if (urlType.value === 'slug-only') {
      // Use only page slug without path
      const currentDoc = allDocuments.value.find((d) => d.id === documentId)
      if (currentDoc && currentDoc.slug) {
        newUrl = `${basePath}/${currentDoc.slug}`
        urlSlugPath = currentDoc.slug
      } else {
        // Fallback to ID if no slug
        newUrl = `${basePath}/id/${documentId}`
      }
    } else {
      // Use slug-based URLs (full path) if possible
      urlSlugPath = buildSlugPathFromDocPath(path)
      newUrl = urlSlugPath ? `${basePath}/${urlSlugPath}` : `${basePath}/id/${documentId}`
    }

    window.history.pushState({ documentId, slugPath: urlSlugPath }, '', newUrl)
    previousUrl = window.location.href // Update tracked URL
  } else {
    // Use cached base path
    const basePath = cachedBasePath.value
    const newUrl = basePath || '/'
    window.history.pushState({ documentId: null }, '', newUrl)
    previousUrl = window.location.href // Update tracked URL
  }
}

async function handleSectionChange(sectionId) {
  activeSectionId.value = sectionId

  const firstPage = findFirstPageInSection(sectionId)
  if (firstPage) {
    await handleNavigate(firstPage.id)
  } else {
    currentDocumentId.value = null
  }
}

async function handleMobileSectionChange(sectionId) {
  await handleSectionChange(sectionId)
}

async function handleMobileNavigate(documentId) {
  await handleNavigate(documentId)
  isMobileMenuOpen.value = false
}

function findFirstPageInSection(sectionId) {
  const children = allDocuments.value.filter((d) => {
    const parentId = d.parentId?.id || d.parentId
    return parentId === sectionId
  })

  for (const child of children) {
    if (child.type === 'page') {
      return child
    }
  }

  for (const child of children) {
    if (child.type === 'section') {
      const nestedPage = findFirstPageInSection(child.id)
      if (nestedPage) {
        return nestedPage
      }
    }
  }

  return null
}

function buildSlugPathFromDocPath(path) {
  // Check if all documents in path have slug
  const allHaveSlugs = path.every((doc) => doc.slug && doc.slug.trim().length > 0)

  if (!allHaveSlugs) return null

  // Build slug path
  return path.map((doc) => doc.slug).join('/')
}

function buildDocumentPath(documentId) {
  const path = []
  let doc = allDocuments.value.find((d) => d.id === documentId)
  if (!doc) return path

  let iterations = 0
  const maxIterations = 100

  while (doc && iterations < maxIterations) {
    iterations++
    path.unshift(doc)

    const parentId = doc.parentId?.id || doc.parentId
    if (parentId) {
      doc = allDocuments.value.find((d) => d.id === parentId)
      if (!doc) break
    } else {
      break
    }
  }

  return path
}

function findRootSection(documentId) {
  let doc = allDocuments.value.find((d) => d.id === documentId)
  if (!doc) return null

  let iterations = 0
  const maxIterations = 100

  while (doc && iterations < maxIterations) {
    iterations++

    // Check if this is a top-level document (child of null)
    const parentId = doc.parentId?.id || doc.parentId
    if (!parentId) {
      return doc.id
    }

    if (parentId) {
      doc = allDocuments.value.find((d) => d.id === parentId)
      if (!doc) break
    } else {
      break
    }
  }

  // Fallback to first top-level section
  return topSections.value.length > 0 ? topSections.value[0].id : null
}

async function loadData() {
  try {
    const allDocsData = await apiDocumentsListRoute.run(ctx)
    allDocuments.value = allDocsData
  } catch (error) {
    console.error('Failed to load data:', error)
  }
}

async function loadTree() {
  try {
    documentTree.value = await apiDocumentsTreeRoute.run(ctx)
  } catch (error) {
    console.error('Failed to load tree:', error)
  }
}

async function createChildDocument(parentId) {
  isCreatingNew.value = true
  editingNode.value = {
    id: null,
    type: 'page',
    data: {
      title: '',
      slug: '',
      type: 'page',
      parentId: parentId,
      order: 0,
      isPublished: false
    }
  }
  showEditModal.value = true
}

function handleUnsavedStateChanged(event) {
  const { documentId, hasUnsavedChanges } = event
  if (hasUnsavedChanges) {
    unsavedPages.value[documentId] = true
  } else {
    delete unsavedPages.value[documentId]
  }
}

async function deleteDocument(id) {
  // No confirmation needed - should be done before calling this function

  try {
    await apiDocumentDeleteRoute({ id }).run(ctx, {})

    allDocuments.value = allDocuments.value.filter((d) => d.id !== id)

    if (id === currentDocumentId.value) {
      await handleNavigate(null)
    }

    delete unsavedPages.value[id]

    // Reload tree after deletion
    await loadTree()
  } catch (error) {
    console.error('Failed to delete document:', error)
  }
}

async function handleEdit(event) {
  const { nodeId, nodeType, type } = event

  const nodeData = allDocuments.value.find((d) => d.id === nodeId)

  if (!nodeData) return

  editingNode.value = {
    id: nodeId,
    type: nodeType || type,
    data: {
      title: nodeData.title,
      slug: nodeData.slug,
      type: nodeData.type,
      parentId: nodeData.parentId?.id || null,
      order: nodeData.order || 0,
      isPublished: nodeData.isPublished ?? false
    }
  }

  showEditModal.value = true
}

async function handleSaveEdit(data) {
  if (!editingNode.value) return

  try {
    if (isCreatingNew.value) {
      // Create new document
      const doc = await apiDocumentCreateRoute.run(ctx, {
        title: data.title,
        slug: data.slug || undefined,
        type: data.type,
        parentId: data.parentId || null,
        order: data.order || 0,
        isPublished: data.isPublished ?? false
      })

      // Reload all data from server
      await loadData()
      await loadTree()

      // Navigate to new page if it's a page (not section)
      if (data.type === 'page') {
        await handleNavigate(doc.id)
      }
    } else {
      // Update existing document
      await apiDocumentUpdateRoute({ id: editingNode.value.id }).run(ctx, {
        title: data.title,
        slug: data.slug,
        type: data.type,
        parentId: data.parentId,
        order: data.order,
        isPublished: data.isPublished
      })

      // Reload all data from server
      await loadData()
      await loadTree()

      // Rebuild currentDocumentPath if needed
      if (currentDocumentId.value) {
        const path = buildDocumentPath(currentDocumentId.value)
        currentDocumentPath.value = path
      }
    }

    closeEditModal()
  } catch (error) {
    const errorMessage = error?.message || 'Failed to save'
    alert(errorMessage)
    console.error('Failed to save:', error)
  }
}

async function handleDeleteFromModal() {
  if (!editingNode.value || !editingNode.value.id) return

  if (!confirm(ctx.t('Are you sure you want to delete this document?'))) return

  const idToDelete = editingNode.value.id
  closeEditModal()
  await deleteDocument(idToDelete)
}

function closeEditModal() {
  showEditModal.value = false
  editingNode.value = null
  isCreatingNew.value = false
}

async function toggleViewMode() {
  const wasViewMode = isViewMode.value

  // Save scroll position when leaving view mode (going to edit mode)
  if (wasViewMode && contentRef.value) {
    savedScrollPosition.value = contentRef.value.scrollTop
  }

  // Toggle mode
  isViewMode.value = !isViewMode.value

  // Restore scroll position when returning to view mode (from edit mode)
  if (!wasViewMode && contentRef.value) {
    await nextTick()
    // Additional delay to ensure content is fully rendered
    setTimeout(() => {
      if (contentRef.value) {
        contentRef.value.scrollTop = savedScrollPosition.value
      }
    }, 150)
  }
}

function showCreateSection() {
  isCreatingNew.value = true
  editingNode.value = {
    id: null,
    type: 'section',
    data: {
      title: '',
      slug: '',
      type: 'section',
      parentId: null,
      order: 0,
      isPublished: true // Секции автоматически публикуются
    }
  }
  showEditModal.value = true
}

function showCreatePage() {
  isCreatingNew.value = true

  // Determine parent based on current document
  let parentId = null
  if (currentDocumentId.value) {
    const currentDoc = allDocuments.value.find((d) => d.id === currentDocumentId.value)
    if (currentDoc) {
      if (currentDoc.type === 'page') {
        // If current is a page, use its parent
        parentId = currentDoc.parentId?.id || currentDoc.parentId || null
      } else if (currentDoc.type === 'section') {
        // If current is a section, add page inside this section
        parentId = currentDoc.id
      }
    }
  }

  editingNode.value = {
    id: null,
    type: 'page',
    data: {
      title: '',
      slug: '',
      type: 'page',
      parentId: parentId,
      order: 0,
      isPublished: false
    }
  }
  showEditModal.value = true
}

async function handleIconChange(event) {
  const { nodeId, icon, imageHash } = event

  try {
    await apiDocumentUpdateRoute({ id: nodeId }).run(ctx, {
      icon: icon || null,
      imageHash: imageHash || null
    })

    // Reload all data from server
    await loadData()
    await loadTree()
  } catch (error) {
    console.error('Failed to update icon:', error)
    alert('Failed to update icon. Please try again.')
  }
}

async function handleSeedDatabase() {
  isSeedingDatabase.value = true

  try {
    const result = await apiDocumentsSeedRoute.run(ctx, {})

    // Reload all data from server
    await loadData()
    await loadTree()

    // Navigate to first page
    if (allDocuments.value.length > 0) {
      const firstPage = allDocuments.value.find((d) => d.type === 'page')
      if (firstPage) {
        await handleNavigate(firstPage.id)
      }
    }

    alert(result.message || ctx.t('Database successfully seeded!'))
  } catch (error) {
    console.error('Failed to seed database:', error)
    alert(error?.message || ctx.t('Failed to seed the database. Please try again.'))
  } finally {
    isSeedingDatabase.value = false
  }
}
</script>
