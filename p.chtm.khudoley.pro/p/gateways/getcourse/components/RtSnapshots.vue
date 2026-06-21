<script setup lang="ts">
import {
  requestHeadersJson,
  requestBodyJson,
  upstreamSnapshotJson,
  gatewaySnapshotJson
} from '../shared/requestTestForm'
import type { RequestSnapshot, ResponseSnapshot } from '../shared/requestTestForm'

defineProps<{
  requestSnapshot: RequestSnapshot | null
  responseSnapshot: ResponseSnapshot | null
  // Заголовок блока ответа вышестоящего сервиса (зависит от гейтвея).
  upstreamLabel: string
}>()
</script>

<template>
  <div v-if="requestSnapshot" class="rt-snap">
    <div class="rt-snap-hd">Заголовки запроса</div>
    <pre class="rt-pre custom-scrollbar">{{ requestHeadersJson(requestSnapshot) }}</pre>
  </div>

  <div v-if="requestSnapshot" class="rt-snap">
    <div class="rt-snap-hd">Тело запроса</div>
    <pre class="rt-pre custom-scrollbar">{{ requestBodyJson(requestSnapshot) }}</pre>
  </div>

  <div v-if="responseSnapshot" class="rt-snap">
    <div class="rt-snap-hd">{{ upstreamLabel }}</div>
    <pre class="rt-pre custom-scrollbar">{{ upstreamSnapshotJson(responseSnapshot) }}</pre>
  </div>

  <div v-if="responseSnapshot" class="rt-snap">
    <div class="rt-snap-hd">Ответ гейтвея</div>
    <pre class="rt-pre custom-scrollbar">{{ gatewaySnapshotJson(responseSnapshot) }}</pre>
  </div>
</template>
