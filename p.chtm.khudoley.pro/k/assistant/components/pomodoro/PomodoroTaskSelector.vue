<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PomodoroTaskSelectDropdown from './PomodoroTaskSelectDropdown.vue'

type TaskItem = {
  id: string
  title: string
  projectId: string
  projectName?: string
  clientName?: string
}

const props = defineProps<{
  toolsControlUrl: string
  getTasksUrl: string
  currentTaskId: string
  /** Ключ дневной статистики помодоро (YYYY-MM-DD, полночь по часовому поясу из профиля), см. pomodoro-stats-day */
  statsDayKey: string
}>()

const emit = defineEmits<{
  (event: 'taskAssigned', taskId: string): void
}>()

const tasks = ref<TaskItem[]>([])
const loading = ref(false)

async function loadTasks() {
  loading.value = true
  try {
    const r = await fetch(props.getTasksUrl, { credentials: 'include' })
    const j = await r.json()
    if (j.success && j.tasks) {
      tasks.value = j.tasks
    }
  } catch (error) {
    console.error('Failed to load tasks:', error)
  } finally {
    loading.value = false
  }
}

async function assignTask(taskId: string) {
  try {
    const r = await fetch(props.toolsControlUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statsDayKey: props.statsDayKey,
        command: { kind: 'assign-task', taskId },
      }),
    })
    const j = await r.json()
    if (j.success) {
      emit('taskAssigned', taskId)
    }
  } catch (error) {
    console.error('Failed to assign task:', error)
  }
}

onMounted(() => {
  void loadTasks()
})
</script>

<template>
  <PomodoroTaskSelectDropdown
    :tasks="tasks"
    :selected-task-id="currentTaskId"
    :loading="loading"
    @select="assignTask"
  />
</template>
