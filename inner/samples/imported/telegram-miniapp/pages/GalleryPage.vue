<template>
  <div class="miniapp-container">
    <h1 class="miniapp-title">MiniApp для Телеграм</h1>
  </div>
</template>

<script setup>
// Стартовая страница Telegram Mini App
</script>

<style scoped>
.miniapp-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.miniapp-title {
  font-size: 48px;
  font-weight: 700;
  color: white;
  text-align: center;
  margin: 0;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

@media (max-width: 480px) {
  .miniapp-title {
    font-size: 32px;
  }
}
</style>
