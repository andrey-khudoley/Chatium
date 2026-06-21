<template>
  <div v-if="isOpen" class="modal-overlay" @click="close">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Добавить в папку</h3>
        <button @click="close" class="btn-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="modal-body">
        <div v-if="folders.length === 0" class="empty-folders">
          <i class="fas fa-folder-open"></i>
          <p>У вас пока нет папок</p>
          <button @click="createFolder" class="btn-create-folder">
            <i class="fas fa-plus"></i>
            Создать папку
          </button>
        </div>
        
        <div v-else class="folders-list">
          <div
            v-for="folder in folders"
            :key="folder.id"
            :class="['folder-item', { active: isInFolder(folder.id) }]"
            @click="toggleFolder(folder.id)"
          >
            <span class="folder-icon" :style="{ color: folder.color }">{{ folder.icon || '📁' }}</span>
            <span class="folder-name">{{ folder.name }}</span>
            <i v-if="isInFolder(folder.id)" class="fas fa-check check-icon"></i>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="close" class="btn-secondary">Готово</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  isOpen: Boolean,
  folders: {
    type: Array,
    default: () => []
  },
  chatId: {
    type: String,
    default: null
  },
  chatFolderIds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'toggle-folder', 'create-folder'])

function close() {
  emit('close')
}

function createFolder() {
  emit('create-folder')
  close()
}

function isInFolder(folderId) {
  return props.chatFolderIds.includes(folderId)
}

function toggleFolder(folderId) {
  emit('toggle-folder', folderId)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 0.75rem;
  width: 100%;
  max-width: 20rem;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-close {
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.btn-close:hover {
  background: var(--bg-hover);
}

.modal-body {
  padding: 0.75rem;
  max-height: 20rem;
  overflow-y: auto;
}

.empty-folders {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1rem;
  text-align: center;
  color: var(--text-muted);
}

.empty-folders i {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.empty-folders p {
  margin: 0 0 1rem 0;
  font-size: 0.9375rem;
}

.btn-create-folder {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: none;
  background: var(--accent-primary);
  color: white;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-create-folder:hover {
  background: var(--accent-hover);
}

.folders-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.folder-item:hover {
  background: var(--bg-hover);
}

.folder-item.active {
  background: var(--accent-light);
}

.folder-icon {
  font-size: 1.25rem;
}

.folder-name {
  flex: 1;
  font-size: 0.9375rem;
  color: var(--text-primary);
}

.check-icon {
  color: var(--accent-primary);
  font-size: 0.875rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--border-color);
}

.btn-secondary {
  padding: 0.625rem 1.25rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-hover);
}
</style>