<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from './Messages.vue'

const props = defineProps<{
  message: Message
  onClick?: (event: MouseEvent) => void
}>()

const file = computed(() => {
  return props.message.files?.length ? props.message.files[0] : null
})

const filePreview = computed(() => file.value?.thumbnail_url_400)
</script>

<template>
  <div
    class="ReplyMessage"
    :class="{ ReplyMessageClickable: !!onClick }"
    @click="onClick && onClick($event)"
  >
    <div v-if="file" class="ReplyMessageLeft">
      <div
        class="ReplyMessagePhoto"
        :style="filePreview ? `background-image: url(${filePreview})` : ''"
      ></div>
    </div>

    <div class="ReplyMessageRight">
      <div class="ReplyMessageAuthor">{{ message.author?.name || 'Гость' }}</div>
      <div class="ReplyMessageText">
        {{ message.text.length > 60 ? message.text.slice(0, 60) + '...' : message.text }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.ReplyMessage {
  box-sizing: border-box;
  display: flex;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  font-size: 12px;
  color: var(--wr-reply-text);
  border-left: 2px solid #f8005b;
  padding: 3px 8px;
  align-items: center;
  background: var(--wr-reply-bg);
  border-radius: 0 8px 8px 0;
  font-family: var(--chat-font-family);
  transition: background-color 0.15s ease;
}

.ReplyMessageClickable {
  cursor: pointer;
}

.ReplyMessageClickable:hover {
  background: var(--wr-reply-hover-bg);
}

.ReplyMessageLeft {
  flex-shrink: 0;
}

.ReplyMessageRight {
  flex-grow: 2;
  overflow: hidden;
}

.ReplyMessageAuthor {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #f8005b;
  font-size: 11px;
}

.ReplyMessageText {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--wr-reply-text);
  font-size: 12px;
  text-wrap: auto;
}

.ReplyMessagePhoto {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background-size: cover;
  background-position: 50% 50%;
  background-color: var(--wr-btn-subtle-bg);
}
</style>
