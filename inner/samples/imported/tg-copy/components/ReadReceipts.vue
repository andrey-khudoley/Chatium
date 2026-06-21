<template>
  <div class="read-receipts">
    <!-- Одиночная галочка - сообщение отправлено -->
    <i v-if="status === 'sent'" class="fas fa-check message-status"></i>
    <!-- Двойная галочка - сообщение доставлено -->
    <i v-else-if="status === 'delivered'" class="fas fa-check-double message-status"></i>
    <!-- Двойная синяя галочка - сообщение прочитано -->
    <i v-else-if="status === 'read'" class="fas fa-check-double message-status read"></i>
  </div>
</template>

<script setup>
const props = defineProps({
  status: {
    type: String,
    default: 'sent', // 'sent', 'delivered', 'read'
  },
})
</script>

<style scoped>
.read-receipts {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
}

.message-status {
  font-size: 12px;
  color: #8696a0;
}

.message-status.read {
  color: #53bdeb;
}
</style>